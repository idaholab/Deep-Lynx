use thiserror::Error;

#[derive(Error, Debug)]
pub enum Timeseries2Error {
  #[error(transparent)]
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

// allow this lint because thiserror gives us `From<..>`
// Unsure why it doesn't also provide `Into<..>` like manually implementing does?
// Napi may not be implementing std::Error fully? idk
// https://rust-lang.github.io/rust-clippy/master/index.html#/from_over_into
// > According the std docs implementing `From<..>` is preferred since it gives you `Into<..>` for free where the reverse isn’t true.
#[allow(clippy::from_over_into)]
impl Into<napi::Error> for Timeseries2Error {
  fn into(self) -> napi::Error {
    napi::Error::new(napi::Status::GenericFailure, self.to_string())
  }
}
