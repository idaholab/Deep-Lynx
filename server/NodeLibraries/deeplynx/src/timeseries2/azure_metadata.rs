#[napi(object)]
#[derive(Debug, Default, Clone)]
pub struct AzureMetadata {
  #[napi(js_name = "account_name")]
  pub account_name: Option<String>,
  #[napi(js_name = "blob_endpoint")]
  pub blob_endpoint: Option<String>,
  #[napi(js_name = "container_name")]
  pub container_name: Option<String>,
  #[napi(js_name = "sas_token")]
  pub sas_token: Option<String>,
}
