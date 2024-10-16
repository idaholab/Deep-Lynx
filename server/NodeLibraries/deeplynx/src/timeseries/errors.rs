use napi::Status;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum TimeseriesError {
  #[error("missing connection string")]
  MissingConnectionString,
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
  StdIO(#[from] std::io::Error),
  #[error("csv not valid : {0}")]
  CsvValidation(#[from] ValidationError),
  #[error("time parse error : {0}")]
  TimeParse(#[from] chrono::ParseError),
  #[error("napi error: {0}")]
  Napi(#[from] napi::Error),
  #[error("json parse error: {0}")]
  Json(#[from] serde_json::Error),
  #[error("timeseries query error {0}")]
  Query(#[from] QueryError),
}

impl From<TimeseriesError> for napi::Error {
  fn from(value: TimeseriesError) -> Self {
    napi::Error::new(Status::GenericFailure, format!("{:?}", value))
  }
}

#[derive(Error, Debug)]
pub enum ValidationError {
  #[error("csv is missing any matching columns")]
  MissingColumns,
}

#[derive(Error, Debug)]
pub enum QueryError {
  #[error(transparent)]
  Napi(#[from] napi::Error),
  #[error("datafusion error {0}")]
  DataFusion(#[from] datafusion::error::DataFusionError),
  #[error("connection string error {0}")]
  ConnectionString(#[from] connection_string::Error),
  #[error("received null required parameter in request {msg}")]
  ReceivedNullDataInRequest { msg: String },
  #[error("incorrect data provided in request {0}")]
  BadData(String),
  #[error("azure builder error {0}")]
  AzureBuilder(#[from] object_store::Error),
  #[error("azure blob storage sdk error {0}")]
  AzureSDK(#[from] azure_storage::Error),
  #[error("serde json error {0}")]
  Json(#[from] serde_json::Error),
  #[error("dotenvy error {0}")]
  DotEnvy(#[from] dotenvy::Error),
  #[error("std::env variable error {0}")]
  StdEnv(#[from] std::env::VarError),
  #[error("std::io error {0}")]
  StdIO(#[from] std::io::Error),
  #[error("url parse error {0}")]
  ParseURL(#[from] url::ParseError),
  #[error("invalid file metadata {0}")]
  InvalidFileMetadata(String),
  #[error("not unimplemented yet error {0}")]
  ToDo(String),
}

impl From<QueryError> for napi::Error {
  fn from(value: QueryError) -> Self {
    napi::Error::new(Status::GenericFailure, format!("{:?}", value))
  }
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
