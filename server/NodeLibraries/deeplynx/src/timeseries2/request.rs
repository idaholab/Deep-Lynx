use crate::timeseries2::api::Api;
use crate::timeseries2::error::TSError::Str;
use crate::timeseries2::error::{Result, TSError};
use crate::timeseries2::session::Session;
use crate::timeseries2::types::{FilePathMetadata, Response};

use lazy_static::lazy_static;
use regex::Regex;
use reqwest::header::HeaderMap;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Serialize, Deserialize, Debug)]
pub struct Request {
  pub report_id: String,
  pub query_id: String,
  pub query: String,
  pub response_url: String,
  pub files: Vec<FilePathMetadata>,
  pub token: String,
  pub data_source_id: String,
  pub azure_metadata: String,
}

/// public interface impl
impl Request {
  pub fn new() -> Self {
    Self {
      ..Default::default()
    }
  }

  /// Processes requests. Returns metadata for files that it uploads.
  pub async fn process(&self) -> Result<Response> {
    if self.files.is_empty() {
      return Err(Str("Request has empty file list"));
    };

    const RE_STR: &str =
      r"containers/(?P<container_id>\d+)/reports/(?P<report_id>\d+)\?token=(?P<token>.*)";
    const RE_HINT: &str = "containers/<container_id>/reports/<report_id>";
    lazy_static! {
        // note: we don't really need this regex, or to parse the route,
        // but we do it for error checking
        static ref RE:Regex = regex::Regex
            ::new(RE_STR)
                .expect("upload static regex doesn't compile");
    }

    let api = Api::new(self)?;

    let route = self.response_url.as_str();
    // get the captures just to check that the route is copacetic
    // then we will rebuild the route to make it super-copacetic
    let caps = RE.captures(route).ok_or(TSError::Error(format!(
      "upload route: '{}' does not match: '{}'",
      route, RE_HINT
    )))?;
    let container_id = caps["container_id"].parse::<u64>()?;
    let report_id = caps["report_id"].parse::<u64>()?;
    let token = caps["token"].parse::<String>()?;

    // rebuild the route from the successfully parsed input route to make
    // sure that it is correct vis-a-vis leading and trailing slashes
    // it will be appended onto the server and port in the get function
    let route = format!(
      "containers/{}/reports/{}?token={}",
      container_id, report_id, token
    ); //todo

    let mut headers = HeaderMap::new();
    headers.insert(
      "Authorization",
      format!("Bearer {}", api.bearer_token).parse()?,
    );

    // create the DataFusion session
    let mut session = Session::new(self.files[0].adapter)?;

    // first - register the tables
    let mut table_names: Vec<String> = vec![];
    let mut file_paths: Vec<String> = vec![];
    for file_path_metadata in &self.files {
      let table_name = file_path_metadata.get_table_name()?;
      table_names.push(table_name.clone());
      // retrieve the file and get the local path to it
      let file_path = file_path_metadata.retrieve_file().await?;
      file_paths.push(file_path.clone());
      // register it
      session
        .register_table(&table_name, file_path.as_str())
        .await?;
    }
    // second - run the actual query and get a DataFrame object
    // but also - if it is a DESCRIBE query then there should only be one file
    // in the list of files, in any case return the query results from files[0]
    let mut sql = self.query.clone();
    if sql.trim().to_uppercase().starts_with("DESCRIBE") {
      sql = format!("DESCRIBE {}", &table_names[0]);
    }

    let df = session.query(sql.as_str()).await?;

    // 1.) upload result file directly to the datasource
    // 2.) upload file metadata results to DeepLynx (file name, file size, file path)
    //
    // ･ﾟ✧I can turn it straight into json!✧･ﾟ
    // (is this what the api expects though?)
    // Also, probably should stream it,
    // See https://datafusion.apache.org/library-user-guide/using-the-dataframe-api.html#collect-streaming-exec
    // for more details on how to do
    let record_batches = df.collect().await?;
    let rb_slice = record_batches.iter().collect::<Vec<&_>>();
    let json_rows = datafusion::arrow::json::writer::record_batches_to_json_rows(&rb_slice)?;
    let json_payload = json!({
        "name": "imported_file_name",
        "description": "imported_file_desc",
        "data_versioning_enabled": false,
        "path": "",
        "file": serde_json::to_value(json_rows)?
    });
    let result_value = api
      .client
      .post(format!("{}/{route}", api.server))
      .headers(headers)
      .json(&json_payload)
      .send()
      .await?
      .json::<Value>()
      .await?;

    let mut response = json_result_to_response(result_value)?;
    response.report_id.clone_from(&self.report_id);
    Ok(response)
  }
}

impl Default for Request {
  fn default() -> Self {
    Request::new()
  }
}

// TODO: Should this be moved to types.rs? My rationale is that this is trying to convert from one type to another
//
// try whatever we can to parse a myriad of possible result jsons
pub fn json_result_to_response(outer_value: Value) -> Result<Response> {
  // first of all, can we parse this directly into a Response object using serde
  // then return the outer_value as a Response object (it is one)
  if let Ok(response) = serde_json::from_value::<Response>(outer_value.clone()) {
    return Ok(response);
  };

  // see if it is a typical error response and allow for alternate spelling of is_error
  #[derive(Serialize, Deserialize, Debug)]
  struct IsErrorValue {
    #[serde(alias = "isError")]
    is_error: bool,
    value: Value,
  }
  if let Ok(is_error) = serde_json::from_value::<IsErrorValue>(outer_value.clone()) {
    return Ok(Response {
      report_id: "unknown".to_string(),
      is_error: is_error.is_error,
      value: is_error.value,
    });
  };

  // same as above but the value field is a string rather than a json value
  #[derive(Serialize, Deserialize, Debug)]
  struct IsErrorString {
    #[serde(alias = "isError")]
    is_error: bool,
    value: String,
  }
  if let Ok(is_error) = serde_json::from_value::<IsErrorString>(outer_value.clone()) {
    return Ok(Response {
      report_id: "unknown".to_string(),
      is_error: is_error.is_error,
      value: serde_json::from_str::<Value>(is_error.value.as_str())?,
    });
  };

  // finally just return an Response error with value of outer_value
  Ok(Response {
    report_id: "unknown".to_string(),
    is_error: true,
    value: outer_value.clone(),
  })
}

// #[cfg(test)]
// mod tests {
//   use super::*;

//   #[test]
//   fn process_fn() {
//     let mut _test_req = Request::default();
//     // need a valid-looking non-empty file list
//     // need a valid-looking response_url
//     // need to mock a session and query
//     todo!()
//   }

//   #[test]
//   fn result_to_response_fn_works() {
//     todo!()
//   }

//   #[test]
//   fn result_to_response_fn_is_error_json_val() {
//     todo!()
//   }

//   #[test]
//   fn result_to_response_fn_is_error_string_val() {
//     todo!()
//   }

//   #[test]
//   fn result_to_response_fn_is_response_error() {
//     todo!()
//   }
// }
