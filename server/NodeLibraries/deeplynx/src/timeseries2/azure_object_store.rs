use connection_string::AdoNetString;
use object_store::azure::MicrosoftAzure;
use object_store::azure::MicrosoftAzureBuilder;

use super::errors::Timeseries2Error;

pub fn register_azure_store(
  storage_connection: &AdoNetString,
) -> Result<MicrosoftAzure, Timeseries2Error> {
  #[cfg(debug_assertions)]
  return Ok(
    MicrosoftAzureBuilder::new()
      .with_endpoint(
        storage_connection
          .get("blobendpoint")
          .ok_or_else(|| Timeseries2Error::ReceivedNullDataInRequest {
            msg: "Azure Blob Endpoint is not set in connection string".to_string(),
          })?
          .to_owned(),
      )
      .with_account(storage_connection.get("accountname").ok_or_else(|| {
        Timeseries2Error::ReceivedNullDataInRequest {
          msg: "Azure Account Name is not set in connection string".to_string(),
        }
      })?)
      .with_access_key(storage_connection.get("accountkey").ok_or_else(|| {
        Timeseries2Error::ReceivedNullDataInRequest {
          msg: "Azure Account Access Key is not set in connection string".to_string(),
        }
      })?)
      .with_container_name(storage_connection.get("containername").ok_or_else(|| {
        Timeseries2Error::ReceivedNullDataInRequest {
          msg: "Azure Container Name is not set in connection string".to_string(),
        }
      })?)
      .with_allow_http(true) // only on dev builds
      .with_use_emulator(true)
      .build()?,
  );

  #[cfg(not(debug_assertions))]
  Ok(
    MicrosoftAzureBuilder::new()
      .with_endpoint(
        storage_connection
          .get("blobendpoint")
          .ok_or_else(|| Timeseries2Error::ReceivedNullDataInRequest {
            msg: "Azure Blob Endpoint is not set in connection string".to_string(),
          })?
          .to_owned(),
      )
      .with_account(storage_connection.get("accountname").ok_or_else(|| {
        Timeseries2Error::ReceivedNullDataInRequest {
          msg: "Azure Account Name is not set in connection string".to_string(),
        }
      })?)
      .with_access_key(storage_connection.get("accountkey").ok_or_else(|| {
        Timeseries2Error::ReceivedNullDataInRequest {
          msg: "Azure Account Access Key is not set in connection string".to_string(),
        }
      })?)
      .with_container_name(storage_connection.get("containername").ok_or_else(|| {
        Timeseries2Error::ReceivedNullDataInRequest {
          msg: "Azure Container Name is not set in connection string".to_string(),
        }
      })?)
      .with_use_emulator(true)
      .build()?,
  )
}
