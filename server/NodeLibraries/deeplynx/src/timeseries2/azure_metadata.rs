use object_store::azure::MicrosoftAzure;
use object_store::azure::MicrosoftAzureBuilder;
use url::Url;

use super::errors::Timeseries2Error;

#[napi(object)]
#[derive(Debug, Default, Clone)]
pub struct AzureMetadata {
  #[napi(js_name = "account_name")]
  pub account_name: Option<String>,
  #[napi(js_name = "blob_endpoint")]
  pub blob_endpoint: Option<String>,
  #[napi(js_name = "container_name")]
  pub container_name: Option<String>,
  #[napi(js_name = "sas_token")]
  pub sas_token: Option<String>,
}

pub fn token_to_query_pairs(token: String) -> Result<Vec<(String, String)>, Timeseries2Error> {
  let tmp_query_base_url = "data:";
  let tmp_query_full_url = format!("{}?{}", tmp_query_base_url, token);
  let tmp_parsed_query_url = Url::parse(&tmp_query_full_url)?;
  let sas_token_query_pairs = tmp_parsed_query_url.query_pairs().into_owned();

  let mut converted_query_pairs = Vec::new();
  for pair in sas_token_query_pairs {
    converted_query_pairs.push(pair)
  }
  Ok(converted_query_pairs)
}

pub fn get_azure_store(
  az_metadata: Option<&AzureMetadata>,
) -> Result<MicrosoftAzure, Timeseries2Error> {
  let sas_metadata = az_metadata.ok_or_else(|| Timeseries2Error::ReceivedNullDataInRequest {
    msg: "Adapter type set to `azure` but Azure Metadata is a None value".to_string(),
  })?;
  let blob_endpoint = sas_metadata.blob_endpoint.as_ref().ok_or_else(|| {
    Timeseries2Error::ReceivedNullDataInRequest {
      msg: "Azure Blob Endpoint is None".to_string(),
    }
  })?;
  let sas_token =
    sas_metadata
      .sas_token
      .as_ref()
      .ok_or_else(|| Timeseries2Error::ReceivedNullDataInRequest {
        msg: "Azure SAS Token is None".to_string(),
      })?;
  let sas_token_query_pairs = token_to_query_pairs(sas_token.clone())?;

  #[cfg(debug_assertions)]
  return Ok(
    MicrosoftAzureBuilder::new()
      .with_endpoint(blob_endpoint.to_owned())
      .with_account(sas_metadata.account_name.as_ref().ok_or_else(|| {
        Timeseries2Error::ReceivedNullDataInRequest {
          msg: "Azure Account Name is None".to_string(),
        }
      })?)
      .with_container_name(sas_metadata.container_name.as_ref().ok_or_else(|| {
        Timeseries2Error::ReceivedNullDataInRequest {
          msg: "Azure Container Name is None".to_string(),
        }
      })?)
      .with_sas_authorization(sas_token_query_pairs)
      .with_allow_http(true) // only on dev builds
      .with_use_emulator(true)
      .build()?,
  );

  #[cfg(not(debug_assertions))]
  Ok(
    MicrosoftAzureBuilder::new()
      .with_endpoint(blob_endpoint.to_owned())
      .with_account(sas_metadata.account_name.as_ref().ok_or_else(|| {
        Timeseries2Error::ReceivedNullDataInRequest {
          msg: "Azure Account Name is None".to_string(),
        }
      })?)
      .with_container_name(sas_metadata.container_name.as_ref().ok_or_else(|| {
        Timeseries2Error::ReceivedNullDataInRequest {
          msg: "Azure Container Name is None".to_string(),
        }
      })?)
      .with_sas_authorization(sas_token_query_pairs)
      .with_use_emulator(true)
      .build()?,
  )
}
