// NOTE: this file should be lower priority
#![allow(dead_code, unused_variables, unused_assignments, unused_imports)]
// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

// https://arrow.apache.org/datafusion/library-user-guide/custom-table-providers.html

use std::any::Any;
use std::collections::{
    BTreeMap,
    HashMap,
};
use std::fmt::{
    self,
    Debug,
    Formatter,
};
use std::sync::{
    Arc,
    Mutex,
};
use std::time::Duration;

use datafusion::arrow::array::{
    UInt32Builder,
    UInt64Builder,
    UInt8Builder,
};
use datafusion::arrow::datatypes::{
    DataType,
    Field,
    Schema,
    SchemaRef,
};
use datafusion::arrow::record_batch::RecordBatch;
use datafusion::common::{
    ColumnStatistics,
    Statistics,
};
use datafusion::dataframe::DataFrame;
use datafusion::datasource::{
    provider_as_source,
    TableProvider,
    TableType,
};
use datafusion::error::Result;
use datafusion::execution::context::{
    SessionState,
    TaskContext,
};
use datafusion::logical_expr::LogicalPlanBuilder;
use datafusion::physical_plan::expressions::PhysicalSortExpr;
use datafusion::physical_plan::memory::MemoryStream;
use datafusion::physical_plan::{
    project_schema,
    DisplayAs,
    DisplayFormatType,
    ExecutionPlan,
    SendableRecordBatchStream,
};
use datafusion::prelude::Expr::Column;
use datafusion::prelude::*;
// use datafusion_expr::{Expr, LogicalPlanBuilder};
// use datafusion_expr::{Expr, LogicalPlanBuilder};

use crate::session::Session;
use crate::types::StoreType;
use async_trait::async_trait;
use log::trace;
use rand::Rng;
use tokio::time::timeout;
// use crate::session::Session;

pub async fn search_values(
    db: CustomDataSource,
    filter: Option<Expr>,
    expected_result_length: usize,
) -> Result<()> {
    // create local execution context
    let ctx = SessionContext::new();

    // create logical plan composed of a single TableScan
    let logical_plan = LogicalPlanBuilder::scan_with_filters(
        "default_table",
        provider_as_source(Arc::new(db)),
        None,
        vec![],
    )?
    .build()?;

    let mut dataframe =
        DataFrame::new(ctx.state(), logical_plan).select_columns(&["id", "value"])?;

    if let Some(f) = filter {
        dataframe = dataframe.filter(f)?;
    }

    // timeout(Duration::from_secs(10), async move {
    //     let result = dataframe.collect().await.unwrap();
    //     let record_batch = result.first().unwrap();
    //
    //     assert_eq!(expected_result_length, record_batch.column(1).len());
    //     dbg!(record_batch.columns());
    // })
    //     .await
    //     .unwrap();

    Ok(())
}

#[derive(Clone, Debug)]
struct Record {
    id: u32,
    value: u64,
}

/// A custom datasource, used to represent a datastore with a single index
#[derive(Clone)]
pub struct CustomDataSource {
    inner: Arc<Mutex<CustomDataSourceInner>>,
}

struct CustomDataSourceInner {
    data: HashMap<u64, Record>,
    value_index: BTreeMap<u64, u32>,
}

impl Debug for CustomDataSource {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str("custom_db")
    }
}

impl CustomDataSource {
    pub fn new() -> Self {
        CustomDataSource {
            inner: Arc::new(Mutex::new(CustomDataSourceInner {
                data: Default::default(),
                value_index: Default::default(),
            })),
        }
    }
    pub(crate) async fn create_physical_plan(
        &self,
        projections: Option<&Vec<usize>>,
        schema: SchemaRef,
    ) -> Result<Arc<dyn ExecutionPlan>> {
        Ok(Arc::new(CustomExec::new(projections, schema, self.clone())))
    }

