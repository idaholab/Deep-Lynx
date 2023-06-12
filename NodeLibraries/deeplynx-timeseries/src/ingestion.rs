use crate::data_types::{DataTypes, LegacyDataTypes};
use crate::errors::{DataError, ValidationError};
use crate::{Bucket, LegacyTimeseriesColumn};
use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime};
use futures::StreamExt;
use sqlx::{Pool, Postgres};
use tokio::io::AsyncRead;

/// `ingest_csv` takes a readable stream of CSV formatted data and attempts to ingest that
/// data into the given bucket by ID. Note that if your CSV data does not implement all columns
/// of your bucket, only the columns you've included in the csv will be ingested and no error
/// given. If your CSV data has too many columns, only those columns defined in the bucket will
/// be ingested, with no error given. If you have columns with duplicate names, only the first
/// instance of that name will be ingested if it doesnt error.
pub async fn ingest_csv<T: AsyncRead + Send + Unpin>(
  db: Pool<Postgres>,
  reader: T,
  bucket_id: i32,
) -> Result<(), DataError> {
  // fetch the bucket first
  let bucket: Bucket = sqlx::query_as("SELECT * FROM buckets WHERE id = $1")
    .bind(bucket_id)
    .fetch_optional(&db)
    .await?
    .ok_or(DataError::NotFound)?;

  let mut csv_reader = csv_async::AsyncReaderBuilder::new()
    .flexible(false)
    .create_reader(reader);
  // let's fetch the headers - also a quick way to check if we're actually dealing with a csv
  // they should stay in the order they are in the CSV - index, csv name, column name
  #[derive(Clone)]
  struct Position {
    index: usize,
    column_name: String,
    data_type: DataTypes,
    format_string: Option<String>,
  }

  let mut positions: Vec<Position> = vec![];
  for (i, header) in csv_reader.headers().await?.iter().enumerate() {
    // check to see if that header exists in the bucket definition, if it does, record its
    // spot and name
    match bucket
      .structure
      .iter()
      .find(|bc| bc.name.as_str() == header)
    {
      None => {}
      Some(bc) => positions.push(Position {
        index: i,
        column_name: bc.column_assignment.clone().ok_or(DataError::Unwrap(
          "column assignment not present".to_string(),
        ))?,
        data_type: bc.data_type.clone(),
        format_string: bc.format_string.clone(),
      }),
    }
  }

  if positions.is_empty() {
    return Err(DataError::CsvValidation(ValidationError::MissingColumns));
  }

  let column_names: Vec<String> = positions
    .clone()
    .iter()
    .map(|pos| format!("\"{}\"", pos.column_name.clone()))
    .collect();

  let mut copier = db
        .copy_in_raw(
            format!(
                "COPY buckets.\"{}\"({},_bucket_id) FROM STDIN WITH (FORMAT csv, HEADER FALSE, DELIMITER \",\")",
                bucket
                    .data_table_assignment
                    .ok_or(DataError::Unwrap("table name from bucket".to_string()))?,
                column_names.join(",")
            )
                .as_str(),
        )
        .await?;

  // in order to append the bucket_id we have to actually parse the csv row per row and send
  // it into the copier - it's really not that slow since the underlying async reader has is
  // buffered
  while let Some(record) = csv_reader.records().next().await {
    let record = record?;
    let mut new_record: Vec<String> = vec![];

    for position in &positions {
      let value = record.get(position.index).ok_or(DataError::Unwrap(format!(
        "csv record field: {}, {:?}",
        position.index, record
      )))?;

      match position.data_type {
        DataTypes::TimestampWithTimezone => {
          let format_string = match position.format_string.clone() {
            None => "%Y-%m-%d %H:%M:%S%:::z".to_string(),
            Some(s) => s,
          };

          let timestamptz = DateTime::parse_from_str(value, format_string.as_str())?;
          new_record.push(timestamptz.to_string())
        }
        DataTypes::Timestamp => {
          let format_string = match position.format_string.clone() {
            None => "%Y-%m-%d %H:%M:%S".to_string(),
            Some(s) => s,
          };

          let timestamp = NaiveDateTime::parse_from_str(value, format_string.as_str())?;
          new_record.push(timestamp.to_string())
        }
        DataTypes::Date => {
          let format_string = match position.format_string.clone() {
            None => "%Y-%m-%d".to_string(),
            Some(s) => s,
          };

          let date = NaiveDate::parse_from_str(value, format_string.as_str())?;
          new_record.push(date.to_string())
        }
        DataTypes::Time => {
          let format_string = match position.format_string.clone() {
            None => "%H:%M:%S".to_string(),
            Some(s) => s,
          };

          let time = NaiveTime::parse_from_str(value, format_string.as_str())?;
          new_record.push(time.to_string())
        }
        _ => new_record.push(value.to_string()),
      };
    }

    new_record.push(format!("{bucket_id}"));
    copier
      .send([new_record.join(",").as_bytes(), "\n".as_bytes()].concat())
      .await?;
  }

  copier.finish().await?;
  Ok(())
}

