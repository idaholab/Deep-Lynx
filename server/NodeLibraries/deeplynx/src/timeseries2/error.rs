use crate::timeseries2::request::Request;
use crate::timeseries2::response::Response;
use datafusion::error::DataFusionError;
use log::error;
use reqwest::header::InvalidHeaderValue;
use serde_json::Value;
use std::convert::Infallible;
use std::env::VarError;
use std::io;
use std::num::ParseIntError;
use std::time::SystemTimeError;
use thiserror::Error;
use tokio::task::JoinError;

pub type Result<T> = std::result::Result<T, TSError>;

#[derive(Error, Debug)]
pub enum TSError {
  #[error("Invalid Table building parameters")]
  InvalidTableParameters,

  #[error("{0}")]
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

  #[error("DeepLynxApi::{0}")]
  DeepLynxApiError(#[from] APIError),

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
}

impl TSError {
  pub fn to_response(&self, request: Request) -> Response {
    let error_string = format!("{:?}", &self);
    Response {
      report_id: request.report_id,
      is_error: true,
      value: Value::from(error_string),
    }
  }
}

// todo:rhetorical: Is there anyway to handle ANY other error without knowing it in advance?
// todo: see Error(String)

#[derive(Error, Debug)]
pub enum APIError {
  #[error("reqwest: {0}")]
  Reqwest(#[from] reqwest::Error),

  #[error("io error")]
  IO(#[from] io::Error),

  #[error("join error")]
  Join(#[from] JoinError),

  #[error("JSON Parsing Error")]
  Json(#[from] serde_json::Error),

  #[error("Env Variable Error")]
  Var(#[from] VarError),

  #[error("WebGL loading error")]
  WebGL,

  #[error("Invalid Header Value")]
  InvalidHeaderValue(#[from] InvalidHeaderValue),

  #[error("create: resource already exists")]
  ResourceAlreadyExists,

  #[error("create: resource does not exist")]
  ResourceDoesNotExist,

  #[error("Unauthorized Access")]
  Unauthorized,

  #[error("Deep Lynx Error")]
  DeepLynxError,

  #[error("Invalid Path Error")]
  InvalidPath,

  #[error("Could not find integer in parse")]
  ParseIntError(#[from] ParseIntError), // std::convert::From<ParseIntError>

  #[error("error: {0}")]
  Error(String),

  #[error("error: {0}")]
  Str(&'static str),
}
