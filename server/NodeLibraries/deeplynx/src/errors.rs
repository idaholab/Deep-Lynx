use crate::redis_graph::redis_errors::RedisLoaderError;
use napi::Error;
use std::io;
use thiserror::Error;

// Project specific errors and wrappers of other libraries errors so we can always return ours but
// still be able to use ? notation
#[derive(Error, Debug)]
pub enum DeepLynxError {
  #[error("general error {0}")]
  General(String),
  #[error("io error {0}")]
  IO(#[from] io::Error),
  #[error("serde json error {0}")]
  Json(#[from] serde_json::Error),
  #[error("serde yaml error {0}")]
  Yaml(#[from] serde_yaml::Error),
  #[error("redis loader error {0}")]
  RedisLoader(#[from] RedisLoaderError),
}

impl From<DeepLynxError> for napi::Error {
  fn from(val: DeepLynxError) -> Self {
    Error::new(napi::Status::GenericFailure, val.to_string())
  }
}