    pub fn populate_records(&self) {
        let mut rng = rand::thread_rng();
        for r in 0..1000 {
            self.add_record(Record {
                id: r,
                value: rng.gen(),
            })
        }
    }

    fn add_record(&self, record: Record) {
        let mut inner = self.inner.lock().unwrap();
        inner.value_index.insert(record.value, record.id);
        inner.data.insert(record.id as u64, record);
    }
}

impl Default for CustomDataSource {
    fn default() -> Self {
        CustomDataSource {
            inner: Arc::new(Mutex::new(CustomDataSourceInner {
                data: Default::default(),
                value_index: Default::default(),
            })),
        }
    }
}

#[async_trait]
impl TableProvider for CustomDataSource {
    fn as_any(&self) -> &dyn Any {
        self
    }

    fn schema(&self) -> SchemaRef {
        SchemaRef::new(Schema::new(vec![
            Field::new("id", DataType::UInt8, false),
            Field::new("value", DataType::UInt64, true),
        ]))
    }

    fn table_type(&self) -> TableType {
        TableType::Base
    }

    async fn scan(
        &self,
        _state: &SessionState,
        projection: Option<&Vec<usize>>,
        // filters and limit can be used here to inject some push-down operations if needed
        _filters: &[Expr],
        _limit: Option<usize>,
    ) -> Result<Arc<dyn ExecutionPlan>> {
        return self.create_physical_plan(projection, self.schema()).await;
    }
}

#[derive(Debug, Clone)]
struct CustomExec {
    db: CustomDataSource,
    projected_schema: SchemaRef,
}

impl CustomExec {
    fn new(projections: Option<&Vec<usize>>, schema: SchemaRef, db: CustomDataSource) -> Self {
        let projected_schema = project_schema(&schema, projections).unwrap();
        Self {
            db,
            projected_schema,
        }
    }
}

impl DisplayAs for CustomExec {
    fn fmt_as(&self, _t: DisplayFormatType, f: &mut fmt::Formatter) -> std::fmt::Result {
        write!(f, "CustomExec")
    }
}

impl ExecutionPlan for CustomExec {
    fn as_any(&self) -> &dyn Any {
        self
    }

    fn schema(&self) -> SchemaRef {
        self.projected_schema.clone()
    }

    fn output_partitioning(&self) -> datafusion::physical_plan::Partitioning {
        datafusion::physical_plan::Partitioning::UnknownPartitioning(1)
    }

    fn output_ordering(&self) -> Option<&[PhysicalSortExpr]> {
        None
    }

    fn children(&self) -> Vec<Arc<dyn ExecutionPlan>> {
        vec![]
    }

    fn with_new_children(
        self: Arc<Self>,
        _: Vec<Arc<dyn ExecutionPlan>>,
    ) -> Result<Arc<dyn ExecutionPlan>> {
        Ok(self)
    }

    fn execute(
        &self,
        _partition: usize,
        _context: Arc<TaskContext>,
    ) -> Result<SendableRecordBatchStream> {
        let records: Vec<Record> = {
            let db = self.db.inner.lock().unwrap();
            db.data.values().cloned().collect()
        };

        let mut id_array = UInt32Builder::with_capacity(records.len());
        let mut account_array = UInt64Builder::with_capacity(records.len());

        for record in records {
            id_array.append_value(record.id);
            account_array.append_value(record.value);
        }

        Ok(Box::pin(MemoryStream::try_new(
            vec![RecordBatch::try_new(
                self.projected_schema.clone(),
                vec![
                    Arc::new(id_array.finish()),
                    Arc::new(account_array.finish()),
                ],
            )?],
            self.schema(),
            None,
        )?))
    }

    fn statistics(&self) -> Statistics {
        Statistics {
            num_rows: None,
            total_byte_size: None,
            column_statistics: Some(vec![ColumnStatistics {
                null_count: None,
                max_value: None,
                min_value: None,
                distinct_count: None,
            }]),
            is_exact: false,
        }
    }
}
