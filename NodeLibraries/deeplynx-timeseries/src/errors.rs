use napi::Error;
use std::io;
use thiserror::Error;

// Project specific errors and wrappers of other libraries errors so we can always return ours but
// still be able to use ? notation
#[derive(Error, Debug)]
pub enum CoreError {
  #[error("yaml parsing error {0}")]
  YamlParsing(#[from] serde_yaml::Error),
  #[error("io error {0}")]
  IO(#[from] io::Error),
}

#[derive(Error, Debug)]
pub enum DataError {
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

impl Into<napi::Error> for DataError {
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
  #[error("core error {0}")]
  CoreError(#[from] CoreError),
  #[error("data error {0}")]
  DataError(#[from] DataError),
  #[error("sqlx error {0}")]
  SqlX(#[from] sqlx::Error),
  #[error("sqlx error {0}")]
  SqlXMigration(#[from] sqlx::migrate::MigrateError),
  #[error("system IO error: {0}")]
  IO(#[from] std::io::Error),
}
