use crate::errors::DeepLynxError;
use serde::{Deserialize, Serialize};
use serde_yaml::from_reader;
use std::fs::File;

#[napi(object)]
#[derive(Serialize, Deserialize, Clone)]
pub struct Configuration {
    pub db_connection_string: String,
    pub redis_connection_string: String,
    pub max_columns: Option<u32>,
}

impl Configuration {
    pub fn new(path: Option<String>) -> Result<Configuration, DeepLynxError> {
        let path = path.unwrap_or("./.config.yml".to_string());

        let config_file = File::open(path)?;
        let config: Configuration = from_reader(config_file)?;

        Ok(config)
    }
}
