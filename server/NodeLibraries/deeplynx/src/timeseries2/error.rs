use datafusion::error::DataFusionError;
use log::error;
use napi::Error;
use reqwest::header::InvalidHeaderValue;
use std::convert::Infallible;
use std::num::ParseIntError;
use std::time::SystemTimeError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum TSError {
  #[error("Invalid Table building parameters")]
  InvalidTableParameters,

  #[error("DataFusionError {0}")]
  DataFusionError(#[from] DataFusionError),

  #[error("serde_json:: {0}")]
  SerdeJsonError(#[from] serde_json::Error),

  #[error("serde_yaml:: {0}")]
  SerdeYamlError(#[from] serde_yaml::Error),

  #[error("object_store")]
  ObjectStoreError(#[from] object_store::Error),

  #[error("ArrowError")]
  ArrowError(#[from] datafusion::arrow::error::ArrowError),

  #[error("time:: {0}")]
  SystemTimeError(#[from] SystemTimeError),

  #[error("reqwest:: {0}")]
  ReqwestError(#[from] reqwest::Error),

  #[error("InvalidHeaderValue:: {0}")]
  InvalidHeaderValueError(#[from] InvalidHeaderValue),

  #[error("IO Error:: {0}")]
  IOError(#[from] std::io::Error),

  #[error("Reqwest is error")]
  ReqwestIsError,

  #[error("Reqwest value error")]
  ReqwestValue,

  #[error("Reqwest error error {0}")]
  ReqwestErrorError(String),

  #[error("File deletion error")]
  FileDeletionError,

  #[error("Unimplemented: {0}")]
  Unimplemented(String),

  #[error("error: {0}")]
  Error(String),

  #[error("error: {0}")]
  Str(&'static str),

  #[error("Could not download: {0}")]
  Download(String),

  #[error("Regex {0}")]
  Regex(#[from] regex::Error),

  #[error("Regex parse int {0}")]
  ParseInt(#[from] ParseIntError),

  #[error("Infallible Error")]
  Infallible(#[from] Infallible),

  #[error("Napi Error")]
  NapiError(#[from] napi::Error),
}

impl From<TSError> for napi::Error {
  fn from(ts_err: TSError) -> Self {
    Error::from_reason(ts_err.to_string())
  }
}