/// ingest_csv_legacy allows us to use the same paradigm as all other bucket ingestion patterns here
/// to ingest csv data formatted for the original DeepLynx timeseries integration
pub async fn ingest_csv_legacy<T: AsyncRead + Send + Unpin>(
  db: Pool<Postgres>,
  reader: T,
  data_source_id: String,
  columns: Vec<LegacyTimeseriesColumn>,
) -> Result<(), DataError> {
  let mut csv_reader = csv_async::AsyncReaderBuilder::new()
    .flexible(true)
    .create_reader(reader);
  // let's fetch the headers - also a quick way to check if we're actually dealing with a csv
  // they should stay in the order they are in the CSV - index, csv name, column name
  #[derive(Clone)]
  struct Position {
    index: usize,
    column_name: String,
    data_type: LegacyDataTypes,
    format_string: Option<String>,
  }

  let mut positions: Vec<Position> = vec![];
  for (i, header) in csv_reader.headers().await?.iter().enumerate() {
    // check to see if that header exists in the bucket definition, if it does, record its
    // spot and name
    match columns
      .iter()
      .find(|bc| bc.property_name.as_str() == header)
    {
      None => {}
      Some(bc) => positions.push(Position {
        index: i,
        column_name: bc.column_name.clone(),
        data_type: bc.data_type.clone().into(),
        format_string: bc.date_conversion_format_string.clone(),
      }),
    }
  }

  if positions.is_empty() {
    return Err(DataError::CsvValidation(ValidationError::MissingColumns));
  }

  let column_names: Vec<String> = positions
    .clone()
    .iter()
    .map(|pos| format!("\"{}\"", pos.column_name.clone()))
    .collect();

  let mut copier = db
    .copy_in_raw(
      format!(
        "COPY y_{}({}) FROM STDIN WITH (FORMAT csv, HEADER FALSE, DELIMITER \",\")",
        data_source_id,
        column_names.join(",")
      )
      .as_str(),
    )
    .await?;

  // in order to append the bucket_id we have to actually parse the csv row per row and send
  // it into the copier - it's really not that slow since the underlying async reader has is
  // buffered
  while let Some(record) = csv_reader.records().next().await {
    let record = record?;
    let mut new_record: Vec<String> = vec![];

    for position in &positions {
      let value = record
        .get(position.index)
        .ok_or(DataError::Unwrap("csv record field".to_string()))?;

      match position.data_type {
        LegacyDataTypes::Date => {
          let format_string = match position.format_string.clone() {
            None => "%Y-%m-%d %H:%M:%S".to_string(),
            Some(s) => s,
          };

          let timestamp = NaiveDateTime::parse_from_str(value, format_string.as_str())?;
          new_record.push(timestamp.to_string())
        }
        _ => new_record.push(value.to_string()),
      };
    }

    copier
      .send([new_record.join(",").as_bytes(), "\n".as_bytes()].concat())
      .await?;
  }

  copier.finish().await?;
  Ok(())
}
