use crate::timeseries2::error::{Result, TSError};
use datafusion::datasource::listing::ListingTableUrl;
use datafusion::prelude::{SessionConfig, SessionContext};
use lazy_static::lazy_static;
use log::{info, log_enabled};
use object_store::azure::MicrosoftAzureBuilder;
use rand::{
  distributions::{Distribution, Standard},
  Rng,
};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::Path;
use std::sync::Arc;
use url::Url;

pub fn info_pretty<T>(msg_str: &str, msg_struct: T)
where
  T: Serialize,
{
  if log_enabled!(log::Level::Info) {
    info!("{}", msg_str);
    let color = "\x1b[92m"; //green
    if let Ok(pretty_string) = serde_json::to_string_pretty(&msg_struct) {
      for line in pretty_string.lines() {
        info!("{}{}\x1b[0m", color, line);
      }
    };
  }
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct Response {
  pub report_id: String,
  pub is_error: bool,
  pub value: Value,
}

/// Public interface
impl Response {
  pub fn from_id_msg(id: &str, msg: &str) -> Self {
    Response {
      report_id: id.to_string(),
      is_error: true, // is this always supposed to be an error?
      value: Value::from(msg),
    }
  }

  fn as_string(&self) -> serde_json::Result<String> {
    serde_json::to_string(self)
  }

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
}

// #[cfg(test)]
// mod response_tests {

//   #[test]
//   fn from_id_msg_fn_works() {
//     todo!()
//   }

//   #[test]
//   fn as_string_fn_works() {
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

#[derive(Serialize, Deserialize, Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Debug)]
// #[allow(non_camel_case_types, non_snake_case)] // TODO: are these styles required to not be in proper rust style?
#[derive(Default)]
pub enum StoreType {
  minio,
  azure_blob,
  filesystem,
  #[default]
  default_type,
}

impl Distribution<StoreType> for Standard {
  fn sample<R: Rng + ?Sized>(&self, rng: &mut R) -> StoreType {
    match rng.gen_range(0..3) {
      0 => StoreType::minio,
      1 => StoreType::azure_blob,
      2 => StoreType::filesystem,
      _ => StoreType::default_type,
    }
  }
}
impl StoreType {
  pub fn get_session_context(&self) -> Result<SessionContext> {
    let session_config = SessionConfig::new().with_information_schema(true);
    let ctx = SessionContext::new_with_config(session_config);
    match self {
      StoreType::filesystem => {
        // using local files does not need a registered store
      }
      // possible sample code is included here but note this function
      // returns Unimplemented
      StoreType::azure_blob => {
        let table_path =
          ListingTableUrl::parse("https://gvadedeeplynxdevsa.blob.core.usgovcloudapi.net/")?;
        // let scheme = table_path.scheme();
        let url: &Url = table_path.as_ref();
        let microsoft_azure = MicrosoftAzureBuilder::new()
          .with_account("gvadedeeplynxdevsa")
          .with_access_key("")
          .with_container_name("deeplynx")
          .with_endpoint("https://gvadedeeplynxdevsa.blob.core.usgovcloudapi.net".to_string())
          .build()?;

        let store = Arc::new(microsoft_azure);
        ctx.runtime_env().register_object_store(url, store.clone());
        return Err(TSError::Unimplemented("Azure File Storage".to_string()));
      }
      StoreType::minio => {
        return Err(TSError::Unimplemented("AWS S3 File Storage".to_string()));
      }
      StoreType::default_type => {
        return Err(TSError::Unimplemented(
          "Default (Empty) Storage".to_string(),
        ));
      }
    }
    Ok(ctx)
  }

  /// parse the adapter_file_path and return a table_name therefrom
  /// this also serves to validate the adapter_file_path
  pub(crate) fn parse_table_name(&self, uri: String) -> Result<String> {
    match self {
      // Use Path::new() to do the parse and return the file name or error
      StoreType::filesystem => {
        let path = Path::new(&uri);
        let file_name = path.file_name().ok_or(TSError::Str("Invalid path"))?;
        Ok(format!("{:?}", file_name))
      }

      // todo get regex for this type and parse out the tablename
      StoreType::minio => {
        unimplemented!()
      }

      // todo get regex for this type and parse out the tablename
      StoreType::azure_blob => {
        unimplemented!()
      }

      StoreType::default_type => {
        unimplemented!()
      }
    }
  }
}

// #[cfg(test)]
// mod storetype_tests {

//   #[test]
//   fn storetype_works() {
//     todo!()
//   }
// }

#[derive(Serialize, Deserialize, Copy, Clone, Debug, Default)]
pub enum FileType {
  #[default]
  Csv,
  Parquet,
  Json,
  Hdf5, // unimplemented
  Tdms, // unimplemented
}

impl FileType {
  pub(crate) fn from_string(file: &str) -> FileType {
    let file = file.to_lowercase();
    if file.ends_with(".csv") {
      FileType::Csv
    } else if file.ends_with(".parquet") {
      FileType::Parquet
    } else if file.ends_with(".json") {
      FileType::Json
    } else if file.ends_with(".h5") || file.ends_with(".hdf5") {
      FileType::Hdf5
    } else {
      FileType::default()
    }
  }
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct FilePathMetadata {
  id: String,
  adapter_file_path: String,
  pub adapter: StoreType,
}

impl FilePathMetadata {
  /// SQL table names must start with a letter
  /// and contain only ascii alphanumeric and '_"
  fn is_valid_table_name(name: &str) -> bool {
    lazy_static! {
      static ref RE: Regex = regex::Regex::new(r"[a-zA-Z_][a-zA-Z_0-9]*")
        .expect("valid_table_name static regex doesn't compile");
    }
    RE.is_match(name)
  }

  /// Use the id to create a table name suitable
  /// for most common SQL syntax-es
  pub fn get_table_name(&self) -> Result<String> {
    let name = format!("table_{}", self.id);
    if Self::is_valid_table_name(name.as_str()) {
      Ok(name)
    } else {
      Err(TSError::Error(format!(
        "Invalid table name from id: {}",
        self.id
      )))
    }
  }

  /// retrieve the file from the file store for local processing
  /// but only if it is "largeobject" aka DeepLynx storage
  pub async fn retrieve_file(&self) -> Result<String> {
    match self.adapter {
      StoreType::filesystem => {
        // for local file system just return the file path
        Ok(self.adapter_file_path.clone())
      }
      StoreType::minio => {
        // todo
        Err(TSError::Unimplemented(format!(
          "minio retrieve file {:?}",
          self.adapter_file_path
        )))
      }
      StoreType::azure_blob => {
        // todo
        Err(TSError::Unimplemented(format!(
          "azure_blob retrieve file {:?}",
          self.adapter_file_path
        )))
      }
      StoreType::default_type => Err(TSError::Unimplemented(
        "Uninitialized default store type".to_string(),
      )),
    }
  }

  /// retrieve the file from the file store for local processing
  /// but only if it is "largeobject" aka DeepLynx storage
  async fn store_file(&self) -> Result<String> {
    match self.adapter {
      StoreType::filesystem => {
        // for local file system just return the file path
        Ok(self.adapter_file_path.clone())
      }
      StoreType::minio => {
        // todo
        Err(TSError::Unimplemented(format!(
          "minio retrieve file {:?}",
          self.adapter_file_path
        )))
      }
      StoreType::azure_blob => {
        // todo
        Err(TSError::Unimplemented(format!(
          "azure_blob retrieve file {:?}",
          self.adapter_file_path
        )))
      }
      StoreType::default_type => Err(TSError::Unimplemented(
        "Uninitialized default store type".to_string(),
      )),
    }
  }
}

// #[cfg(test)]
// mod filetype_tests {

//   #[test]
//   fn filetype_works() {
//     todo!()
//   }
// }
