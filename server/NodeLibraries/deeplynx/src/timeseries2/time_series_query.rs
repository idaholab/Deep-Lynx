use super::{azure_metadata::AzureMetadata, file_path_metadata::FilePathMetadata};

#[napi(constructor)]
#[derive(Debug, Default, Clone)]
pub struct TimeSeriesQuery {
  #[napi(js_name = "report_id")]
  pub report_id: Option<String>,
  #[napi(js_name = "query_id")]
  pub query_id: Option<String>,
  pub query: Option<String>,
  #[napi(js_name = "deeplynx_response_url")]
  pub deeplynx_response_url: Option<String>,
  #[napi(js_name = "upload_path")]
  pub upload_path: Option<String>,
  pub files: Option<Vec<FilePathMetadata>>,
  pub token: Option<String>,
  #[napi(js_name = "data_source_id")]
  pub data_source_id: Option<String>,
  #[napi(js_name = "azure_metadata")]
  pub azure_metadata: Option<AzureMetadata>,
  #[napi(js_name = "to_json")]
  pub to_json: Option<bool>,
}

impl TimeSeriesQuery {
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
