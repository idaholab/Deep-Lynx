#[cfg(test)]
mod main_tests {
  use crate::config::Configuration;
  use crate::timeseries::data_types::LegacyDataTypes;
  use crate::timeseries::repository::BucketRepository;
  use crate::timeseries::timeseries_errors::{TestError, TimeseriesError};
  use serial_test::serial;
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

  #[serial]
  #[tokio::test]
  async fn legacy_csv_inference() -> Result<(), TestError> {
    let file = std::fs::File::open("./test_files/timeseries/inference.csv")?;
    let results = BucketRepository::infer_legacy_schema(file)?;

    assert_eq!(results.len(), 9);
    assert_eq!(results[0].data_type, String::from(LegacyDataTypes::String));
    assert_eq!(results[1].data_type, String::from(LegacyDataTypes::String));
    assert_eq!(results[2].data_type, String::from(LegacyDataTypes::Number));
    assert_eq!(
      results[3].data_type,
      String::from(LegacyDataTypes::Number64)
    );
    assert_eq!(results[4].data_type, String::from(LegacyDataTypes::Float64));
    assert_eq!(results[5].data_type, String::from(LegacyDataTypes::Float64));
    assert_eq!(results[6].data_type, String::from(LegacyDataTypes::Json));
    assert_eq!(results[7].data_type, String::from(LegacyDataTypes::Boolean));
    assert_eq!(results[8].data_type, String::from(LegacyDataTypes::Boolean));
    Ok(())
  }
}
