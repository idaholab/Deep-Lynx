use thiserror::Error;

#[derive(Error, Debug)]
pub enum LoaderError {
    #[error("sqlx error")]
    SQLX(#[from] sqlx::Error),
    #[error("redis error")]
    Redis(#[from] redis::RedisError),
    #[error("serde error")]
    Serde(#[from] serde_json::Error),
    #[error("chrono parse error")]
    ChronoParse(#[from] chrono::ParseError),
    #[error("unknown error {0}")]
    Unknown(String),
}