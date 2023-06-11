#[cfg(test)]
mod main_tests {
  use crate::config::Configuration;
  use crate::data_types::DataTypes;
  use crate::errors::{DataError, TestError};
  use crate::{ingestion, BucketColumn, BucketRepository, ChangeBucketPayload, QueryOption};
  use bytes::Buf;
  use futures::StreamExt;
  use serial_test::serial;
  use sqlx::{FromRow, PgPool};
  use std::future;
  use std::io::Write;
  use tokio::fs::File;
  use validator::HasLen;

  #[derive(Debug, Clone, FromRow)]
  struct ColumnReturn {
    column_name: Option<String>,
    udt_name: Option<String>, // data type
    numeric_precision: Option<i32>,
    numeric_scale: Option<i32>,
    character_maximum_length: Option<i32>,
  }

  #[derive(Debug, Clone, FromRow)]
  struct TableReturn {
    table_name: Option<String>,
    table_schema: Option<String>,
  }

  #[tokio::test]
  #[serial]
  async fn all_types_bucket_insertion() -> Result<(), TestError> {
    let mut config = Configuration::new(None)?;
    // for this test set the max to 2 so we can simulate data tables not fitting and overflowing
    config.max_columns = Some(2);

    let pool = PgPool::connect(config.db_connection_string.as_str()).await?;
    setup(&pool).await?;

    let mut bucket_repo = BucketRepository::new(config).await?;

    let bucket = bucket_repo
      .create_bucket(ChangeBucketPayload {
        name: Some("Test".to_string()), // names are not unique so this won't be an issue
        columns: vec![
          BucketColumn {
            name: "bool".to_string(),
            short_name: "bool".to_string(),
            data_type: DataTypes::Bool,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "char".to_string(),
            short_name: "char".to_string(),
            data_type: DataTypes::Char,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "smallint".to_string(),
            short_name: "smallint".to_string(),
            data_type: DataTypes::SmallInt,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "int".to_string(),
            short_name: "int".to_string(),
            data_type: DataTypes::Int,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "bigint".to_string(),
            short_name: "bigint".to_string(),
            data_type: DataTypes::BigInt,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "real".to_string(),
            short_name: "real".to_string(),
            data_type: DataTypes::Real,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "double".to_string(),
            short_name: "double".to_string(),
            data_type: DataTypes::Double,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "numeric".to_string(),
            short_name: "numeric".to_string(),
            data_type: DataTypes::Numeric(0, 0),
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "numeric2".to_string(),
            short_name: "numeric2".to_string(),
            data_type: DataTypes::Numeric(3, 2),
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "varchar".to_string(),
            short_name: "varchar".to_string(),
            data_type: DataTypes::Varchar(255),
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "varchar2".to_string(),
            short_name: "varchar2".to_string(),
            data_type: DataTypes::Varchar(1),
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "text".to_string(),
            short_name: "text".to_string(),
            data_type: DataTypes::Text,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "bytea".to_string(),
            short_name: "bytea".to_string(),
            data_type: DataTypes::Bytea,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "timestamptz".to_string(),
            short_name: "timestamptz".to_string(),
            data_type: DataTypes::TimestampWithTimezone,
            column_assignment: None,
            format_string: Some("%Y-%m-%d %H:%M:%S%#z".to_string()),
            id: None,
          },
          BucketColumn {
            name: "timestamp".to_string(),
            short_name: "timestamp".to_string(),
            data_type: DataTypes::Timestamp,
            column_assignment: None,
            format_string: Some("%Y-%m-%d %H:%M:%S".to_string()),
            id: None,
          },
          BucketColumn {
            name: "date".to_string(),
            short_name: "date".to_string(),
            data_type: DataTypes::Date,
            column_assignment: None,
            format_string: Some("%Y-%m-%d".to_string()),
            id: None,
          },
          BucketColumn {
            name: "time".to_string(),
            short_name: "time".to_string(),
            data_type: DataTypes::Time,
            column_assignment: None,
            format_string: Some("%H:%M:%S".to_string()),
            id: None,
          },
          BucketColumn {
            name: "uuid".to_string(),
            short_name: "uuid".to_string(),
            data_type: DataTypes::Uuid,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "jsonb".to_string(),
            short_name: "jsonb".to_string(),
            data_type: DataTypes::Jsonb,
            column_assignment: None,
            format_string: None,
            id: None,
          },
        ],
      })
      .await?;

    // let's make sure we have a single table
    let tables: Vec<TableReturn> = sqlx::query_as(
      " SELECT table_name, table_schema FROM information_schema.tables
                WHERE  table_schema = 'buckets'
                AND table_name <> 'buckets'
                AND table_name <> '_sqlx_migrations'
                AND table_name = $1",
    )
    .bind(bucket.data_table_assignment.clone().unwrap())
    .fetch_all(&pool)
    .await?;

    // should have just one table for now
    assert_eq!(tables.length(), 1);
    assert_eq!(tables[0].table_name, bucket.data_table_assignment);

    // now to verify we built the table correctly
    let columns: Vec<ColumnReturn> = sqlx::query_as(
            "SELECT  column_name,udt_name, numeric_precision, numeric_scale, character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'buckets' AND  table_name = $1 AND column_name <> '_inserted_at' AND column_name <> '_bucket_id'",

        )
            .bind(bucket.data_table_assignment.clone().unwrap())
            .fetch_all(&pool)
            .await?;

    for column in columns {
      let name = column
        .column_name
        .ok_or(DataError::Unwrap("column name unwrap".to_string()))?;
      let data_type = column
        .udt_name
        .ok_or(DataError::Unwrap("udt type unwrap".to_string()))?;
      let mut data_type = DataTypes::from(data_type);

      // if we're a certain data type we need to modify ourselves slightly to match the db's
      // version
      match data_type {
        DataTypes::Numeric(_, _) => {
          if name == "numeric2" {
            data_type = DataTypes::Numeric(
              column.numeric_precision.unwrap(),
              column.numeric_scale.unwrap(),
            )
          }
        }
        DataTypes::Varchar(_) => {
          data_type = DataTypes::Varchar(column.character_maximum_length.unwrap())
        }
        _ => {}
      }

      // now go through the bucket and make sure we've got a matching data type
      let bucket_column = bucket.structure.iter().find(|b| b.data_type == data_type);
      assert!(bucket_column.is_some())
    }

    // now let's do our ingestion tests
    let file = File::open("./test_files/sparse_ingestion_test.csv").await?;
    ingestion::ingest_csv(pool.clone(), file, bucket.id).await?;

    let file = File::open("./test_files/non_matching_csv").await?;
    let result = ingestion::ingest_csv(pool.clone(), file, bucket.id).await;
    assert!(result.is_err());

    let file = File::open("./test_files/full_ingestion_test.csv").await?;
    ingestion::ingest_csv(pool.clone(), file, bucket.id).await?;

    // now let's make sure our async ingestion pathway works
    let buff = std::fs::read("./test_files/sparse_ingestion_test.csv")?;

    bucket_repo.begin_csv_ingestion(bucket.id).await?;
    bucket_repo.read_data(buff)?;
    bucket_repo.complete_ingestion().await?;

    let mut out_file = std::fs::File::create("./test_files/out.csv")?;

    let download_stream = bucket_repo
      .download_data_simple(
        bucket.id,
        vec![QueryOption {
          primary_key: Some("timestamp".to_string()),
          secondary_key: None,
          primary_start: Some("2004-10-19 10:23:53".to_string()),
          primary_end: None,
          secondary_start: None,
          secondary_end: None,
        }],
      )
      .await?;

    download_stream
      .for_each(|chunk| {
        match chunk {
          Ok(chunk) => out_file.write_all(chunk.chunk()).unwrap(),
          Err(e) => {
            panic!("{}", e);
          }
        };

        future::ready(())
      })
      .await;

    // check that the file size is non-null
    let meta = out_file.metadata()?;
    assert!(meta.len() > 0);

    std::fs::remove_file("./test_files/out.csv")?;
    bucket_repo.delete_bucket(bucket.id).await?;
    tear_down(&pool).await
  }

