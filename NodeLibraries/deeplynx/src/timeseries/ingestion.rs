use crate::timeseries::data_types::LegacyDataTypes;
use crate::timeseries::repository::LegacyTimeseriesColumn;
use crate::timeseries::timeseries_errors::{TimeseriesError, ValidationError};
use chrono::NaiveDateTime;
use futures::StreamExt;
use sqlx::{Pool, Postgres};
use std::io::Read;

/// ingest_csv_legacy allows us to use the same paradigm as all other bucket ingestion patterns here
/// to ingest csv data formatted for the original DeepLynx timeseries integration
pub async fn ingest_csv_legacy<T: Read>(
  db: Pool<Postgres>,
  reader: T,
  data_source_id: String,
  columns: Vec<LegacyTimeseriesColumn>,
) -> Result<(), TimeseriesError> {
  let mut csv_reader = csv::ReaderBuilder::new().flexible(true).from_reader(reader);
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
  let headers = csv_reader.headers()?;
  for (i, header) in headers.iter().enumerate() {
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
    return Err(TimeseriesError::CsvValidation(
      ValidationError::MissingColumns,
    ));
  }

  let column_names: Vec<String> = positions
    .clone()
    .iter()
    .map(|pos| format!("\"{}\"", pos.column_name.clone()))
    .collect();

  let mut connection = db.acquire().await?;

  let mut copier = connection
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
  while let Some(record) = csv_reader.records().next() {
    let record = record?;
    let mut new_record: Vec<String> = vec![];

    for position in &positions {
      let value = record
        .get(position.index)
        .ok_or(TimeseriesError::Unwrap("csv record field".to_string()))?;

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
