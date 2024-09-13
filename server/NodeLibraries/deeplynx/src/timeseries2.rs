use chrono::Utc;
use connection_string::AdoNetString;
use datafusion::{
  arrow::json::ArrayWriter,
  dataframe::DataFrameWriteOptions,
  datasource::{
    file_format::{csv::CsvFormat, FileFormat},
    listing::ListingOptions,
  },
};
use file_metadata::FileMetadata;
use serde_json::json;
use short_uuid::short;
use std::sync::Arc;
use tokio::fs::{remove_file, File};

pub mod azure_object_store;
pub mod errors;
pub mod file_metadata;
pub mod timeseries_query;
use timeseries_query::populate_session;

/// For processing file uploads
/// Returns the results of a SQL `DESCRIBE` of the file as stringified JSON.
#[napi]
pub async fn process_upload(
  report_id: String,
  query: String,
  storage_connection: String,
  files: Vec<FileMetadata>,
) -> napi::Result<String> {
  let storage_connection: AdoNetString = storage_connection.parse().map_err(|e| {
    napi::Error::from_reason(format!(
      "Failed to parse storage_connection string with reason: {e}"
    ))
  })?;

  let ctx = populate_session(&storage_connection, files)
    .await
    .map_err(|e| {
      napi::Error::from_reason(format!(
        "Failed to set up datafusion session context with reason: {e}"
      ))
    })?;
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
  let description_json = writer.into_inner();
  let description_string = String::from_utf8(description_json).map_err(|e| {
    napi::Error::from_reason(format!(
      "Failed to get json string from bytes with reason: {e}"
    ))
  })?;
  let describe_report = json!({
    "reportID": report_id,
    "description": description_string
  });

  Ok(describe_report.to_string())
}

/// For processing a query against a set of files.
/// Uploads results to a location specified in the request object.
/// Returns the metadata of the query results as stringified JSON.
#[napi]
pub async fn process_query(
  report_id: String,
  query: String,
  storage_connection: String,
  files: Vec<FileMetadata>,
) -> napi::Result<String> {
  let uuid = short!();
  let now = Utc::now();
  let storage_connection: AdoNetString = storage_connection.parse().map_err(|e| {
    napi::Error::from_reason(format!(
      "Failed to parse storage_connection string with reason: {e}"
    ))
  })?;

  let ctx = populate_session(&storage_connection, files)
    .await
    .map_err(|e| {
      napi::Error::from_reason(format!(
        "Failed to set up datafusion session context with reason: {e}"
      ))
    })?;

  let query_results = ctx.sql(query.as_str()).await.map_err(|e| {
    napi::Error::from_reason(format!("Failed to run query {query} with reason: {e}"))
  })?;

  let provider = storage_connection.get("provider").ok_or_else(|| {
    napi::Error::from_reason("provider is not set in connection string".to_string())
  })?;
  let upload_path = storage_connection.get("uploadpath").ok_or_else(|| {
    napi::Error::from_reason("uploadPath is not set in connection string".to_string())
  })?;
  let file_name = format!("{}_{}_{}.csv", uuid, report_id, now.timestamp_millis());

  let local_file_path = match provider.as_str() {
    "filesystem" => {
      let root_file_path = storage_connection.get("rootfilepath").ok_or_else(|| {
        napi::Error::from_reason("rootFilePath is not set in connection string".to_string())
      })?;
      format!("{root_file_path}/{upload_path}/{file_name}")
    }
    // _ => format!("./{file_name}"),
    _ => format!("./../../../storage/{upload_path}/temp/{file_name}"), // todo: change back before PR
  };

  query_results
    .write_csv(local_file_path.as_str(), DataFrameWriteOptions::new(), None)
    .await
    .map_err(|e| {
      napi::Error::from_reason(format!("Failed to write results to CSV with reason: {e}"))
    })?;
  let res_file = File::open(&local_file_path).await?;
  let file_metadata = res_file.metadata().await.map_err(|e| {
    napi::Error::from_reason(format!(
      "Failed to read results file metadata with reason: {e}"
    ))
  })?;

  let meta_filepath = match provider.as_str() {
    "filesystem" => local_file_path.clone(),
    _ => format!("{upload_path}/{file_name}"),
  };

  let result_metadata = json!({
    "report_id": report_id,
    "isError": false,
    "file_name": file_name,
    "file_size": file_metadata.len(),
    "file_path": meta_filepath,
    "adapter": provider,
  });

  if *provider == "azure" {
    let blob_endpoint = storage_connection.get("blobendpoint").ok_or_else(|| {
      napi::Error::from_reason(
        "blobEndpoint not set in connection string with provider: azure".to_string(),
      )
    })?;
    let container_name = storage_connection.get("containername").ok_or_else(|| {
      napi::Error::from_reason("Azure Container Name is not set in connection string".to_string())
    })?;

    let file_format = CsvFormat::default();
    let listing_options = ListingOptions::new(Arc::new(file_format))
      .with_file_extension(CsvFormat::default().get_ext());

    // todo: this path is broken...
    let listing_path = format!("{blob_endpoint}/{container_name}/{upload_path}/{file_name}");

    dbg!(&listing_path);
    ctx
      .register_listing_table(&file_name, listing_path, listing_options, None, None)
      .await
      .map_err(|e| {
        napi::Error::from_reason(format!(
          "failed to upload query results metadata with reason: {e}"
        ))
      })?;

    remove_file(&local_file_path).await?;
  }

  let metadata_res_json = serde_json::to_string(&result_metadata).map_err(|e| {
    napi::Error::from_reason(format!(
      "Failed to convert results file metadata to return String with reason: {e}"
    ))
  })?;

  Ok(metadata_res_json)
}

