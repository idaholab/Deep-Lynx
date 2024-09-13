use thiserror::Error;

#[derive(Error, Debug)]
pub enum Timeseries2Error {
  #[error("napi error {0}")]
  Napi(#[from] napi::Error),
  #[error("datafusion error {0}")]
  DataFusion(#[from] datafusion::error::DataFusionError),
  #[error("received null required parameter in request {msg}")]
  ReceivedNullDataInRequest { msg: String },
  #[error("incorrect data provided in request {0}")]
  BadData(String),
  #[error("azure builder error {0}")]
  AzureBuilder(#[from] object_store::Error),
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
