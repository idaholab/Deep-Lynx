use crate::snapshot::generator::SnapshotGenerator;

mod generator;
mod errors;
mod snapshot_tests;

#[napi(js_name = "SnapshotGenerator")]
pub struct JsSnapshotGenerator {
    inner: Option<SnapshotGenerator>,
}

#[napi]
impl JsSnapshotGenerator {
   #[napi(constructor)]
   #[allow(clippy::all)]
   pub fn new() -> Self { JsSnapshotGenerator { inner: None }}
}
