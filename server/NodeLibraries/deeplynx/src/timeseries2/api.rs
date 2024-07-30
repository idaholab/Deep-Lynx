use crate::timeseries2::error::APIError;
use crate::timeseries2::request::Request;
use lazy_static::lazy_static;
use reqwest::header::{HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::env;
use warp::hyper::body::Bytes;

type Result<T> = std::result::Result<T, APIError>;

pub struct Api {
  pub(crate) client: reqwest::Client,
  pub(crate) server: String,
  pub bearer_token: String,
  headers: HeaderMap<HeaderValue>,
}

impl Api {
  pub(crate) fn client() -> &'static reqwest::Client {
    lazy_static! {
      static ref CLIENT: reqwest::Client = reqwest::Client::new();
    }
    &CLIENT
  }

  /// this is deliberately non-async so we can create a global reference
  /// the async function get_token is used to get the bearer_token if needed for auth
  pub fn new(request_obj: &Request) -> Result<Api> {
    let client = reqwest::Client::new();
    let server = env::var("DL_SERVER").expect("DL_SERVER must be set.");
    let mut headers = HeaderMap::new();
    headers.insert(
      "Authorization",
      format!("Bearer {}", request_obj.token).parse()?,
    );
    Ok(Api {
      client,
      server,
      bearer_token: request_obj.token.clone(),
      headers,
    })
  }

  pub async fn get_json_value<T: Serialize + for<'a> Deserialize<'a>>(
    &self,
    route: &str,
  ) -> Result<T> {
    let mut headers = HeaderMap::new();
    headers.insert(
      "Authorization",
      format!("Bearer {}", self.bearer_token).parse()?,
    );
    let route_string = format!("{}/{}", self.server, route);
    Ok(
      self
        .client
        .get(route_string)
        .headers(headers)
        .send()
        .await?
        .json::<T>()
        .await?,
    )
  }

  pub async fn get_json_text(&self, route: &str) -> Result<String> {
    let mut headers = HeaderMap::new();
    headers.insert(
      "Authorization",
      format!("Bearer {}", self.bearer_token).parse()?,
    );
    let route_string = format!("{}/{}", self.server, route);
    Ok(
      self
        .client
        .get(route_string)
        .headers(headers)
        .send()
        .await?
        .text()
        .await?,
    )
  }

  pub async fn get_json_bytes(&self, route: &str) -> Result<Bytes> {
    let mut headers = HeaderMap::new();
    headers.insert(
      "Authorization",
      format!("Bearer {}", self.bearer_token).parse()?,
    );
    let route_string = format!("{}/{}", self.server, route);
    Ok(
      self
        .client
        .get(route_string)
        .headers(headers)
        .send()
        .await?
        .bytes()
        .await?,
    )
  }

  pub async fn post_json_body(&self, route: &str, body: &str) -> Result<Value> {
    let mut headers = HeaderMap::new();
    headers.insert(
      "Authorization",
      format!("Bearer {}", self.bearer_token).parse()?,
    );
    headers.insert("Content-Type", "application/json".to_string().parse()?);
    headers.insert("Accept", "application/json".to_string().parse()?);
    let url = format!("{}/{}", self.server, route);
    let value = self
      .client
      .post(url)
      .headers(headers)
      .body(body.to_owned())
      .send()
      .await?
      .json::<Value>()
      .await?;
    Ok(value)
  }

  // TODO- update to match DL endpoint- also should be the same as query endpoint
  pub async fn describe(&self, container_id: u64, file_id: u64) -> Result<u64> {
    // not health route does not return json, just the version as text
    let route = format!(
      "containers/{}/reports/datafusion/describe/{}",
      container_id, file_id
    );
    println!("describe route : {}", route);

    let v = self.get_json_value::<Value>(route.as_str()).await?;

    if v["isError"].as_bool() == Some(true) {
      return Err(APIError::Error(format!(
        "could not describe file_id {}",
        file_id
      )));
    };
    let id_str = v["value"]
      .as_str()
      .ok_or(APIError::Str("No id in describe response"))?;
    let id = id_str.to_string().parse::<u64>()?;
    Ok(id)
  }
}

// TODO: these tests require mocking endoints
// #[cfg(test)]
// mod tests {

//   #[test]
//   fn get_json_value_fn_works() {
//     todo!()
//   }

//   #[test]
//   fn get_json_text_fn_works() {
//     todo!()
//   }

//   #[test]
//   fn get_json_bytes_fn_works() {
//     todo!()
//   }

//   #[test]
//   fn post_json_body_fn_works() {
//     todo!()
//   }

//   #[test]
//   fn describe_fn_works() {
//     todo!()
//   }
// }