  #[serial]
  #[tokio::test]
  async fn bucket_insertions() -> Result<(), TestError> {
    let mut config = Configuration::new(None)?;
    // for this test set the max to 2 so we can simulate data tables not fitting and overflowing
    config.max_columns = Some(2);

    let pool = PgPool::connect(config.db_connection_string.as_str()).await?;
    setup(&pool).await?;

    let bucket_repo = BucketRepository::new(config).await?;

    // create one that does a partial match
    bucket_repo
      .create_bucket(ChangeBucketPayload {
        name: Some("Test".to_string()), // names are not unique so this won't be an issue
        columns: vec![BucketColumn {
          name: "text".to_string(),
          short_name: "text".to_string(),
          data_type: DataTypes::Text,
          column_assignment: None,
          format_string: None,
          id: None,
        }],
      })
      .await?;

    let bucket = bucket_repo
      .create_bucket(ChangeBucketPayload {
        name: Some("Test".to_string()), // names are not unique so this won't be an issue
        columns: vec![
          BucketColumn {
            name: "Test".to_string(),
            short_name: "Test".to_string(),
            data_type: DataTypes::Int,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "bigint".to_string(),
            short_name: "bigint".to_string(),
            data_type: DataTypes::BigInt,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "text".to_string(),
            short_name: "text".to_string(),
            data_type: DataTypes::Text,
            column_assignment: None,
            format_string: None,
            id: None,
          },
        ],
      })
      .await?;

    // create one that matches but will force a new table
    bucket_repo
      .create_bucket(ChangeBucketPayload {
        name: Some("Test".to_string()), // names are not unique so this won't be an issue
        columns: vec![
          BucketColumn {
            name: "Test".to_string(),
            short_name: "Test".to_string(),
            data_type: DataTypes::Int,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "bigint".to_string(),
            short_name: "bigint".to_string(),
            data_type: DataTypes::BigInt,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "text".to_string(),
            short_name: "text".to_string(),
            data_type: DataTypes::Text,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "text2".to_string(),
            short_name: "text2".to_string(),
            data_type: DataTypes::Text,
            column_assignment: None,
            format_string: None,
            id: None,
          },
        ],
      })
      .await?;

    // let's make sure we have a single table
    let tables: Vec<TableReturn> = sqlx::query_as(
      " SELECT table_name, table_schema FROM information_schema.tables
                WHERE  table_schema = 'buckets'
                AND table_name <> 'buckets'
                AND table_name <> '_sqlx_migrations'",
    )
    .fetch_all(&pool)
    .await?;

    // should have just one table for now
    assert_eq!(tables.length(), 3);

    // lets do this a few more times
    for _ in 0..10 {
      let bucket = bucket_repo
        .create_bucket(ChangeBucketPayload {
          name: Some("Test".to_string()), // names are not unique so this won't be an issue
          columns: vec![
            BucketColumn {
              name: "int".to_string(),
              short_name: "int".to_string(),
              data_type: DataTypes::Int,
              column_assignment: None,
              format_string: None,
              id: None,
            },
            BucketColumn {
              name: "bigint".to_string(),
              short_name: "bigint".to_string(),
              data_type: DataTypes::BigInt,
              column_assignment: None,
              format_string: None,
              id: None,
            },
          ],
        })
        .await?;

      // let's make sure we have a single table
      let tables: Vec<TableReturn> = sqlx::query_as(
        " SELECT table_name, table_schema FROM information_schema.tables
                WHERE  table_schema = 'buckets'
                AND table_name <> 'buckets'
                AND table_name <> '_sqlx_migrations'",
      )
      .fetch_all(&pool)
      .await?;

      // should have just one table for now even with multiple buckets
      assert_eq!(tables.length(), 3);

      for structure in bucket.structure.0 {
        assert!(structure.column_assignment.is_some());
      }
    }

    // add a new epo bucket who's columns would overflow the current data table
    bucket_repo
      .create_bucket(ChangeBucketPayload {
        name: Some("Test".to_string()), // names are not unique so this won't be an issue
        columns: vec![
          BucketColumn {
            name: "Test".to_string(),
            short_name: "Test".to_string(),
            data_type: DataTypes::Int,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "Test2".to_string(),
            short_name: "Test2".to_string(),
            data_type: DataTypes::Text,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "Test3".to_string(),
            short_name: "Test3".to_string(),
            data_type: DataTypes::Text,
            column_assignment: None,
            format_string: None,
            id: None,
          },
        ],
      })
      .await?;

    let tables: Vec<TableReturn> = sqlx::query_as(
      " SELECT table_name, table_schema FROM information_schema.tables
                WHERE  table_schema = 'buckets'
                AND table_name <> 'buckets'
                AND table_name <> '_sqlx_migrations'",
    )
    .fetch_all(&pool)
    .await?;

    // should have two tables now
    assert_eq!(tables.length(), 3);

    bucket_repo.delete_bucket(bucket.id).await?;
    tear_down(&pool).await
  }

