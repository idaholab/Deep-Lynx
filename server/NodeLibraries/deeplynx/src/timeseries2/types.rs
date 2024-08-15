use crate::timeseries2::error::TSError;
use datafusion::datasource::listing::ListingTableInsertMode;
use datafusion::datasource::listing::ListingTableUrl;
use datafusion::prelude::{
  CsvReadOptions, DataFrame, ParquetReadOptions, SessionConfig, SessionContext,
};
use lazy_static::lazy_static;
use log::{info, trace};
use object_store::azure::MicrosoftAzureBuilder;
use rand::{
  distributions::{Distribution, Standard},
  Rng,
};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use url::Url;

#[napi(object)]
#[derive(Serialize, Deserialize, Debug)]
pub struct Request {
  pub report_id: String,
  pub query_id: String,
  pub query: String,
  pub deeplynx_response_url: String,
  pub upload_path: String,
  pub files: Vec<FilePathMetadata>,
  pub token: String,
  pub data_source_id: String,
  pub azure_metadata: Option<AzureMetadata>,
  pub to_json: Option<bool>, // change to mimetype or format or something?
}

impl Request {
  pub fn new() -> Self {
    Self {
      ..Default::default()
    }
  }
}

impl Default for Request {
  fn default() -> Self {
    Request::new()
  }
}

pub struct Session {
  pub(crate) session_context: SessionContext,
  // the idea is to store the table_names to verify SZL etc.
  // but I'm not sure if it is needed
  pub(crate) table_names: Vec<String>,
}

impl Session {
  pub fn new(store_type: StoreType) -> Result<Session, TSError> {
    let session_context = store_type.get_session_context()?;

    println!("{:?}", session_context.catalog_names());
    let table_names = Vec::new();
    Ok(Session {
      session_context,
      table_names,
    })
  }

  pub async fn register_table(
    &mut self,
    table_name: &str,
    file_path: &str,
  ) -> Result<&Self, TSError> {
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

#[napi]
#[derive(Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Debug, Default)]
pub enum StoreType {
  Minio,
  AzureBlob,
  FileSystem,
  #[default]
  Void,
}

impl Distribution<StoreType> for Standard {
  fn sample<R: Rng + ?Sized>(&self, rng: &mut R) -> StoreType {
    match rng.gen_range(0..3) {
      0 => StoreType::Minio,
      1 => StoreType::AzureBlob,
      2 => StoreType::FileSystem,
      _ => StoreType::Void,
    }
  }
}
impl StoreType {
  pub fn get_session_context(&self) -> Result<SessionContext, TSError> {
    let session_config = SessionConfig::new().with_information_schema(true);
    let ctx = SessionContext::new_with_config(session_config);
    match self {
      StoreType::FileSystem => {
        // using local files does not need a registered store
      }
      // possible sample code is included here but note this function
      // returns Unimplemented
      StoreType::AzureBlob => {
        let table_path =
          ListingTableUrl::parse("https://gvadedeeplynxdevsa.blob.core.usgovcloudapi.net/")?;
        // let scheme = table_path.scheme();
        let url: &Url = table_path.as_ref();
        let microsoft_azure = MicrosoftAzureBuilder::new()
          .with_account("gvadedeeplynxdevsa")
          .with_access_key("")
          .with_container_name("deeplynx")
          .with_endpoint("https://gvadedeeplynxdevsa.blob.core.usgovcloudapi.net".to_string())
          .build()?;

        let store = Arc::new(microsoft_azure);
        ctx.runtime_env().register_object_store(url, store.clone());
        return Err(TSError::Unimplemented("Azure File Storage".to_string()));
      }
      StoreType::Minio => {
        return Err(TSError::Unimplemented("AWS S3 File Storage".to_string()));
      }
      StoreType::Void => {
        return Err(TSError::Unimplemented(
          "Default (Empty) Storage".to_string(),
        ));
      }
    }
    Ok(ctx)
  }
}

#[derive(Serialize, Deserialize, Copy, Clone, Debug, Default)]
pub enum FileType {
  #[default]
  Csv,
  Parquet,
  Json,
  Hdf5, // unimplemented
  Tdms, // unimplemented
}

impl FileType {
  pub(crate) fn from_string(file: &str) -> FileType {
    let file = file.to_lowercase();
    if file.ends_with(".csv") {
      FileType::Csv
    } else if file.ends_with(".parquet") {
      FileType::Parquet
    } else if file.ends_with(".json") {
      FileType::Json
    } else if file.ends_with(".h5") || file.ends_with(".hdf5") {
      FileType::Hdf5
    } else {
      FileType::default()
    }
  }
}

#[napi(object)]
#[derive(Serialize, Deserialize, Debug, Default)]
pub struct FilePathMetadata {
  pub id: String,
  pub adapter_file_path: String,
  pub adapter: StoreType,
}

impl FilePathMetadata {
  /// SQL table names must start with a letter
  /// and contain only ascii alphanumeric and '_"
  fn is_valid_table_name(name: &str) -> bool {
    lazy_static! {
      static ref RE: Regex = regex::Regex::new(r"[a-zA-Z_][a-zA-Z_0-9]*")
        .expect("valid_table_name static regex doesn't compile");
    }
    RE.is_match(name)
  }

  /// Use the id to create a table name suitable
  /// for most common SQL syntax-es
  pub fn get_table_name(&self) -> Result<String, TSError> {
    let name = format!("table_{}", self.id);
    if Self::is_valid_table_name(name.as_str()) {
      Ok(name)
    } else {
      Err(TSError::Error(format!(
        "Invalid table name from id: {}",
        self.id
      )))
    }
  }

  /// retrieve the file from the file store for local processing
  /// but only if it is "largeobject" aka DeepLynx storage
  pub async fn retrieve_file(&self) -> Result<String, TSError> {
    match self.adapter {
      StoreType::FileSystem => {
        // for local file system just return the file path
        Ok(self.adapter_file_path.clone())
      }
      StoreType::Minio => {
        // todo
        Err(TSError::Unimplemented(format!(
          "minio retrieve file {:?}",
          self.adapter_file_path
        )))
      }
      StoreType::AzureBlob => {
        // todo
        Err(TSError::Unimplemented(format!(
          "azure_blob retrieve file {:?}",
          self.adapter_file_path
        )))
      }
      StoreType::Void => Err(TSError::Unimplemented(
        "Uninitialized default store type".to_string(),
      )),
    }
  }
}

#[napi(object)]
#[derive(Serialize, Deserialize, Debug, Default)]
pub struct AzureMetadata {
  pub account_name: String,
  pub blob_endpoint: String,
  pub container_name: String,
  pub sas_token: String,
}

// #[cfg(test)]
// mod filetype_tests {

//   #[test]
//   fn filetype_works() {
//     todo!()
//   }
// }
