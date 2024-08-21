#[napi(object)]
#[derive(Debug, Default, Clone)]
pub struct FilePathMetadata {
  pub id: Option<String>,
  pub adapter: Option<String>,
  #[napi(js_name = "data_source_id")]
  pub data_source_id: Option<String>,
  #[napi(js_name = "file_name")]
  pub file_name: Option<String>,
  #[napi(js_name = "adapter_file_path")]
  pub adapter_file_path: Option<String>,
}
