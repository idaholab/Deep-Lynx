use chrono::Utc;
use connection_string::AdoNetString;
use datafusion::{
  arrow::json::ArrayWriter, common::file_options::csv_writer::CsvWriterOptions, config::CsvOptions,
  dataframe::DataFrameWriteOptions,
};
use file_metadata::FileMetadata;
use serde_json::{json, Value};
use short_uuid::short;
use tokio::fs::File;

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
  let ctx = populate_session(&storage_connection, files.clone()).await?;
  let queries = query.split(";");
  let mut file_descriptions: Vec<Value> = Vec::new();

  for q in queries {
    let results = ctx
      .sql(q)
      .await
      .map_err(|e| {
        napi::Error::from_reason(format!("Failed to run query {query} with reason: {e}"))
      })?
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

    file_descriptions.push(json!({
      "file_id": q
        .to_lowercase()
        .trim_start_matches("describe table_")
        .to_string(),
      "description": description_string
    }))
  }

  let describe_report = json!({
    "reportID": report_id,
    "descriptions": file_descriptions
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

  let ctx = populate_session(&storage_connection, files).await?;
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
  let root_upload_path = match provider.as_str() {
    "filesystem" => {
      let root_file_path = storage_connection.get("rootfilepath").ok_or_else(|| {
        napi::Error::from_reason("rootFilePath is not set in connection string".to_string())
      })?;
      format!("{root_file_path}{upload_path}/")
    }
    "azure" => {
      let blob_endpoint = storage_connection.get("blobendpoint").ok_or_else(|| {
        napi::Error::from_reason(
          "blobEndpoint not set in connection string with provider: azure".to_string(),
        )
      })?;
      format!("{blob_endpoint}/{upload_path}/")
    }
    _ => {
      return Err(napi::Error::from_reason(
        "Cannot set file upload path: provider is not set in connection string".to_string(),
      ))
    }
  };
  let full_upload_path = format!("{root_upload_path}{file_name}");

  query_results
    .write_csv(
      &full_upload_path,
      DataFrameWriteOptions::new(),
      Some(CsvOptions {
        has_header: Some(true),
        ..Default::default()
      }),
    )
    .await
    .map_err(|e| {
      napi::Error::from_reason(format!("Failed to write results to CSV with reason: {e}"))
    })?;

  let file_size = match provider.as_str() {
    "filesystem" => {
      let res_file = File::open(&full_upload_path).await?;
      res_file.metadata().await?.len()
    }
    "azure" => {
      azure_object_store::get_blob_size(&storage_connection, upload_path, &file_name).await?
    }
    _ => {
      return Err(napi::Error::from_reason(
        "Cannot get file metadata: provider is not set in connection string".to_string(),
      ))
    }
  };

  let result_metadata = json!({
    "file_name": file_name,
    "file_size": file_size as f64 / 1024.00,
    "file_path": root_upload_path,
    "adapter": provider,
  });

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
      "1".to_string(),
      "DESCRIBE table_1".to_string(),
      "provider=azure;uploadPath=containers/1/datasources/1;blobEndpoint=http://127.0.0.1:10000;accountName=devstoreaccount1;accountKey='Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';containerName=deep-lynx".to_string(),
      vec![
        FileMetadata {
          id: "1".to_string(),
          file_name: "ten-entries.csv".to_string(),
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
      "2".to_string(),
      "DESCRIBE table_1".to_string(),
      "provider=filesystem;uploadPath=containers/1/datasources/1;rootFilePath=./test_files/timeseries2/"
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
  async fn multi_file_describe_with_azure() {
    match process_upload(
      "3".to_string(),
      "DESCRIBE table_1; DESCRIBE table_2".to_string(),
      "provider=azure;uploadPath=containers/1/datasources/1;blobEndpoint=http://127.0.0.1:10000;accountName=devstoreaccount1;accountKey='Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';containerName=deep-lynx".to_string(),
      vec![
        FileMetadata {
          id: "1".to_string(),
          file_name: "ten-entries.csv".to_string(),
          file_path: "containers/1/datasources/1".to_string(),
        },
        FileMetadata {
          id: "2".to_string(),
          file_name: "ten-entries-2.csv".to_string(),
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
  async fn multi_file_describe_with_filesystem() {
    match process_upload(
      "4".to_string(),
      "DESCRIBE table_1; DESCRIBE table_2".to_string(),
      "provider=filesystem;uploadPath=containers/1/datasources/1;rootFilePath=./test_files/timeseries2/"
        .to_string(),
      vec![
        FileMetadata {
          id: "1".to_string(),
          file_name: "ten-entries.csv".to_string(),
          file_path: "containers/1/datasources/1".to_string(),
        },
        FileMetadata {
          id: "2".to_string(),
          file_name: "ten-entries-2.csv".to_string(),
          file_path: "containers/1/datasources/1".to_string(),
        },
      ],
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
      "5".to_string(),
      "SELECT * FROM table_1".to_string(),
      "provider=azure;uploadPath=containers/1/datasources/1;blobEndpoint=http://127.0.0.1:10000;accountName=devstoreaccount1;accountKey='Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';containerName=deep-lynx".to_string(),
      vec![
        FileMetadata {
          id: "1".to_string(),
          file_name: "ten-entries.csv".to_string(),
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
      "6".to_string(),
      "SELECT * FROM table_1".to_string(),
      "provider=filesystem;uploadPath=containers/1/datasources/1;rootFilePath=./test_files/timeseries2/"
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
