use chrono::Utc;
use datafusion::dataframe::DataFrameWriteOptions;
use datafusion::datasource::listing::ListingTableUrl;
use datafusion::prelude::{CsvReadOptions, SessionConfig, SessionContext};
use lazy_static::lazy_static;
use object_store::azure::MicrosoftAzureBuilder;
use regex::Regex;
use reqwest::header::{HeaderMap, HeaderValue};
use reqwest::Body;
use serde_json::{json, Map, Value};
use std::env;
use std::path::Path;
use std::sync::Arc;
use tokio::fs::{remove_file, File};
use tokio_util::codec::{BytesCodec, FramedRead};
use url::Url;

pub mod azure_metadata;
pub mod file_path_metadata;
pub mod time_series_query;
use azure_metadata::AzureMetadata;
use file_path_metadata::FilePathMetadata;
use time_series_query::TimeSeriesQuery;

// If regular (non-describe) query:
//   - Upload query results as csv to large object storage
//     - `results_upload_path` shows path in blob storage to upload to
//   - Capture the following metadata:
//     - `file_name`, `file_size` (bytes), `file_path`, `adapter` (should be "azure_blob", "filesystem", etc)
//   - POST metadata to deeplynx_response_url endpoint
// If describe query:
//   - POST describe results (JSON format) to deeplynx_response_url endpoint. These can just be in a json body, no need to put them in a file unless that's easier
#[napi]
pub async fn process_query(req: &TimeSeriesQuery) -> napi::Result<String> {
  let report_id = req
    .report_id
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null report_id")))?;
  let query = req
    .query
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null query")))?;
  let deeplynx_response_url = req.deeplynx_response_url.as_ref().ok_or_else(|| {
    napi::Error::from_reason(String::from("Request has a null deeplynx_response_url"))
  })?;
  let upload_path = req
    .upload_path
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null upload_path")))?;
  let files = req
    .files
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null file list")))?;
  let token = req
    .token
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null token")))?;
  let data_source_id = req
    .data_source_id
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has a null data_source_id")))?;
  let azure_metadata = req
    .azure_metadata
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason(String::from("Request has null azure_metadata")))?;

  if files.is_empty() {
    return Err(napi::Error::from_reason("Request has empty file list"));
  };

  let client = reqwest::Client::new();
  let server = env::var("DL_SERVER").expect("DL_SERVER must be set.");
  let mut headers = HeaderMap::new();
  headers.insert(
    "Authorization",
    format!("Bearer {}", token)
      .parse::<HeaderValue>()
      .map_err(|e| napi::Error::from_reason(e.to_string()))?,
  );

  let session_config = SessionConfig::new().with_information_schema(true);
  let ctx = SessionContext::new_with_config(session_config);

  let adapter = files[0].adapter.as_ref().ok_or_else(|| {
    napi::Error::from_reason(String::from("Request's first file has a null adapter"))
  })?;
  match adapter.as_str() {
    "azure_blob" => {
      let table_path =
        ListingTableUrl::parse("https://gvadedeeplynxdevsa.blob.core.usgovcloudapi.net/")
          .map_err(|e| napi::Error::from_reason(e.to_string()))?;
      let url: &Url = table_path.as_ref();
      let microsoft_azure = MicrosoftAzureBuilder::new()
        .with_account("gvadedeeplynxdevsa")
        .with_access_key("")
        .with_container_name("deeplynx")
        .with_endpoint("https://gvadedeeplynxdevsa.blob.core.usgovcloudapi.net".to_string())
        .build()
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;
      let store = Arc::new(microsoft_azure);
      ctx.runtime_env().register_object_store(url, store.clone());
    }
    "filesystem" => (), // does datafusion need to have local filesystem set?
    _ => {
      return Err(napi::Error::from_reason(format!(
        "Unimplemented adapter type: {}",
        adapter
      )))?;
    }
  }

  let table_info = extract_table_info(files).unwrap();
  let first_table = table_info[0].name.clone();
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
      } // todo: add more filetypes
    }
  }

  let mut sql_query = query.clone();
  let is_describe = sql_query.trim().to_uppercase().starts_with("DESCRIBE");

  // send both to req.deeplynx_response_url
  if is_describe {
    // describe query
    // POST the schema results of a describe query in JSON format.
    // It will accept either multipart form file upload or json body data.
    sql_query = format!("DESCRIBE {}", first_table);
    let query_results = ctx
      .sql(sql_query.as_str())
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let record_batches = query_results
      .collect()
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let rb_slice = record_batches.iter().collect::<Vec<&_>>();
    let json_rows = datafusion::arrow::json::writer::record_batches_to_json_rows(&rb_slice)
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    // Probably should stream the json? How-to details here:
    // https://datafusion.apache.org/library-user-guide/using-the-dataframe-api.html#collect-streaming-exec
    let json_payload =
      serde_json::to_value(json_rows).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    if client
      .post(deeplynx_response_url.clone())
      .json(&json_payload)
      .send()
      .await
      .is_ok()
    {
      Ok(json_payload.to_string())
    } else {
      Err(napi::Error::from_reason(
        "Failed to send DESCRIBE data to client",
      ))
    }
  } else {
    let query_results = ctx
      .sql(sql_query.as_str())
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    // send query_resutls (df) to upload_path
    // the results of that should contain the metadata we want
    // `file_name`, `file_size` (bytes), `file_path`, `adapter`
    // adapter should be "azure_blob" or "filesystem" (more to be added later)
    let local_storage =
      env::var("FILESYSTEM_STORAGE_DIRECTORY").expect("FILESYSTEM_STORAGE_DIRECTORY must be set.");
    let now = Utc::now();
    let filepath = format!(
      "{}/{}_{}.csv",
      local_storage,
      report_id,
      now.timestamp_millis()
    );
    query_results
      .write_csv(filepath.as_str(), DataFrameWriteOptions::new(), None)
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let res_file = File::open(&filepath).await?;

    let upload_url = format!("{}/{}", server, upload_path);

    // todo: need to put the azure metadata in here somewhere
    let response = client
      .post(upload_url)
      .headers(headers)
      .body(file_to_body(res_file))
      .send()
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    remove_file(&filepath).await?;

    let body = response
      .text()
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let json_body: Value =
      serde_json::from_str(body.as_str()).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let res_body = match json_body.as_object() {
      None => {
        return Err(napi::Error::from_reason(
          "Deeplynx Storage returned an empty body from timeseries report data upload",
        ));
      }
      Some(b) => b,
    };

    // pseudo: if !res.isError && !res.value[0].value.isError
    if res_body["isError"].as_bool().is_some_and(|e| e)
      || res_body["value"].as_array().unwrap()[0]["isError"]
        .as_bool()
        .is_some_and(|e| e)
    {
      return Ok(
        json!({
          "report_id": report_id,
          "isError": true,
        })
        .to_string(),
      );
    }

    let file_name = json_or_error_value(res_body, "file_name");
    let adapter_file_path = json_or_error_value(res_body, "adapter_file_path");
    let adapter = json_or_error_value(res_body, "adapter");
    let file_size = match res_body["value"].as_array() {
      Some(v) => match v[0]["value"].as_object() {
        Some(v2) => v2["file_size"].to_owned(),
        None => json!(-1),
      },
      None => json!(-1),
    };

    // ensure none of the above are errors
    let is_error = if res_body["isError"] == json!(true)
      || file_name == json!("error")
      || file_size == json!(-1)
      || adapter_file_path == json!("error")
      || adapter == json!("error")
    {
      json!(true)
    } else {
      json!(false)
    };
    Ok(
      json!({
        "report_id": report_id,
        "isError": is_error,
        "file_name": file_name,
        "file_size": file_size,
        "adapter_file_path": adapter_file_path,
        "adapter": adapter
      })
      .to_string(),
    )
  }
}

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

fn file_to_body(file: File) -> Body {
  let stream = FramedRead::new(file, BytesCodec::new());
  Body::wrap_stream(stream)
}

/// returns an error if reading any json fails along the way
fn json_or_error_value(body: &Map<String, Value>, field: &str) -> Value {
  match body["value"].as_array() {
    Some(v) => match v[0]["value"].as_object() {
      Some(v2) => v2[field].to_owned(),
      None => json!("error"),
    },
    None => json!("error"),
  }
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
