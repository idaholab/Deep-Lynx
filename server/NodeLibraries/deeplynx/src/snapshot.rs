use crate::config::Configuration;
use crate::snapshot::generator::{SnapshotGenerator, SnapshotParameters};

mod errors;
mod generator;
mod snapshot_tests;

#[napi(js_name = "SnapshotGenerator")]
pub struct JsSnapshotGenerator {
  inner: Option<SnapshotGenerator>,
}

#[napi]
impl JsSnapshotGenerator {
  #[napi(constructor)]
  #[allow(clippy::all)]
  pub fn new() -> Self {
    JsSnapshotGenerator { inner: None }
  }

  /// # Safety
  ///
  /// This function should be called before any work done on the object
  #[napi]
  pub async unsafe fn init(&mut self, config: Configuration) -> Result<(), napi::Error> {
    let inner = match crate::snapshot::generator::SnapshotGenerator::new(config).await {
      Ok(b) => b,
      Err(e) => return Err(e.into()),
    };

    self.inner = Some(inner);
    Ok(())
  }

  #[napi]
  pub async fn generate_redis_graph(
    &self,
    container_id: String,
    timestamp: Option<String>,
  ) -> Result<(), napi::Error> {
    let mut inner = self.inner.clone().ok_or(napi::Error::new(
      napi::Status::GenericFailure,
      "must call init before calling functions",
    ))?;

    // we convert to a u64 here because js can't handle 64bit numbers
    match inner
      .generate_snapshot(
        container_id
          .parse::<u64>()
          .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))?,
        timestamp,
      ) // to u64 is a safe cast because container_id isn't negative
      .await
    {
      Ok(_) => Ok(()),
      Err(e) => Err(napi::Error::new(
        napi::Status::GenericFailure,
        e.to_string(),
      )),
    }
  }

  #[napi]
  pub async fn find_nodes(&self, parameters_json: String) -> Result<Vec<String>, napi::Error> {
    let mut inner = self.inner.clone().ok_or(napi::Error::new(
      napi::Status::GenericFailure,
      "must call init before calling functions",
    ))?;

    let params: Vec<SnapshotParameters> = serde_json::from_str(parameters_json.as_str())
      .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))?;

    match inner.find_nodes(params).await {
      Ok(ids) => {
        // convert from u64 into strings because JS can't handle it
        Ok(ids.iter().map(|id| id.to_string()).collect())
      }
      Err(e) => Err(napi::Error::new(
        napi::Status::GenericFailure,
        e.to_string(),
      )),
    }
  }
}
