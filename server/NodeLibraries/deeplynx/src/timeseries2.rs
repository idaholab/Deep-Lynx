use chrono::Utc;
use datafusion::dataframe::DataFrameWriteOptions;
use datafusion::prelude::{CsvReadOptions, SessionConfig, SessionContext};
use object_store::azure::MicrosoftAzureBuilder;
use reqwest::Body;
use serde_json::json;
use short_uuid::short;
use std::env;
use std::sync::Arc;
use tokio::fs::{remove_file, File};
use tokio_util::codec::{BytesCodec, FramedRead};
use url::Url;

pub mod azure_metadata;
pub mod file_path_metadata;
pub mod timeseries_query;
use file_path_metadata::FileType;
use timeseries_query::{StorageType, TimeseriesQuery};

// see url below for details
// https://lucid.app/lucidspark/b8c390a8-4b87-43a5-9d35-aae51350751f/edit?viewport_loc=-972%2C-151%2C4140%2C1831%2C0_0&invitationId=inv_b2784543-d5cc-4155-b5b3-ec9749ac1958
#[napi]
pub async fn process_query(req: &TimeseriesQuery) -> napi::Result<String> {
  let client = reqwest::Client::new();
  let session_config = SessionConfig::new().with_information_schema(true);
  let ctx = SessionContext::new_with_config(session_config);

  let sas_metadata = req
    .sas_metadata
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has null sas_metadata")))?;
  let blob_endpoint = sas_metadata.blob_endpoint.as_ref().ok_or_else(|| {
    napi::Error::from_reason(String::from("Azure blob endpoint cannot be None/Null."))
  })?;
  let sas_token = sas_metadata
    .sas_token
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null sas_token")))?;
  match req.storage_type {
    StorageType::azure => {
      let sas_token_query_pairs = azure_metadata::token_to_query_pairs(sas_token.clone())
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;
      let az_url: &Url =
        &Url::parse(blob_endpoint.as_str()).map_err(|e| napi::Error::from_reason(e.to_string()))?;

      #[cfg(debug_assertions)]
      let ms_azure = MicrosoftAzureBuilder::new()
        .with_endpoint(blob_endpoint.to_owned())
        .with_account(sas_metadata.account_name.as_ref().ok_or_else(|| {
          napi::Error::from_reason(String::from("Azure account name cannot be None/Null."))
        })?)
        .with_container_name(sas_metadata.container_name.as_ref().ok_or_else(|| {
          napi::Error::from_reason(String::from("Azure container name cannot be None/Null."))
        })?)
        .with_sas_authorization(sas_token_query_pairs)
        .with_allow_http(true) // only on dev builds
        .with_use_emulator(true)
        .build()
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

      #[cfg(not(debug_assertions))]
      let ms_azure = MicrosoftAzureBuilder::new()
        .with_endpoint(blob_endpoint.to_owned())
        .with_account(sas_metadata.account_name.as_ref().ok_or_else(|| {
          napi::Error::from_reason(String::from("Azure account name cannot be None/Null."))
        })?)
        .with_container_name(sas_metadata.container_name.as_ref().ok_or_else(|| {
          napi::Error::from_reason(String::from("Azure container name cannot be None/Null."))
        })?)
        .with_sas_authorization(sas_token_query_pairs)
        .with_use_emulator(true)
        .build()
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

      ctx.register_object_store(az_url, Arc::new(ms_azure));
    }
    StorageType::filesystem => {
      // todo: make this not an unwrap
      let url = Url::try_from("file://").unwrap();
      let object_store = object_store::local::LocalFileSystem::new();
      ctx.register_object_store(&url, Arc::new(object_store));
    }
  }
  let table_info = file_path_metadata::extract_table_info(&req.files)
    .map_err(|e| napi::Error::from_reason(e.to_string()))?;

  for table in &table_info {
    match table.file_type {
      FileType::Csv => {
        ctx
          .register_csv(
            table.name.as_str(),
            format!(
              "{}/{}?{}",
              blob_endpoint, table.adapter_file_path, sas_token
            )
            .as_str(),
            CsvReadOptions::default(),
          )
          .await
          .map_err(|e| napi::Error::from_reason(e.to_string()))?;
      }
      FileType::Json => {
        ctx
          .register_json(
            table.name.as_str(),
            format!(
              "{}/{}?{}",
              blob_endpoint, table.adapter_file_path, sas_token
            )
            .as_str(),
            Default::default(),
          )
          .await
          .map_err(|e| napi::Error::from_reason(e.to_string()))?;
      }
    }
  }
  let query = req
    .query
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null query")))?;
  if query.trim().to_uppercase().starts_with("DESCRIBE") {
    let query = format!("SELECT * FROM {}", table_info[0].name);
    let query_results = ctx
      .sql(query.as_str())
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    // execute and print results
    query_results
      .clone()
      .show()
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    // todo: convert dataframe to json value here
    let json_payload = json!({
      "isError": false,
      "message": "sending works!"
    });
    if let Ok(res) = client
      .post(&req.deeplynx_destination)
      .bearer_auth(&req.dl_token)
      .json(&json_payload)
      .send()
      .await
    {
      let dl_response = res
        .text()
        .await
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;
      Ok(format!(
        "report_id: {} dl_response: {}",
        req.report_id, dl_response
      ))
    } else {
      Err(napi::Error::from_reason(
        "Failed to send DESCRIBE data to DeepLynx client",
      ))
    }
  } else {
    let query_results = ctx
      .sql(query.as_str())
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let local_storage =
      env::var("FILESYSTEM_STORAGE_DIRECTORY").expect("FILESYSTEM_STORAGE_DIRECTORY must be set.");
    let now = Utc::now();
    let ext_extender = short!();
    let file_name = format!(
      "{}_{}.csv{}",
      req.report_id,
      now.timestamp_millis(),
      ext_extender
    );
    let file_path = format!("{}/{}", local_storage, file_name);
    query_results
      .write_csv(file_path.as_str(), DataFrameWriteOptions::new(), None)
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let res_file = File::open(&file_path).await?;
    let file_metadata = res_file
      .metadata()
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let result_metadata = json!({
      "report_id": req.report_id,
      "isError": false,
      "file_name": file_name,
      "file_size": file_metadata.len(),
      "file_path": req.results_destination,
      "adapter": req.storage_type.to_string(),
    });

    let dl_res = client
      .post(&req.deeplynx_destination)
      .bearer_auth(&req.dl_token)
      .json(&result_metadata)
      .send()
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let res_url = match req.storage_type {
      StorageType::azure => {
        format!("{}/{}?{}", req.results_destination, file_name, sas_token)
      }
      StorageType::filesystem => {
        format!("{}/{}", req.results_destination, file_name)
      }
    };

    // may need to add required headers if the sas token in the url isn't enough
    // may need to change to post for filesystem? idk
    let ms_res = client
      .put(res_url)
      .body(file_to_body(res_file))
      .send()
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    remove_file(&file_path).await?;

    let dl_res_str = dl_res
      .text()
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let ms_res_str = ms_res
      .text()
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    Ok(format!(
      "report_id: {} dl_response: {} ms_response: {}",
      req.report_id, dl_res_str, ms_res_str
    ))
  }
}

