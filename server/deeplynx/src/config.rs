use crate::errors::ApplicationError;
use config::{Config as OuterConfig, Environment, File};
use serde::Deserialize;
use std::env;

#[derive(Debug, Deserialize, Clone)]
#[allow(unused)]
pub struct Config {
    pub debug: bool,
    pub development_mode: Option<bool>,
    pub deeplynx_legacy_url: String,
    pub log_level: String,
}

impl Config {
    pub fn new() -> Result<Self, ApplicationError> {
        let run_mode = env::var("RUN_MODE").unwrap_or_else(|_| "development".into());

        let s = OuterConfig::builder()
            // Start off by merging in the "default" configuration file
            .add_source(File::with_name("configs/default"))
            // Add in the current environment file
            // Default to 'development' env
            // Note that this file is _optional_
            .add_source(File::with_name(&format!("configs/{}", run_mode)).required(false))
            // Add in settings from the environment (with a prefix of APP)
            // Eg.. `APP_DEBUG=1 ./target/app` would set the `debug` key
            .add_source(Environment::default())
            .build()?;

        Ok(s.try_deserialize()?)
    }
}
