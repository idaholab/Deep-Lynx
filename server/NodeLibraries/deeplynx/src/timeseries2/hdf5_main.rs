// NOTE: this file should be lower priority
#![allow(dead_code, unused_variables, unused_assignments, unused_imports)]
mod api;
mod error;
// mod logger;
mod hdf5;
mod request;
mod response;
mod session;
mod temp_file;
mod types;
// mod cli;
// use crate::hdf5;
//
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

use crate::hdf5::search_values;
use crate::hdf5::CustomDataSource;
use crate::session::Session;
use crate::types::StoreType;
use async_trait::async_trait;
use log::trace;
use tokio::time::timeout;

// use crate::session::Session;

// / This example demonstrates executing a simple query against a custom datasource
#[tokio::main]
async fn main() -> Result<()> {
    // let mut ctx = SessionContext::new();
    //
    // let custom_table_provider = CustomDataSource::new();
    // custom_table_provider.populate_records();
    // let x = match ctx.register_table("custom_table", Arc::new(custom_table_provider))
    // {
    //     None => {
    //         println!("no register");
    //     }
    //     Some(_) => {
    //         println!("yes register");
    //
    //     }
    // };
    let mut session = Session::new(StoreType::filesystem).unwrap();
    let x = session
        .register_table("default_table", "/users/conlta/dir/test1.h5")
        .await
        .expect("could not register table");
    // session
    //     .register_table("default_table", "/users/conlta/dir/test1.h5")
    //     .await.unwrap();

    let query = "SELECT * from default_table where value > 500";

    // run the actual query and get a DataFrame object
    let df = session.query(query).await.unwrap();

    df.show().await?;
    // println!("{:?}",df);

    // let mut session = Session { session_context: Default::default(), table_names: vec![] };

    // // create our custom datasource and adding some users
    // let db = CustomDataSource::default();
    // db.populate_records();
    //
    // search_values(db.clone(), None, 3).await?;
    // search_values(db.clone(), Some(col("value").gt(lit(8000u64))), 1).await?;
    // search_values(db.clone(), Some(col("value").gt(lit(200u64))), 2).await?;

    Ok(())
}
