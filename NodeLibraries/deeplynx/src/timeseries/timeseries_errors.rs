use napi::Error;
use std::io;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum TimeseriesError {
  #[error("missing connection string")]
  MissingConnectionString,
  #[error("record not found")]
  NotFound,
  #[error("unwrap error {0}")]
  Unwrap(String),
  #[error("thread error {0}")]
  Thread(String),
  #[error("sqlx error {0}")]
  SqlX(#[from] sqlx::Error),
  #[error("invalid data or structure: {0}")]
  InvalidData(#[from] validator::ValidationErrors),
  #[error("invalid csv data or structure: {0}")]
  Csv(#[from] csv::Error),
  #[error("invalid csv data or structure: {0}")]
  CsvAsync(#[from] csv_async::Error),
  #[error("system IO error: {0}")]
  IO(#[from] std::io::Error),
  #[error("csv not valid : {0}")]
  CsvValidation(#[from] ValidationError),
  #[error("time parse error : {0}")]
  TimeParse(#[from] chrono::ParseError),
  #[error("napi error: {0}")]
  Napi(#[from] napi::Error),
  #[error("json parse error: {0}")]
  Json(#[from] serde_json::Error),
}

impl Into<napi::Error> for TimeseriesError {
  fn into(self) -> Error {
    napi::Error::new(napi::Status::GenericFailure, self.to_string())
  }
}

#[derive(Error, Debug)]
pub enum ValidationError {
  #[error("csv is missing any matching columns")]
  MissingColumns,
}

#[derive(Error, Debug)]
pub enum TestError {
  #[error("data error {0}")]
  DataError(#[from] TimeseriesError),
  #[error("sqlx error {0}")]
  SqlX(#[from] sqlx::Error),
  #[error("sqlx error {0}")]
  SqlXMigration(#[from] sqlx::migrate::MigrateError),
  #[error("system IO error: {0}")]
  IO(#[from] std::io::Error),
}
