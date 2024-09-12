use chrono::Utc;
use datafusion::{arrow::json::ArrayWriter, dataframe::DataFrameWriteOptions};
use serde_json::json;
use short_uuid::short;
use tokio::fs::{remove_file, File};

pub mod azure_metadata;
pub mod errors;
pub mod file_path_metadata;
pub mod timeseries_query;
use timeseries_query::{get_local_storage_path, setup, TimeseriesQuery};

/// For processing file uploads, returns the the results of a SQL `DESCRIBE` query against the uploaded file(s).
/// Results are returned as stringified JSON.
#[napi]
pub async fn process_upload(req: &TimeseriesQuery) -> napi::Result<String> {
  let ctx = setup(req).await.map_err(|e| {
    napi::Error::from_reason(format!(
      "Failed to set up datafusion context with reason: {e}"
    ))
  })?;
  let query = req
    .query
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason("Request has a null query".to_string()))?;
  let results = ctx
    .sql(query.as_str())
    .await
    .map_err(|e| napi::Error::from_reason(format!("Failed to run query {query} with reason: {e}")))?
    .collect()
    .await
    .map_err(|e| {
      napi::Error::from_reason(format!("Failed to write results to JSON with reason: {e}"))
    })?;

  let batches = results.iter().collect::<Vec<&_>>();
  let buf = Vec::new();
  let mut writer = ArrayWriter::new(buf);
  writer.write_batches(&batches).map_err(|e| {
    napi::Error::from_reason(format!(
      "Failed to write record batches to json with reason: {e}"
    ))
  })?;
  writer.finish().map_err(|e| {
    napi::Error::from_reason(format!(
      "Failed to finish writing record batches to json with reason: {e}"
    ))
  })?;
  let json_data = writer.into_inner();
  let json_string = String::from_utf8(json_data).map_err(|e| {
    napi::Error::from_reason(format!(
      "Failed to get json string from bytes with reason: {e}"
    ))
  })?;
  Ok(json_string)
}

/// For processing queries against a set of files.
/// Uploads results to a location specified in the request object.
/// Returns the metadata of the query results as stringified JSON.
#[napi]
pub async fn process_query(req: &TimeseriesQuery) -> napi::Result<String> {
  let uuid = short!();
  let now = Utc::now();
  let local_storage = get_local_storage_path().map_err(|e| {
    napi::Error::from_reason(format!(
      "Failed to set up local storage path with reason: {e}"
    ))
  })?;

  let ctx = setup(req).await.map_err(|e| {
    napi::Error::from_reason(format!(
      "Failed to set up datafusion context with reason: {e}"
    ))
  })?;

  let query = req
    .query
    .as_ref()
    .ok_or_else(|| napi::Error::from_reason("Request has a null query".to_string()))?;
  let query_results = ctx.sql(query.as_str()).await.map_err(|e| {
    napi::Error::from_reason(format!("Failed to run query {query} with reason: {e}"))
  })?;

  let file_name = format!("{}_{}_{}.csv", uuid, req.report_id, now.timestamp_millis());

  // todo: set this to include the adapter_file_path
  let file_path = format!("{}/{}", local_storage, file_name);

  query_results
    .write_csv(file_path.as_str(), DataFrameWriteOptions::new(), None)
    .await
    .map_err(|e| {
      napi::Error::from_reason(format!("Failed to write results to CSV with reason: {e}"))
    })?;
  let res_file = File::open(&file_path).await?;
  let file_metadata = res_file.metadata().await.map_err(|e| {
    napi::Error::from_reason(format!(
      "Failed to read results file metadata with reason: {e}"
    ))
  })?;
  let result_metadata = json!({
    "report_id": req.report_id,
    "isError": false,
    "file_name": file_name,
    "file_size": file_metadata.len(),
    "file_path": "todo",
    "adapter": req.storage_type.to_string(),
  });

  // todo: upload to obj_store

  // todo: only do if !filesystem
  remove_file(&file_path).await?;

  let metadata_res_json = serde_json::to_string(&result_metadata).map_err(|e| {
    napi::Error::from_reason(format!(
      "Failed to convert results file metadata to return String with reason: {e}"
    ))
  })?;

  Ok(metadata_res_json)
}

#[cfg(test)]
mod tests {
  use azure_metadata::AzureMetadata;
  use file_path_metadata::FilePathMetadata;
  use timeseries_query::StorageType;

  use super::*;

  #[tokio::test]
  async fn describe_with_azure() {
    let req = TimeseriesQuery {
      report_id: "69".to_string(),
      query: Some("DESCRIBE table_15".to_string()),
      storage_type: StorageType::azure,
      sas_metadata: Some(AzureMetadata {
        blob_endpoint: Some("http://127.0.0.1:10000".to_string()),
        account_name: Some("devstoreaccount1".to_string()),
        container_name: Some("deep-lynx".to_string()),
        sas_token: Some("sv=2024-05-04&se=2024-09-13T04%3A22%3A54Z&sr=c&sp=rac&sig=tkAjV6G9MusmudblmnDb%2B9jYdRPL5X06QmA3EXUMjWM%3D".to_string()),
        //               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ this token expires frequently
      }),
      files: vec![
        FilePathMetadata {
          id: Some("15".to_string()),
          adapter: Some("azure_blob".to_string()),
          data_source_id: Some("1".to_string()),
          file_name: Some("czpadKZbKNDamk3amXCBMften-entries.csv".to_string()),
          adapter_file_path: Some("containers/1/datasources/1".to_string()),
        },
      ],
    };
    match process_upload(&req).await {
      Ok(res) => {
        dbg!(res);
      }
      Err(e) => {
        panic!("{}", e.reason);
      }
    };
  }

  #[tokio::test]
  async fn describe_with_filesystem() {
    let req = TimeseriesQuery {
      report_id: "420".to_string(),
      query: Some("DESCRIBE table_1".to_string()),
      storage_type: StorageType::filesystem,
      sas_metadata: None,
      files: vec![FilePathMetadata {
        id: Some("1".to_string()),
        adapter: Some("filesystem".to_string()),
        data_source_id: Some("1".to_string()),
        file_name: Some("ten-entries.csv".to_string()),
        adapter_file_path: Some("containers/1/datasources/1".to_string()),
      }],
    };
    match process_upload(&req).await {
      Ok(res) => {
        dbg!(res);
      }
      Err(e) => {
        panic!("{}", e.reason);
      }
    };
  }
}
