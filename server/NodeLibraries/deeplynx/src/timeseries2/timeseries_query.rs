use datafusion::prelude::{CsvReadOptions, SessionConfig, SessionContext};
use std::env;
use std::fmt;
use std::sync::Arc;
use url::Url;

use super::azure_metadata;
use super::azure_metadata::get_azure_store;
use super::errors::Timeseries2Error;
use super::file_path_metadata;
use super::file_path_metadata::extract_table_info;
use super::file_path_metadata::FileType;

#[napi]
#[derive(Debug, Default, Clone)]
pub struct TimeseriesQuery {
  #[napi(js_name = "report_id")]
  pub report_id: String,
  pub query: Option<String>,
  #[napi(js_name = "storage_type")]
  pub storage_type: StorageType,
  #[napi(js_name = "sas_metadata")]
  pub sas_metadata: Option<azure_metadata::AzureMetadata>,
  pub files: Vec<file_path_metadata::FilePathMetadata>,
}

#[napi(string_enum)]
#[derive(Debug, Default)]
pub enum StorageType {
  #[allow(non_camel_case_types)]
  azure,
  #[allow(non_camel_case_types)]
  #[default]
  filesystem,
}

impl fmt::Display for StorageType {
  fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
    write!(f, "{:?}", self)
  }
}

pub async fn setup(req: &TimeseriesQuery) -> Result<SessionContext, Timeseries2Error> {
  let ctx = SessionContext::new_with_config(SessionConfig::new().with_information_schema(true));

  let local_storage = get_local_storage_path()?;

  let sas_metadata = req.sas_metadata.as_ref();
  let sas_token = match sas_metadata {
    Some(md) => md.sas_token.as_ref(),
    None => None,
  };

  let files_location = match sas_metadata {
    Some(md) => {
      md.blob_endpoint
        .as_ref()
        .ok_or_else(|| Timeseries2Error::ReceivedNullDataInRequest {
          msg: "Received Azure Metedata, but Azure Blob Endpoint is None".to_string(),
        })?
    }
    None => &local_storage,
  };

  match req.storage_type {
    StorageType::azure => {
      let object_store_url = Url::parse(files_location.as_str())?;
      let azure_store = get_azure_store(sas_metadata)?;
      ctx.register_object_store(&object_store_url, Arc::new(azure_store));
    }
    StorageType::filesystem => (),
  }
  let table_info = extract_table_info(&req.files)?;

  for table in &table_info {
    let path = match sas_token {
      Some(t) => format!("{}/{}?{}", files_location, table.adapter_file_path, t),
      None => format!("{}/{}", files_location, table.adapter_file_path),
    };
    match table.file_type {
      FileType::Csv => {
        ctx
          .register_csv(
            table.name.as_str(),
            path.as_str(),
            CsvReadOptions::default(),
          )
          .await?;
      }
      // FileType::Parquet => {
      //   todo!("haven't gotten to Parquet files yet.")
      // }
      FileType::Json => {
        ctx
          .register_json(table.name.as_str(), path.as_str(), Default::default())
          .await?;
      }
    }
  }

  Ok(ctx)
}

pub fn get_local_storage_path() -> Result<String, Timeseries2Error> {
  // this code currently lives 2 levels deeper than the .env file
  let default_filesystem_storage_directory = "./../../../storage/".to_string();
  if dotenvy::dotenv().is_ok() {
    if let Ok(fs_storage_dir) = env::var("FILESYSTEM_STORAGE_DIRECTORY") {
      Ok(format!("./../.{fs_storage_dir}"))
    } else {
      Ok(default_filesystem_storage_directory)
    }
  } else {
    Ok(default_filesystem_storage_directory)
  }
}
