use crate::timeseries2::error::Result;
use crate::timeseries2::types::{FileType, StoreType};
use datafusion::datasource::listing::ListingTableInsertMode;
use datafusion::prelude::{CsvReadOptions, DataFrame, ParquetReadOptions, SessionContext};
use log::{info, trace};
use std::time::Instant;

pub struct Session {
  pub(crate) session_context: SessionContext,
  // the idea is to store the table_names to verify SZL etc.
  // but I'm not sure if it is needed
  pub(crate) table_names: Vec<String>,
}

impl Session {
  pub fn new(store_type: StoreType) -> Result<Session> {
    let session_context = store_type.get_session_context()?;

    println!("{:?}", session_context.catalog_names());
    let table_names = Vec::new();
    Ok(Session {
      session_context,
      table_names,
    })
  }

  pub async fn register_table(&mut self, table_name: &str, file_path: &str) -> Result<&Self> {
    let file_type = FileType::from_string(file_path);
    trace!("registering file: {}", file_path);
    match file_type {
      FileType::Csv => {
        self
          .session_context
          .register_csv(table_name, file_path, CsvReadOptions::new())
          .await?;
      }
      FileType::Parquet => {
        let parquet_read_options = ParquetReadOptions {
          file_extension: ".parquet",
          table_partition_cols: vec![],
          parquet_pruning: None,
          skip_metadata: None,
          schema: None,
          file_sort_order: vec![],
          insert_mode: ListingTableInsertMode::AppendToFile,
        };
        self
          .session_context
          .register_parquet(table_name, file_path, parquet_read_options)
          .await?;
      }
      FileType::Json => {
        // todo register json file
        self
          .session_context
          .register_json(table_name, file_path, Default::default())
          .await?;
        info!("Registered : ({})", table_name);
      }

      FileType::Hdf5 => {
        unimplemented!()
      }
      FileType::Tdms => {
        unimplemented!()
      }
    }
    self.table_names.push(table_name.to_owned());
    Ok(self)
  }

  pub async fn query(&self, sql: &str) -> datafusion::common::Result<DataFrame> {
    let start = Instant::now();
    let ret = self.session_context.sql(sql).await;
    let duration = start.elapsed();
    info!("Time of query is: {:?}", duration);
    ret
  }
}

// TODO: these tests require mocking endoints
// #[cfg(test)]
// mod tests {

//   #[test]
//   fn register_table_fn_works() {
//     todo!()
//   }

//   #[test]
//   fn query_fn_works() {
//     todo!()
//   }
// }
