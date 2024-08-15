pub mod error;
pub mod types;

use chrono::Utc;
use datafusion::dataframe::DataFrameWriteOptions;
use napi::Error;
use reqwest::header::{HeaderMap, HeaderValue};
use reqwest::Body;
use serde_json::{json, Value};
use std::env;
use tokio::fs::{remove_file, File};
use tokio_util::codec::{BytesCodec, FramedRead};

use types::{Request, Session};

// If regular (non-describe) query:
//   - Upload query results as csv to large object storage
//     - `results_upload_path` shows path in blob storage to upload to
//   - Capture the following metadata:
//     - `file_name`, `file_size` (bytes), `file_path`, `adapter` (should be "azure_blob", "filesystem", etc)
//   - POST metadata to deeplynx_response_url endpoint
// If describe query:
//   - POST describe results (JSON format) to deeplynx_response_url endpoint. These can just be in a json body, no need to put them in a file unless that's easier
#[napi]
pub async fn process_query(req: Request) -> Result<String, Error> {
  if req.files.is_empty() {
    return Err(napi::Error::from_reason("Request has empty file list"));
  };

  // todo: validate response_url with url crate: https://docs.rs/url/

  let client = reqwest::Client::new();
  let server = env::var("DL_SERVER").expect("DL_SERVER must be set.");
  let mut headers = HeaderMap::new();
  headers.insert(
    "Authorization",
    format!("Bearer {}", req.token)
      .parse::<HeaderValue>()
      .map_err(|e| napi::Error::from_reason(e.to_string()))?,
  );

  let mut session = Session::new(req.files[0].adapter)?;
  let mut table_names: Vec<String> = vec![];
  let mut file_paths: Vec<String> = vec![];
  for file_path_metadata in &req.files {
    let table_name = file_path_metadata.get_table_name()?;
    table_names.push(table_name.clone());
    let file_path = file_path_metadata.retrieve_file().await?;
    file_paths.push(file_path.clone());
    session
      .register_table(&table_name, file_path.as_str())
      .await?;
  }

  let mut sql = req.query.clone();
  let is_describe = sql.trim().to_uppercase().starts_with("DESCRIBE");
  if is_describe {
    sql = format!("DESCRIBE {}", &table_names[0]);
  }
  let query_results = session
    .query(sql.as_str())
    .await
    .map_err(|e| napi::Error::from_reason(e.to_string()))?;

  // send both to req.deeplynx_response_url
  if is_describe {
    // describe query
    // POST the schema results of a describe query in JSON format.
    // It will accept either multipart form file upload or json body data.
    //
    // Probably should stream the json? How-to details here:
    // https://datafusion.apache.org/library-user-guide/using-the-dataframe-api.html#collect-streaming-exec
    let record_batches = query_results
      .collect()
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let rb_slice = record_batches.iter().collect::<Vec<&_>>();
    let json_rows = datafusion::arrow::json::writer::record_batches_to_json_rows(&rb_slice)
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;
    let json_payload =
      serde_json::to_value(json_rows).map_err(|e| napi::Error::from_reason(e.to_string()))?;
    if client
      .post(req.deeplynx_response_url)
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
    // send query_resutls (df) to upload_path
    // the results of that should contain the metadata we want
    // `file_name`, `file_size` (bytes), `file_path`, `adapter`
    // adapter should be "azure_blob" or "filesystem" (more to be added later)
    let local_storage =
      env::var("FILESYSTEM_STORAGE_DIRECTORY").expect("FILESYSTEM_STORAGE_DIRECTORY must be set.");
    let now = Utc::now();
    let filepath = format!(
      "{}/{}-{}.csv",
      local_storage,
      req.report_id,
      now.timestamp_millis()
    );
    query_results
      .write_csv(filepath.as_str(), DataFrameWriteOptions::new(), None)
      .await
      .map_err(|e| napi::Error::from_reason(e.to_string()))?;

    let res_file = File::open(&filepath).await?;

    let upload_url = format!("{}/{}", server, req.upload_path);
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
          "report_id": req.report_id,
          "isError": true,
        })
        .to_string(),
      );
    }

    let file_name = match res_body["value"].as_array() {
      Some(v) => match v[0]["value"].as_object() {
        Some(v2) => v2["file_name"].to_owned(),
        None => json!("error"),
      },
      None => json!("error"),
    };
    let file_size = match res_body["value"].as_array() {
      Some(v) => match v[0]["value"].as_object() {
        Some(v2) => v2["file_size"].to_owned(),
        None => json!(-1),
      },
      None => json!(-1),
    };
    let adapter_file_path = match res_body["value"].as_array() {
      Some(v) => match v[0]["value"].as_object() {
        Some(v2) => v2["adapter_file_path"].to_owned(),
        None => json!("error"),
      },
      None => json!("error"),
    };
    let adapter = match res_body["value"].as_array() {
      Some(v) => match v[0]["value"].as_object() {
        Some(v2) => v2["adapter"].to_owned(),
        None => json!("error"),
      },
      None => json!("error"),
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
        "report_id": req.report_id,
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

fn file_to_body(file: File) -> Body {
  let stream = FramedRead::new(file, BytesCodec::new());
  Body::wrap_stream(stream)
}