  #[serial]
  #[tokio::test]
  async fn bucket_update_insertion() -> Result<(), TestError> {
    let mut config = Configuration::new(None)?;
    // for this test set the max to 2 so we can simulate data tables not fitting and overflowing
    config.max_columns = Some(2);

    let pool = PgPool::connect(config.db_connection_string.as_str()).await?;
    setup(&pool).await?;

    let bucket_repo = BucketRepository::new(config).await?;

    let bucket = bucket_repo
      .create_bucket(ChangeBucketPayload {
        name: Some("Test".to_string()), // names are not unique so this won't be an issue
        columns: vec![
          BucketColumn {
            name: "int".to_string(),
            short_name: "int".to_string(),
            data_type: DataTypes::Int,
            column_assignment: None,
            format_string: None,
            id: None,
          },
          BucketColumn {
            name: "second".to_string(),
            short_name: "second".to_string(),
            data_type: DataTypes::Numeric(0, 0),
            column_assignment: None,
            format_string: None,
            id: None,
          },
        ],
      })
      .await?;

    // let's make sure we have a single table
    let tables: Vec<TableReturn> = sqlx::query_as(
      " SELECT table_name, table_schema FROM information_schema.tables
                WHERE  table_schema = 'buckets'
                AND table_name <> 'buckets'
                AND table_name <> '_sqlx_migrations'
                AND table_name = $1",
    )
    .bind(bucket.data_table_assignment.clone().unwrap())
    .fetch_all(&pool)
    .await?;

    // should have just one table for now
    assert_eq!(tables.length(), 1);
    assert_eq!(tables[0].table_name, bucket.data_table_assignment);

    // now to verify we built the table correctly
    let columns: Vec<ColumnReturn> = sqlx::query_as(
            "SELECT  column_name,udt_name, numeric_precision, numeric_scale, character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'public' AND  table_name = $1 AND column_name <> '_inserted_at' AND column_name <> '_bucket_id'",

        )
            .bind(bucket.data_table_assignment.clone().unwrap())
            .fetch_all(&pool)
            .await?;

    for column in columns {
      let name = column
        .column_name
        .ok_or(DataError::Unwrap("column name unwrap".to_string()))?;
      let data_type = column
        .udt_name
        .ok_or(DataError::Unwrap("udt type unwrap".to_string()))?;
      let mut data_type = DataTypes::from(data_type);

      // if we're a certain data type we need to modify ourselves slightly to match the db's
      // version
      match data_type {
        DataTypes::Numeric(_, _) => {
          if name == "numeric2" {
            data_type = DataTypes::Numeric(
              column.numeric_precision.unwrap(),
              column.numeric_scale.unwrap(),
            )
          }
        }
        DataTypes::Varchar(_) => {
          data_type = DataTypes::Varchar(column.character_maximum_length.unwrap())
        }
        _ => {}
      }

      // now go through the bucket and make sure we've got a matching data type
      let bucket_column = bucket.structure.iter().find(|b| b.data_type == data_type);
      assert!(bucket_column.is_some())
    }

    let mut column = bucket
      .structure
      .iter()
      .find(|bc| bc.name.as_str() == "int")
      .cloned()
      .ok_or(DataError::Unwrap("column finding unwrap".to_string()))?;

    column.name = "updated".to_string();
    let columns: Vec<BucketColumn> = vec![
      column,
      BucketColumn {
        name: "new".to_string(),
        short_name: "new".to_string(),
        data_type: DataTypes::Text,
        column_assignment: None,
        format_string: None,
        id: None,
      },
    ];

    let bucket = bucket_repo
      .update_bucket(
        bucket.id,
        ChangeBucketPayload {
          name: Some("Test".to_string()), // names are not unique so this won't be an issue
          columns,
        },
      )
      .await?;

    let columns: Vec<ColumnReturn> = sqlx::query_as(
            "SELECT  column_name,udt_name, numeric_precision, numeric_scale, character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'buckets' AND  table_name = $1 AND column_name <> '_inserted_at' AND column_name <> '_bucket_id'",
        )
            .bind(bucket.data_table_assignment.unwrap())
            .fetch_all(&pool)
            .await?;

    let mut matching_columns = 0;
    for column in columns {
      let name = column
        .column_name
        .ok_or(DataError::Unwrap("column name unwrap".to_string()))?;
      let data_type = column
        .udt_name
        .ok_or(DataError::Unwrap("udt type unwrap".to_string()))?;
      let mut data_type = DataTypes::from(data_type);

      // if we're a certain data type we need to modify ourselves slightly to match the db's
      // version
      match data_type {
        DataTypes::Numeric(_, _) => {
          if name == "numeric2" {
            data_type = DataTypes::Numeric(
              column.numeric_precision.unwrap(),
              column.numeric_scale.unwrap(),
            )
          }
        }
        DataTypes::Varchar(_) => {
          data_type = DataTypes::Varchar(column.character_maximum_length.unwrap())
        }
        _ => {}
      }

      // now go through the bucket and make sure we've got a matching data type
      match bucket.structure.iter().find(|b| b.data_type == data_type) {
        None => {}
        Some(_) => matching_columns += 1,
      }
    }

    assert_eq!(matching_columns, bucket.structure.len());
    bucket_repo.delete_bucket(bucket.id).await?;
    tear_down(&pool).await
  }

