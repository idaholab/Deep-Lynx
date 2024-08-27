use chrono::Utc;
use datafusion::dataframe::DataFrameWriteOptions;
use datafusion::datasource::listing::ListingTableUrl;
use datafusion::prelude::{CsvReadOptions, SessionConfig, SessionContext};
use lazy_static::lazy_static;
use object_store::azure::MicrosoftAzureBuilder;
use regex::Regex;
use reqwest::Body;
use serde_json::json;
use short_uuid::short;
use std::env;
use std::path::Path;
use std::sync::Arc;
use tokio::fs::{remove_file, File};
use tokio_util::codec::{BytesCodec, FramedRead};
use url::Url;

pub mod azure_metadata;
pub mod file_path_metadata;
pub mod timeseries_query;
use file_path_metadata::FilePathMetadata;
use timeseries_query::{StorageType, TimeseriesQuery};

#[napi]
pub async fn process_query(req: &TimeseriesQuery) -> napi::Result<String> {
  let files = req
    .files
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null file list")))?;
  if files.is_empty() {
    return Err(napi::Error::from_reason("Request has empty file list"));
  };

  let client = reqwest::Client::new();
  let session_config = SessionConfig::new().with_information_schema(true);
  let ctx = SessionContext::new_with_config(session_config);

  let sas_metadata = req
    .sas_metadata
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has null sas_metadata")))?;
  let store_type = req
    .storage_type
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null storage_type")))?;
  let sas_token = sas_metadata
    .sas_token
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null sas_token")))?;
  match store_type {
    StorageType::azure => {
      // todo: move this block to a fn in azure_metadata.rs

      let sas_token_query_pairs = token_to_query_pairs(sas_token.clone())
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;

      let blob_endpoint = sas_metadata.blob_endpoint.as_ref().ok_or_else(|| {
        napi::Error::from_reason(String::from("Azure blob endpoint cannot be None/Null."))
      })?;
      let table_path = ListingTableUrl::parse(blob_endpoint)
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;
      let url: &Url = table_path.as_ref();
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
      ctx
        .runtime_env()
        .register_object_store(url, Arc::new(ms_azure));
    }
    StorageType::filesystem => {
      let url = Url::try_from("file://").unwrap();
      let object_store = object_store::local::LocalFileSystem::new();
      ctx
        .runtime_env()
        .register_object_store(&url, Arc::new(object_store));
    }
  }

  let report_id = req
    .report_id
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null report_id")))?;
  let dl_token = req
    .dl_token
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null token")))?;

  let table_info =
    extract_table_info(files).map_err(|e| napi::Error::from_reason(e.to_string()))?;

  for table in table_info {
    match table.file_type {
      FileType::Csv => {
        ctx
          .register_csv(
            table.name.as_str(),
            table.adapter_file_path.as_str(),
            CsvReadOptions::new(),
          )
          .await
          .map_err(|e| napi::Error::from_reason(e.to_string()))?;
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
      .post(req.deeplynx_destination.as_ref().ok_or_else(|| {
        napi::Error::from_reason(String::from("Request deeplynx destination is null"))
      })?)
      .bearer_auth(dl_token)
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
        report_id, dl_response
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

    let results_destination = req.results_destination.as_ref().ok_or_else(|| {
      napi::Error::from_reason(String::from("Request has a null results_destination"))
    })?;

    let local_storage =
      env::var("FILESYSTEM_STORAGE_DIRECTORY").expect("FILESYSTEM_STORAGE_DIRECTORY must be set.");
    let now = Utc::now();
    let ext_extender = short!();
    let file_name = format!(
      "{}_{}.csv{}",
      report_id,
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
      "report_id": report_id,
      "isError": false,
      "file_name": file_name,
      "file_size": file_metadata.len(),
      "file_path": results_destination,
      "adapter": store_type.to_string(),
    });

    let dl_res = client
      .post(req.deeplynx_destination.as_ref().ok_or_else(|| {
        napi::Error::from_reason(String::from("Request deeplynx destination is null"))
      })?)
      .bearer_auth(dl_token)
      .json(&result_metadata)
      .send()
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let res_url = match store_type {
      StorageType::azure => {
        format!(
          "{}/{}?{}",
          results_destination,
          file_name,
          sas_metadata
            .sas_token
            .as_ref()
            .ok_or_else(|| napi::Error::from_reason(String::from("Request has null sas_token")))?
        )
      }
      StorageType::filesystem => {
        format!("{}/{}", results_destination, file_name)
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
      report_id, dl_res_str, ms_res_str
    ))
  }
}

// todo: move to file_path_metadata.rs
/// Extracts the table_name and file extension and returns it with the path
fn extract_table_info(files: &Vec<FilePathMetadata>) -> Result<Vec<TableMetadata>, String> {
  let mut table_info = Vec::new();
  for file in files {
    let file_id = file
      .id
      .as_ref()
      .ok_or("file_id can technically be null but should never be null.")?;
    let file_name = file
      .file_name
      .as_ref()
      .ok_or("file_id can technically be null but should never be null.")?;
    let adapter_file_path = file
      .adapter_file_path
      .as_ref()
      .ok_or("file_id can technically be null but should never be null.")?;
    lazy_static! {
      static ref RE_VALID_TABLE_NAME: Regex = regex::Regex::new(r"[a-zA-Z_][a-zA-Z_0-9]*")
        .expect("RE_VALID_TABLE_NAME static regex is incorrect");
    }
    if !RE_VALID_TABLE_NAME.is_match(file_name.as_str()) {
      return Err(format!(
        "File Path Metadata contained an invalid table name from id: {}",
        file_id
      ));
    }

    let ext_plus_uuid = Path::new(adapter_file_path.as_str())
      .extension()
      .ok_or_else(|| {
        format!(
          "File Path Metadata has no valid file extension from id: {}",
          file_id
        )
      })?;
    let ext = match ext_plus_uuid.to_str() {
      None => {
        return Err(format!(
          "File Path Metadata has no valid file extension from id: {}",
          file_id
        ))?
      }
      Some(ex) => match ex {
        s if s.starts_with("csv") => FileType::Csv,
        s if s.starts_with("json") => FileType::Json,
        s if s.starts_with("parquet") => {
          return Err(format!(
            "Parquet file (id: {}). Parquet is currently unsupported for Timeseries2",
            file_id
          ))
        }
        s if s.starts_with("hdf5") => {
          return Err(format!(
            "HDF5 file (id: {}). HDF5 is currently unsupported for Timeseries2",
            file_id
          ))
        }
        s if s.starts_with("tdms") => {
          return Err(format!(
            "TDMS file (id: {}). TDMS is currently unsupported for Timeseries2",
            file_id
          ))
        }
        _ => {
          return Err(format!(
            "File Path Metadata file extension was corrupted by the uuid from id: {}",
            file_id
          ))
        }
      },
    };

    table_info.push(TableMetadata {
      name: file_name.clone(),
      adapter_file_path: adapter_file_path.clone(),
      file_type: ext,
    });
  }
  Ok(table_info)
}

// todo: move to azure_metadata.rs
fn token_to_query_pairs(token: String) -> Result<Vec<(String, String)>, String> {
  let tmp_query_base_url = "https://www.not-actually-used.com";
  let tmp_query_full_url = format!("{}?{}", tmp_query_base_url, token);
  let tmp_parsed_query_url = Url::parse(&tmp_query_full_url).map_err(|e| e.to_string())?;
  let sas_token_query_pairs = tmp_parsed_query_url.query_pairs().into_owned();

  let mut converted_query_pairs = Vec::new();
  for pair in sas_token_query_pairs {
    converted_query_pairs.push(pair)
  }
  Ok(converted_query_pairs)
}

fn file_to_body(file: File) -> Body {
  let stream = FramedRead::new(file, BytesCodec::new());
  Body::wrap_stream(stream)
}

pub struct TableMetadata {
  pub name: String,
  pub adapter_file_path: String,
  pub file_type: FileType,
}

pub enum FileType {
  Csv,
  Json,
}
