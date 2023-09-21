mod data_types;
mod ingestion;
mod repository;
mod timeseries_errors;
mod timeseries_tests;

use crate::config::Configuration;
use crate::timeseries::repository::{BucketRepository, LegacyTimeseriesColumn};
use napi::bindgen_prelude::Buffer;
use serde::{Deserialize, Serialize};

#[napi(js_name = "BucketRepository")]
pub struct JsBucketRepository {
  inner: Option<BucketRepository>,
}

/// JsBucketRepository is the Javascript friendly wrapper over bucket repository.
#[napi]
impl JsBucketRepository {
  #[napi(constructor)]
  #[allow(clippy::all)]
  pub fn new() -> Self {
    JsBucketRepository { inner: None }
  }

  /// # Safety
  ///
  /// This function should be called before any work done on the object
  #[napi]
  pub async unsafe fn init(&mut self, config: Configuration) -> Result<(), napi::Error> {
    let inner = match BucketRepository::new(config).await {
      Ok(b) => b,
      Err(e) => return Err(e.into()),
    };

    self.inner = Some(inner);
    Ok(())
  }

  #[napi]
  /// # Safety
  ///
  /// This spawns multithreaded operations so be wary. The beginCsvIngestion function initializes the
  /// repository to receive CSV data from a node.js source
  pub unsafe fn begin_legacy_csv_ingestion(
    &mut self,
    data_source_id: String,
    columns: Vec<LegacyTimeseriesColumn>,
  ) -> Result<(), napi::Error> {
    let inner = self.inner.as_mut().ok_or(napi::Error::new(
      napi::Status::GenericFailure,
      "must call init before calling functions",
    ))?;

    match inner.begin_legacy_csv_ingestion(data_source_id, columns) {
      Ok(_) => Ok(()),
      Err(e) => Err(napi::Error::new(
        napi::Status::GenericFailure,
        e.to_string(),
      )),
    }
  }

  #[napi]
  /// # Safety
  ///
  /// A "begin_x_ingestion" must have been called successfully before you attempt to read.
  /// This is how data is passed into our internal pipeline
  pub fn read_data(&mut self, bytes: Buffer) -> Result<(), napi::Error> {
    let bytes: Vec<u8> = bytes.into();

    let inner = self.inner.as_mut().ok_or(napi::Error::new(
      napi::Status::GenericFailure,
      "must call init before calling functions",
    ))?;

    match inner.read_data(bytes) {
      Ok(_) => Ok(()),
      Err(e) => Err(napi::Error::new(
        napi::Status::GenericFailure,
        e.to_string(),
      )),
    }
  }

  #[napi]
  /// # Safety
  ///
  /// This terminates multithreaded operations so be wary. This is called when you've completed the
  /// ingestion and can also be used to check for errors during the operation
  pub async unsafe fn complete_ingestion(&mut self) -> Result<(), napi::Error> {
    let inner = self.inner.as_mut().ok_or(napi::Error::new(
      napi::Status::GenericFailure,
      "must call init before calling functions",
    ))?;

    match inner.complete_ingestion().await {
      Ok(_) => Ok(()),
      Err(e) => Err(napi::Error::new(
        napi::Status::GenericFailure,
        e.to_string(),
      )),
    }
  }
}

#[napi]
pub fn infer_legacy_schema(csv: Buffer) -> Result<Vec<LegacyTimeseriesColumn>, napi::Error> {
  match BucketRepository::infer_legacy_schema(csv.to_vec().as_slice()) {
    Ok(results) => Ok(results),
    Err(e) => Err(napi::Error::new(
      napi::Status::GenericFailure,
      e.to_string(),
    )),
  }
}
