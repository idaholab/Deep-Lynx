use connection_string::AdoNetString;
use datafusion::prelude::{CsvReadOptions, SessionConfig, SessionContext};
use std::sync::Arc;
use url::Url;

use super::azure_object_store::register_azure_store;
use super::errors::Timeseries2Error;
use super::file_metadata::extract_table_info;
use super::file_metadata::FileMetadata;
use super::file_metadata::FileType;

pub async fn populate_session(
  storage_connection: &AdoNetString,
  files: Vec<FileMetadata>,
) -> Result<SessionContext, Timeseries2Error> {
  let ctx = SessionContext::new_with_config(SessionConfig::new().with_information_schema(true));

  let provider = storage_connection.get("provider").ok_or_else(|| {
    Timeseries2Error::ReceivedNullDataInRequest {
      msg: "Provider not set in connection string".to_string(),
    }
  })?;
  let root_endpoint = match provider.as_str() {
    "azure" => storage_connection.get("blobendpoint").ok_or_else(|| {
      Timeseries2Error::ReceivedNullDataInRequest {
        msg: "blobEndpoint not set in connection string with provider: azure".to_string(),
      }
    })?,
    "filesystem" => storage_connection.get("rootfilepath").ok_or_else(|| {
      Timeseries2Error::ReceivedNullDataInRequest {
        msg: "rootFilePath not set in connection string with provider: filesystem".to_string(),
      }
    })?,
    _ => {
      return Err(Timeseries2Error::BadData(format!(
        "couldn't set base/root endpoint. {provider} is not supported as a storage provider"
      )))
    }
  };

  match provider.as_str() {
    "azure" => {
      let object_store_url = Url::parse(root_endpoint.as_str())?;
      let azure_store = register_azure_store(storage_connection)?;
      ctx.register_object_store(&object_store_url, Arc::new(azure_store));
    }
    "filesystem" => (),
    _ => {
      return Err(Timeseries2Error::BadData(format!(
        "Failed to register object store. {provider} is not supported as a storage provider"
      )))
    }
  }
  let table_info = extract_table_info(files)?;

  for table in &table_info {
    let path = format!("{}/{}", root_endpoint, table.file_path);
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
