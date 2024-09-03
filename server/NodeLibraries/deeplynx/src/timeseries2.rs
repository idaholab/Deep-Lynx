use chrono::Utc;
use datafusion::dataframe::DataFrameWriteOptions;
use datafusion::datasource::listing::ListingTableUrl;
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
  if req.files.is_empty() {
    return Err(napi::Error::from_reason("Request has empty file list"));
  };

  let client = reqwest::Client::new();
  let session_config = SessionConfig::new().with_information_schema(true);
  let ctx = SessionContext::new_with_config(session_config);
  println!("registered ctx");
  let sas_metadata = req
    .sas_metadata
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has null sas_metadata")))?;
  let sas_token = sas_metadata
    .sas_token
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null sas_token")))?;
  println!("registering object store to ctx...");
  match req.storage_type {
    StorageType::azure => {
      let sas_token_query_pairs = azure_metadata::token_to_query_pairs(sas_token.clone())
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;
      println!("sas_token got");
      let blob_endpoint = sas_metadata.blob_endpoint.as_ref().ok_or_else(|| {
        napi::Error::from_reason(String::from("Azure blob endpoint cannot be None/Null."))
      })?;
      println!("blob_endpoint got");
      let table_path = ListingTableUrl::parse(blob_endpoint)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;
      println!("table_path got");
      let url: &Url = table_path.as_ref();
      println!("got paths for azure builder");
      let ms_azure = MicrosoftAzureBuilder::new()
        .with_account(sas_metadata.account_name.as_ref().ok_or_else(|| {
          napi::Error::from_reason(String::from("Azure account name cannot be None/Null."))
        })?)
        .with_sas_authorization(sas_token_query_pairs)
        .with_container_name(sas_metadata.container_name.as_ref().ok_or_else(|| {
          napi::Error::from_reason(String::from("Azure container name cannot be None/Null."))
        })?)
        .with_endpoint(blob_endpoint.to_owned())
        .build()
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;
      println!("azure builder built");
      ctx
        .runtime_env()
        .register_object_store(url, Arc::new(ms_azure));
    }
    StorageType::filesystem => {
      // todo: make this not an unwrap
      let url = Url::try_from("file://").unwrap();
      let object_store = object_store::local::LocalFileSystem::new();
      ctx
        .runtime_env()
        .register_object_store(&url, Arc::new(object_store));
    }
  }
  println!("registering tables to ctx...");
  let table_info = file_path_metadata::extract_table_info(&req.files)
    .map_err(|e| napi::Error::from_reason(e.to_string()))?;

  for table in table_info {
    println!("beginning for table in table_info...");
    // todo: if storage_type is azure, we need to download the file
    println!("file path: {:?}", table.adapter_file_path);
    match table.file_type {
      FileType::Csv => {
        println!("heckin' crashing, brb");

        // error starts here, looking chained together
        // Object Store error: Generic MicrosoftAzure error:
        // response error "request error", after 10 retries:
        // error sending request for url
        // error trying to connect: record overflow
        ctx
          .register_csv(
            table.name.as_str(),
            table.adapter_file_path.as_str(),
            CsvReadOptions::new(),
          )
          .await
          .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        println!("register csv worked!");
      }
      FileType::Json => {
        ctx
          .register_csv(
            table.name.as_str(),
            table.adapter_file_path.as_str(),
            Default::default(),
          )
          .await
          .map_err(|e| napi::Error::from_reason(e.to_string()))?;
      }
    }
  }
  println!("preparing query...");
  let query = req
    .query
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null query")))?;
  if query.trim().to_uppercase().starts_with("DESCRIBE") {
    let query_results = ctx
      .sql(query.as_str())
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let record_batches = query_results
      .collect()
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let rb_slice = record_batches.iter().collect::<Vec<&_>>();
    let json_rows = datafusion::arrow::json::writer::record_batches_to_json_rows(&rb_slice)
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let json_payload =
      serde_json::to_value(json_rows).map_err(|e| napi::Error::from_reason(e.to_string()))?;
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
      dl_token: String::from("eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InNlcnZpY2UiLCJkaXNwbGF5X25hbWUiOiJ0ZXN0IHNlcnZpY2UgdXNlciIsImVtYWlsIjoiIiwiYWRtaW4iOmZhbHNlLCJhY3RpdmUiOnRydWUsInJlc2V0X3JlcXVpcmVkIjpmYWxzZSwiZW1haWxfdmFsaWQiOmZhbHNlLCJ0eXBlIjoidXNlciIsInBlcm1pc3Npb25zIjpbXSwicm9sZXMiOltdLCJpZCI6IjU4IiwiaWRlbnRpdHlfcHJvdmlkZXJfaWQiOm51bGwsImNyZWF0ZWRfYXQiOiIyMDI0LTA4LTMwVDA2OjAwOjAwLjAwMFoiLCJtb2RpZmllZF9hdCI6IjIwMjQtMDgtMzBUMDY6MDA6MDAuMDAwWiIsImNyZWF0ZWRfYnkiOiIxIiwibW9kaWZpZWRfYnkiOiIxIiwicmVzZXRfdG9rZW5faXNzdWVkIjpudWxsLCJpYXQiOjE3MjUwNDM5NTMsImV4cCI6MTcyNTA0NzU1M30.ERovJYK8_r__2h7xh4yf2WLa65aS702VWuLbMiYLhAtYfI6st42XEOf86GH_fHhqW66CWNNbTPFueEakEppx8jMNU_qk_JDP3wb5tIB5AS8nBVNP9SOV9n4ND8q6FnPzwsRwfIjxFqalywffZqfQMGmcnnMZBCqeuet5acyuZa-IASkZKa2n_78CXm6xY5EUz8ozZB48h8qQQRZ3d5YNLQh2KakeTdiPllC3HjHrppeLbGmOi9GcrxivDGlqazpxGWJMxajjTRrRcurCfAOSRBHZ24r4FK0cHZjHwgWgontLLwDqK4pmSssWBtqBEITwltaj378TtrsjQIlJVFsmVA"),
      storage_type: StorageType::azure,
      sas_metadata: Some(AzureMetadata {
        account_name: Some(String::from("devstoreaccount1")),
        blob_endpoint: Some(String::from("https://127.0.0.1:10000/devstoreaccount1")),
        container_name: Some(String::from("deep-lynx")),
        sas_token: Some(String::from("sv=2024-05-04&se=2024-08-31T06%3A52%3A33Z&sr=c&sp=rac&sig=mDQ83TS%2B6CiZk9QSvB%2BiYzziHwuTtCHiMIc0j1WHmbQ%3D")),
      }),
      files: vec![
        FilePathMetadata {
          id: Some(String::from("5")),
          adapter: Some(String::from("azure_blob")),
          data_source_id: Some(String::from("7")),
          file_name: Some(String::from("1million.csv")),
          adapter_file_path: Some(String::from("https://127.0.0.1:10000/containers/1/datasources/7/1million.csv4ygyh1LzWtQkc9k28saFFC")),
        },
      ],
      results_destination: String::from("http://127.0.0.1:10000/devstoreaccount1/deep-lynx/containers/1/datasources/7"),
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
