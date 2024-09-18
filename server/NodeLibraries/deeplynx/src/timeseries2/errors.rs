use napi::Status;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum Timeseries2Error {
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

impl From<Timeseries2Error> for napi::Error {
  fn from(value: Timeseries2Error) -> Self {
    napi::Error::new(Status::GenericFailure, format!("{:?}", value))
  }
}
