use url::Url;

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

pub fn token_to_query_pairs(token: String) -> Result<Vec<(String, String)>, String> {
  let tmp_query_base_url = "https://www.not-actually-used.com";
  let tmp_query_full_url = format!("{}?{}", tmp_query_base_url, token);
  let tmp_parsed_query_url = Url::parse(&tmp_query_full_url).map_err(|e| e.to_string())?;
  let sas_token_query_pairs = tmp_parsed_query_url.query_pairs().into_owned();

  let mut converted_query_pairs = Vec::new();
  for pair in sas_token_query_pairs {
    converted_query_pairs.push(pair)
  }
  Ok(converted_query_pairs)
}
