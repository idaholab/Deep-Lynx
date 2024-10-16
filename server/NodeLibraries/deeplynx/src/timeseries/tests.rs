#[cfg(test)]
mod legacy_tests {
  
  
  use crate::timeseries::errors::{TestError, TimeseriesError};
  
  
  use sqlx::{FromRow, PgPool};

  #[derive(Debug, Clone, FromRow)]
  struct TableReturn {
    table_name: Option<String>,
    table_schema: Option<String>,
  }

  async fn setup(pool: &PgPool) -> Result<(), TestError> {
    let tables: Vec<TableReturn> = sqlx::query_as(
      " SELECT table_name, table_schema FROM information_schema.tables
                WHERE table_schema = 'buckets'",
    )
    .fetch_all(pool)
    .await?;

    for table in tables {
      let table_name = table
        .table_name
        .ok_or(TimeseriesError::Unwrap("table name unwrap".to_string()))?;

      let table_schema = table
        .table_schema
        .ok_or(TimeseriesError::Unwrap("table schema unwrap".to_string()))?;

      sqlx::query(format!("DROP TABLE IF EXISTS {table_schema}.\"{table_name}\" CASCADE").as_str())
        .execute(pool)
        .await?;
    }

    Ok(())
  }
}

#[cfg(test)]
mod query_tests {
  use crate::timeseries::{
    file_metadata::FileMetadata,
    query::{process_query, process_upload},
  };

  #[tokio::test]
  async fn describe_with_azure() {
    match process_upload(
      "1".to_string(),
      "DESCRIBE table_1".to_string(),
      "provider=azure_blob;uploadPath=containers/1/datasources/1;blobEndpoint=http://127.0.0.1:10000;accountName=devstoreaccount1;accountKey='Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';containerName=deep-lynx".to_string(),
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
      "provider=azure_blob;uploadPath=containers/1/datasources/1;blobEndpoint=http://127.0.0.1:10000;accountName=devstoreaccount1;accountKey='Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';containerName=deep-lynx".to_string(),
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
      "provider=azure_blob;uploadPath=containers/1/datasources/1;blobEndpoint=http://127.0.0.1:10000;accountName=devstoreaccount1;accountKey='Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';containerName=deep-lynx".to_string(),
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