#[cfg(test)]
mod tests {
  use file_metadata::FileMetadata;

  use super::*;

  #[tokio::test]
  async fn describe_with_azure() {
    match process_upload(
      "69".to_string(),
      "DESCRIBE table_15".to_string(),
      "provider=azure;uploadPath=containers/1/datasources/1;blobEndpoint=http://127.0.0.1:10000;accountName=devstoreaccount1;accountKey='Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';containerName=deep-lynx;".to_string(),
      vec![
        FileMetadata {
          id: "15".to_string(),
          file_name: "czpadKZbKNDamk3amXCBMften-entries.csv".to_string(),
          file_path: "containers/1/datasources/1".to_string(),
        },
      ]
    ).await {
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
    match process_upload(
      "420".to_string(),
      "DESCRIBE table_1".to_string(),
      "provider=filesystem;uploadPath=containers/1/datasources/1;rootFilePath=./../../../storage;"
        .to_string(),
      vec![FileMetadata {
        id: "1".to_string(),
        file_name: "ten-entries.csv".to_string(),
        file_path: "containers/1/datasources/1".to_string(),
      }],
    )
    .await
    {
      Ok(res) => {
        dbg!(res);
      }
      Err(e) => {
        panic!("{}", e.reason);
      }
    };
  }

  #[tokio::test]
  async fn query_with_azure() {
    match process_query(
      "69".to_string(),
      "SELECT * FROM table_15".to_string(),
      "provider=azure;uploadPath=containers/1/datasources/1;blobEndpoint=http://127.0.0.1:10000;accountName=devstoreaccount1;accountKey='Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';containerName=deep-lynx;".to_string(),
      vec![
        FileMetadata {
          id: "15".to_string(),
          file_name: "czpadKZbKNDamk3amXCBMften-entries.csv".to_string(),
          file_path: "containers/1/datasources/1".to_string(),
        },
      ]
    ).await {
      Ok(res) => {
        dbg!(res);
      }
      Err(e) => {
        panic!("{}", e.reason);
      }
    };
  }

  #[tokio::test]
  async fn query_with_filesystem() {
    match process_query(
      "420".to_string(),
      "SELECT * FROM table_1".to_string(),
      "provider=filesystem;uploadPath=containers/1/datasources/1;rootFilePath=./../../../storage;"
        .to_string(),
      vec![FileMetadata {
        id: "1".to_string(),
        file_name: "ten-entries.csv".to_string(),
        file_path: "containers/1/datasources/1".to_string(),
      }],
    )
    .await
    {
      Ok(res) => {
        dbg!(res);
      }
      Err(e) => {
        panic!("{}", e.reason);
      }
    };
  }
}
