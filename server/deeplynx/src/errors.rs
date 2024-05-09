use thiserror::Error;
use tracing::metadata::ParseLevelError;

#[derive(Error, Debug)]
pub enum ApplicationError {
    #[error("application error")]
    Application,
    #[error("configuration error {0}")]
    Configuration(#[from] config::ConfigError),
    #[error("log level parsing error {0}")]
    LogLevel(#[from] ParseLevelError),
}
