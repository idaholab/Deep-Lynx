use std::fmt;

use super::{azure_metadata::AzureMetadata, file_path_metadata::FilePathMetadata};

#[napi]
#[derive(Debug, Default, Clone)]
pub struct TimeseriesQuery {
  #[napi(js_name = "report_id")]
  pub report_id: String,
  pub query: String,
  #[napi(js_name = "dl_token")]
  pub dl_token: String,
  #[napi(js_name = "storage_type")]
  pub storage_type: StorageType,
  #[napi(js_name = "sas_metadata")]
  pub sas_metadata: AzureMetadata,
  pub files: Vec<FilePathMetadata>,
  #[napi(js_name = "results_destination")]
  pub results_destination: String,
  #[napi(js_name = "deeplynx_destination")]
  pub deeplynx_destination: String,
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
