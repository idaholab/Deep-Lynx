use napi::Error;
use std::io;
use thiserror::Error;
use crate::redis_graph::redis_errors::RedisLoaderError;

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
    #[error("serde yame error {0}")]
    Yaml(#[from] serde_yaml::Error),
    #[error("redis loader error {0}")]
    RedisLoader(#[from] RedisLoaderError),
}

impl Into<napi::Error> for DeepLynxError {
    fn into(self) -> Error {
        Error::new(napi::Status::GenericFailure, self.to_string())
    }
}
