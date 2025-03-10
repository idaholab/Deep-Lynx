use azure_storage::{prelude::*, CloudLocation};
use azure_storage_blobs::prelude::*;
use connection_string::AdoNetString;
use object_store::azure::MicrosoftAzure;
use object_store::azure::MicrosoftAzureBuilder;

use crate::timeseries::errors::QueryError;

pub fn register_azure_store(
  storage_connection: &AdoNetString,
) -> Result<MicrosoftAzure, QueryError> {
  #[cfg(debug_assertions)]
  return Ok(
    MicrosoftAzureBuilder::new()
      .with_endpoint(
        storage_connection
          .get("blobendpoint")
          .ok_or_else(|| QueryError::ReceivedNullDataInRequest {
            msg: "Azure Blob Endpoint is not set in connection string".to_string(),
          })?
          .to_owned(),
      )
      .with_account(storage_connection.get("accountname").ok_or_else(|| {
        QueryError::ReceivedNullDataInRequest {
          msg: "Azure Account Name is not set in connection string".to_string(),
        }
      })?)
      .with_access_key(storage_connection.get("accountkey").ok_or_else(|| {
        QueryError::ReceivedNullDataInRequest {
          msg: "Azure Account Access Key is not set in connection string".to_string(),
        }
      })?)
      .with_container_name(storage_connection.get("containername").ok_or_else(|| {
        QueryError::ReceivedNullDataInRequest {
          msg: "Azure Container Name is not set in connection string".to_string(),
        }
      })?)
      .with_allow_http(true) // only on dev builds
      .with_use_emulator(true) // only on dev builds
      .build()?,
  );

  #[cfg(not(debug_assertions))]
  Ok(
    MicrosoftAzureBuilder::new()
      .with_endpoint(
        storage_connection
          .get("blobendpoint")
          .ok_or_else(|| QueryError::ReceivedNullDataInRequest {
            msg: "Azure Blob Endpoint is not set in connection string".to_string(),
          })?
          .to_owned(),
      )
      .with_account(storage_connection.get("accountname").ok_or_else(|| {
        QueryError::ReceivedNullDataInRequest {
          msg: "Azure Account Name is not set in connection string".to_string(),
        }
      })?)
      .with_access_key(storage_connection.get("accountkey").ok_or_else(|| {
        QueryError::ReceivedNullDataInRequest {
          msg: "Azure Account Access Key is not set in connection string".to_string(),
        }
      })?)
      .with_container_name(storage_connection.get("containername").ok_or_else(|| {
        QueryError::ReceivedNullDataInRequest {
          msg: "Azure Container Name is not set in connection string".to_string(),
        }
      })?)
      .build()?,
  )
}

pub async fn get_blob_size(
  storage_connection: &AdoNetString,
  upload_path: &String,
  file_name: &String,
) -> Result<u64, QueryError> {
  let account = storage_connection
    .get("accountname")
    .ok_or_else(|| QueryError::ReceivedNullDataInRequest {
      msg: "Azure Account Name is not set in connection string".to_string(),
    })?
    .to_owned();

  let access_key = storage_connection
    .get("accountkey")
    .ok_or_else(|| QueryError::ReceivedNullDataInRequest {
      msg: "Azure Account Access Key is not set in connection string".to_string(),
    })?
    .to_owned();
  let storage_credentials = StorageCredentials::access_key(account.clone(), access_key);

  let container = storage_connection
    .get("containername")
    .ok_or_else(|| QueryError::ReceivedNullDataInRequest {
      msg: "Azure Container Name is not set in connection string".to_string(),
    })?
    .to_owned();

  let uri = storage_connection
    .get("blobendpoint")
    .ok_or_else(|| QueryError::ReceivedNullDataInRequest {
      msg: "Azure Blob Endpoint is not set in connection string".to_string(),
    })?
    .to_owned();

  let cloud_location = match uri.contains(account.as_str()) {
    true => CloudLocation::Custom { account, uri },
    false => CloudLocation::Custom {
      account: account.clone(),
      uri: format!("{uri}/{account}"),
    },
  };

  let blob_client = ClientBuilder::with_location(cloud_location, storage_credentials)
    .blob_client(&container, format!("{upload_path}/{file_name}"));

  Ok(
    blob_client
      .get_properties()
      .await?
      .blob
      .properties
      .content_length,
  )
}
