use std::fmt;

use super::{azure_metadata::AzureMetadata, file_path_metadata::FilePathMetadata};

#[napi(js_name = "TimeseriesQuery")]
#[derive(Debug, Default, Clone)]
pub struct JsTimeseriesQuery {
  inner: Option<TimeseriesQuery>,
}

#[napi]
impl JsTimeseriesQuery {
  #[napi(constructor)]
  pub fn new() -> Self {
    JsTimeseriesQuery {
      inner: Some(TimeseriesQuery::new()),
    }
  }
}

// todo: I want this to work without having each item be wrapped in an option.
// I want to be able to pass an object in. Maybe I can make a factory method under JsTimeseriesQuery?
// According to the errors, I need to implement FromNapiRef. Is this true or is there another way around it?
#[derive(Debug, Default, Clone)]
pub struct TimeseriesQuery {
  pub report_id: String,
  pub query: String,
  pub dl_token: String,
  pub storage_type: StorageType,
  pub sas_metadata: AzureMetadata,
  pub files: Vec<FilePathMetadata>,
  pub results_destination: String,
  pub deeplynx_destination: String,
}

impl TimeseriesQuery {
  pub fn new() -> Self {
    Self {
      ..Default::default()
    }
  }
}

#[napi(string_enum)]
#[derive(Debug, Default)]
pub enum StorageType {
  #[allow(non_camel_case_types)]
  azure,
  #[allow(non_camel_case_types)]
  #[default]
  filesystem,
}

impl fmt::Display for StorageType {
  fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
    write!(f, "{:?}", self)
  }
}
