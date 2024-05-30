use napi::Error;
use std::io;
use std::num::ParseIntError;
use thiserror::Error;

// Project specific errors and wrappers of other libraries errors so we can always return ours but
// still be able to use ? notation
#[derive(Error, Debug)]
pub enum SnapshotError {
    #[error("missing connection string")]
    MissingConnectionString,
    #[error("general error {0}")]
    General(String),
    #[error("io error {0}")]
    IO(#[from] io::Error),
    #[error("csv error {0}")]
    Csv(#[from] csv_async::Error),
    #[error("redis error {0}")]
    Redis(#[from] redis::RedisError),
    #[error("serde json error {0}")]
    Json(#[from] serde_json::Error),
    #[error("serde yame error {0}")]
    Yaml(#[from] serde_yaml::Error),
    #[error("sql error {0}")]
    Sql(#[from] sqlx::Error),
    #[error("parse int error {0}")]
    ParseInt(#[from] ParseIntError),
    #[error("polars error {0}")]
    Polars(#[from] polars::prelude::PolarsError),
    #[error("arrow error {0}")]
    Arrow(#[from] arrow::error::ArrowError)
}

impl Into<napi::Error> for SnapshotError {
    fn into(self) -> Error {
        Error::new(napi::Status::GenericFailure, self.to_string())
    }
}
