#![allow(dead_code, unused)] // todo
#![allow(unused_imports)] // todo
#![allow(clippy::single_char_add_str)] // allow it

use std::path::Path;
// use std::io::BufRead;
use clap::ValueEnum;
use clap::ValueHint::FilePath;
use std::str::FromStr;
use std::sync::Arc;
// use clap::builder::Resettable::Value;
use crate::error::{
    Result,
    TSError,
};
use datafusion::datasource::listing::ListingTableUrl;
use datafusion::prelude::{
    SessionConfig,
    SessionContext,
};
use lazy_static::lazy_static;
use log::{
    info,
    log_enabled,
};
use object_store::azure::MicrosoftAzureBuilder;
use rand::{
    distributions::{
        Distribution,
        Standard,
    },
    Rng,
};
use regex::Regex;
use serde::{
    Deserialize,
    Serialize,
};
use serde_json::Value;
use tokio::net::unix::uid_t;
use url::Url; // 0.8.0

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

#[derive(Serialize, Deserialize, Copy, Clone, PartialEq, Eq, PartialOrd, Ord, ValueEnum, Debug)]
#[allow(non_camel_case_types, non_snake_case)]
pub enum StoreType {
    minio,
    azure_blob,
    filesystem,
    largeobject, // naming conforms with DeepLynx
}

impl Distribution<StoreType> for Standard {
    fn sample<R: Rng + ?Sized>(&self, rng: &mut R) -> StoreType {
        // match rng.gen_range(0, 3) { // rand 0.5, 0.6, 0.7
        match rng.gen_range(0..3) {
            // rand 0.8
            0 => StoreType::minio,
            1 => StoreType::azure_blob,
            2 => StoreType::filesystem,
            3 => StoreType::largeobject,
            _ => StoreType::largeobject,
        }
    }
}
impl Default for StoreType {
    fn default() -> Self {
        let store_type: StoreType = rand::random();
        store_type
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
            StoreType::largeobject => {
                // downloading from DeepLynx does not need a registered
                // store because the file is download to a local file
            }
            /// possible sample code is included here but note this function
            /// returns Unimplemented
            StoreType::azure_blob => {
                let table_path = ListingTableUrl::parse(
                    "https://gvadedeeplynxdevsa.blob.core.usgovcloudapi.net/",
                )?;
                // let scheme = table_path.scheme();
                let url: &Url = table_path.as_ref();
                let microsoft_azure = MicrosoftAzureBuilder::new()
                    .with_account("gvadedeeplynxdevsa")
                    .with_access_key("")
                    .with_container_name("deeplynx")
                    .with_endpoint(
                        "https://gvadedeeplynxdevsa.blob.core.usgovcloudapi.net".to_string(),
                    )
                    .build()?;

                let store = Arc::new(microsoft_azure);
                ctx.runtime_env().register_object_store(url, store.clone());
                return Err(TSError::Unimplemented("Azure File Storage".to_string()));
            }
            StoreType::minio => {
                return Err(TSError::Unimplemented("AWS S3 File Storage".to_string()));
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

            // parse a specific DeepLynx route via regex
            StoreType::largeobject => {
                // /containers/${containerID}/reports/${reportID}?token=${token}
                const RE_STR: &str =
                    r"containers/(?P<container_id>\d+)/reports/(?P<report_id>\d+)?token=.*";
                const RE_HINT: &str = "containers/<container_id>/reports/<report_id>?token=<token>";
                lazy_static! {
                    static ref RE: Regex =
                        regex::Regex::new(RE_STR).expect("Static regex doesn't compile");
                }
                // get id components of the route as a way of error checking
                let caps = RE.captures(&uri).ok_or(TSError::Error(format!(
                    "upload route: '{}' does not match: '{}'",
                    uri, RE_HINT
                )))?;
                let _container_id = caps["container_id"].parse::<u64>()?;
                let report_id = caps["data_source_id"].parse::<u64>()?;
                Ok(format!("table_{:?}", report_id))
            }

            // todo get regex for this type and parse out the tablename
            StoreType::minio => {
                unimplemented!()
            }

            // todo get regex for this type and parse out the tablename
            StoreType::azure_blob => {
                unimplemented!()
            }
        }
    }
}

#[derive(Serialize, Deserialize, Copy, Clone, ValueEnum, Debug, Default)]
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