fn file_to_body(file: File) -> Body {
  let stream = FramedRead::new(file, BytesCodec::new());
  Body::wrap_stream(stream)
}

#[cfg(test)]
mod tests {
  use azure_metadata::AzureMetadata;
  use file_path_metadata::FilePathMetadata;

  use super::*;

  #[tokio::test]
  async fn describe() {
    let req = TimeseriesQuery {
      report_id: String::from("69"),
      query: Some(String::from("DESCRIBE table")),
      dl_token: String::from("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InVzZXJuYW1lX3Bhc3N3b3JkIiwiZGlzcGxheV9uYW1lIjoiU3VwZXIgVXNlciIsImVtYWlsIjoiYWRtaW5AYWRtaW4uY29tIiwiYWRtaW4iOnRydWUsImFjdGl2ZSI6dHJ1ZSwicmVzZXRfcmVxdWlyZWQiOmZhbHNlLCJlbWFpbF92YWxpZCI6ZmFsc2UsInR5cGUiOiJ1c2VyIiwicGVybWlzc2lvbnMiOltdLCJyb2xlcyI6W10sInVzZXJfaWQiOiIxIiwia2V5IjoiT0RobE5EWTRaakV0TUdJNE1pMDBNalpsTFdJeE9XSXROakk0TjJVNU5HTXdZekE1Iiwic2VjcmV0IjoiJDJhJDEwJDFjM1h6UVpjVGE0eWhIa1hxY3hVbi5nb2oydEx6anQ3NGV5Vmo2YkxwSDRuVWpSNmhBTGdDIiwibm90ZSI6bnVsbCwiaWQiOiIxIiwiaWRlbnRpdHlfcHJvdmlkZXJfaWQiOm51bGwsImNyZWF0ZWRfYXQiOiIyMDI0LTA5LTA0VDA2OjAwOjAwLjAwMFoiLCJtb2RpZmllZF9hdCI6IjIwMjQtMDktMDRUMDY6MDA6MDAuMDAwWiIsImNyZWF0ZWRfYnkiOiJzeXN0ZW0iLCJtb2RpZmllZF9ieSI6InN5c3RlbSIsInJlc2V0X3Rva2VuX2lzc3VlZCI6bnVsbCwiaWF0IjoxNzI1NDg3MTYzLCJleHAiOjE3MzIzOTkxNjN9.BcPXrS2SGmOFcBIMNMCe-Glc8cuTK-Tm7Q8DRW-NbW1q1CeZB6jAOl3VkxzmYrxnTmTlq9he2CLxayn_zebjnpHMpztmvNEnYmLhHpVfVPmmuTULDNuxku1yCYRPVJKyknTt9vfCc6M5nLsempOsJec6c-34DB-w1hJn2BohujBzECj9saP_dhcwqzUCorgJSDR93uo0vezaN83bFobX6saKI969FQhdVeKjEp5CB6tjlC2_7uOrJboIxTG2nAgiBS_qPQw5Im-hfxx8A-2cyncSSWjOUlL4U2BSXE4Yu0So9Xx3t8saM7t9-aI7NQuHBMQovKJFNEPgYxRvV4_07Q"),
      storage_type: StorageType::azure,
      sas_metadata: Some(AzureMetadata {
        blob_endpoint: Some(String::from("https://127.0.0.1:10000")),
        account_name: Some(String::from("devstoreaccount1")),
        container_name: Some(String::from("deep-lynx")),
        sas_token: Some(String::from("sv=2024-05-04&se=2024-09-06T09%3A44%3A08Z&sr=c&sp=rac&sig=v6CopvmIGiDbE%2Fk7awP9jHQK9JkX%2BRQGRZWzQ1DtutM%3D")),
      }),
      files: vec![
        FilePathMetadata {
          id: Some(String::from("6")),
          adapter: Some(String::from("azure_blob")),
          data_source_id: Some(String::from("1")),
          file_name: Some(String::from("ten-entries.csv")),
          adapter_file_path: Some(String::from("containers/1/datasources/1/ten-entries.csv")),
        },
      ],
      results_destination: String::from("http://127.0.0.1:10000/devstoreaccount1/deep-lynx/containers/1/datasources/1"),
      deeplynx_destination: String::from("http://localhost:8090/containers/1/files/timeseries/describe"),
    };
    match process_query(&req).await {
      Ok(res) => {
        dbg!(res);
      }
      Err(e) => {
        panic!("{}", e.reason);
      }
    };
  }
}