  #[serial]
  #[tokio::test]
  async fn simple_bucket_update() -> Result<(), TestError> {
    let mut config = Configuration::new(None)?;
    // for this test set the max to 2 so we can simulate data tables not fitting and overflowing
    config.max_columns = Some(2);

    let pool = PgPool::connect(config.db_connection_string.as_str()).await?;
    setup(&pool).await?;

    let bucket_repo = BucketRepository::new(config).await?;

    let bucket = bucket_repo
      .create_bucket(ChangeBucketPayload {
        name: Some("Test Bucket".to_string()), // names are not unique so this won't be an issue
        columns: vec![BucketColumn {
          name: "int".to_string(),
          short_name: "int".to_string(),
          data_type: DataTypes::Int,
          column_assignment: None,
          format_string: None,
          id: None,
        }],
      })
      .await?;

    // let's make sure we have a single table
    let tables: Vec<TableReturn> = sqlx::query_as(
      " SELECT table_name, table_schema FROM information_schema.tables
                WHERE  table_schema = 'buckets'
                AND table_name <> 'buckets'
                AND table_name <> '_sqlx_migrations'
                AND table_name = $1",
    )
    .bind(bucket.data_table_assignment.clone().unwrap())
    .fetch_all(&pool)
    .await?;

    // should have just one table for now
    assert_eq!(tables.length(), 1);
    assert_eq!(tables[0].table_name, bucket.data_table_assignment);

    // now to verify we built the table correctly
    let columns: Vec<ColumnReturn> = sqlx::query_as(
            "SELECT  column_name,udt_name, numeric_precision, numeric_scale, character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'public' AND  table_name = $1 AND column_name <> '_inserted_at' AND column_name <> '_bucket_id'",

        )
            .bind(bucket.data_table_assignment.clone().unwrap())
            .fetch_all(&pool)
            .await?;

    for column in columns {
      let name = column
        .column_name
        .ok_or(DataError::Unwrap("column name unwrap".to_string()))?;
      let data_type = column
        .udt_name
        .ok_or(DataError::Unwrap("udt type unwrap".to_string()))?;
      let mut data_type = DataTypes::from(data_type);

      // if we're a certain data type we need to modify ourselves slightly to match the db's
      // version
      match data_type {
        DataTypes::Numeric(_, _) => {
          if name == "numeric2" {
            data_type = DataTypes::Numeric(
              column.numeric_precision.unwrap(),
              column.numeric_scale.unwrap(),
            )
          }
        }
        DataTypes::Varchar(_) => {
          data_type = DataTypes::Varchar(column.character_maximum_length.unwrap())
        }
        _ => {}
      }

      // now go through the bucket and make sure we've got a matching data type
      let bucket_column = bucket.structure.iter().find(|b| b.data_type == data_type);
      assert!(bucket_column.is_some())
    }

    let columns: Vec<BucketColumn> = vec![BucketColumn {
      name: "test column".to_string(),
      short_name: "test".to_string(),
      data_type: DataTypes::Text,
      column_assignment: None,
      format_string: None,
      id: None,
    }];

    let bucket = bucket_repo
      .update_bucket(
        bucket.id,
        ChangeBucketPayload {
          name: Some("New Bucket".to_string()), // names are not unique so this won't be an issue
          columns,
        },
      )
      .await?;

    let columns: Vec<ColumnReturn> = sqlx::query_as(
            "SELECT  column_name,udt_name, numeric_precision, numeric_scale, character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'buckets' AND  table_name = $1 AND column_name <> '_inserted_at' AND column_name <> '_bucket_id'",
        )
            .bind(bucket.data_table_assignment.unwrap())
            .fetch_all(&pool)
            .await?;

    let mut matching_columns = 0;
    for column in columns {
      let name = column
        .column_name
        .ok_or(DataError::Unwrap("column name unwrap".to_string()))?;
      let data_type = column
        .udt_name
        .ok_or(DataError::Unwrap("udt type unwrap".to_string()))?;
      let mut data_type = DataTypes::from(data_type);

      // if we're a certain data type we need to modify ourselves slightly to match the db's
      // version
      match data_type {
        DataTypes::Numeric(_, _) => {
          if name == "numeric2" {
            data_type = DataTypes::Numeric(
              column.numeric_precision.unwrap(),
              column.numeric_scale.unwrap(),
            )
          }
        }
        DataTypes::Varchar(_) => {
          data_type = DataTypes::Varchar(column.character_maximum_length.unwrap())
        }
        _ => {}
      }

      // now go through the bucket and make sure we've got a matching data type
      match bucket.structure.iter().find(|b| b.data_type == data_type) {
        None => {}
        Some(_) => matching_columns += 1,
      }
    }

    assert_eq!(matching_columns, bucket.structure.len());
    bucket_repo.delete_bucket(bucket.id).await?;
    tear_down(&pool).await
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
        .ok_or(DataError::Unwrap("table name unwrap".to_string()))?;

      let table_schema = table
        .table_schema
        .ok_or(DataError::Unwrap("table schema unwrap".to_string()))?;

      sqlx::query(format!("DROP TABLE IF EXISTS {table_schema}.\"{table_name}\" CASCADE").as_str())
        .execute(pool)
        .await?;
    }

    Ok(())
  }

  async fn tear_down(pool: &PgPool) -> Result<(), TestError> {
    let tables: Vec<TableReturn> = sqlx::query_as(
      " SELECT table_name,table_schema FROM information_schema.tables
                WHERE table_schema = 'buckets'",
    )
    .fetch_all(pool)
    .await?;

    for table in tables {
      let table_name = table
        .table_name
        .ok_or(DataError::Unwrap("table name unwrap".to_string()))?;

      let table_schema = table
        .table_schema
        .ok_or(DataError::Unwrap("table schema unwrap".to_string()))?;

      sqlx::query(format!("DROP TABLE IF EXISTS {table_schema}.\"{table_name}\" CASCADE").as_str())
        .execute(pool)
        .await?;
    }

    Ok(())
  }
}
