use crate::config::Configuration;
use crate::snapshot::generator::{SnapshotGenerator, SnapshotParameters};
use std::sync::Arc;

mod errors;
mod generator;
mod snapshot_tests;

#[napi(js_name = "SnapshotGenerator")]
pub struct JsSnapshotGenerator {
  inner: Option<Arc<SnapshotGenerator>>,
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
  /// This generates the node snapshot dataframe and stores it on the SnapshotGenerator instance. This
  /// MUST be run before you attempt to find any nodes.
  #[napi]
  pub async unsafe fn init(
    &mut self,
    config: Configuration,
    container_id: String,
    timestamp: Option<String>,
  ) -> Result<(), napi::Error> {
    let mut inner = match crate::snapshot::generator::SnapshotGenerator::new(config).await {
      Ok(b) => b,
      Err(e) => return Err(e.into()),
    };

    // we convert to a u64 here because js can't handle 64bit numbers
    let result = match inner
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
    };

    self.inner = Some(Arc::new(inner));
    result
  }

  /// Find all the nodes that match a given set of parameters. Parameters must be EdgeParameters passed
  /// in as JSON in order to handle the fact that the value could be any valid JSON data-type. This function
  /// returns only the _database_ ids of the matching nodes - this is in order to avoid expensive serialization
  /// across the border.
  #[napi]
  pub async fn find_nodes(&self, parameters_json: String) -> Result<Vec<String>, napi::Error> {
    let inner = self.inner.clone().ok_or(napi::Error::new(
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
