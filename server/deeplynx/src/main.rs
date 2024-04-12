use crate::config::Config;
use crate::errors::ApplicationError;
use std::process::{Command, Stdio};
use std::str::FromStr;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

mod config;
mod errors;

use axum::{
    body::Body,
    extract::{Request, State},
    http::uri::Uri,
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use hyper::StatusCode;
use hyper_util::{client::legacy::connect::HttpConnector, rt::TokioExecutor};

#[derive(Clone)]
pub struct ServerState {
    pub config: Config,
    client: hyper_util::client::legacy::Client<HttpConnector, Body>,
}

#[tokio::main]
async fn main() -> Result<(), ApplicationError> {
    let config = Config::new()?;

    // these next few lines are for the tracing (logging on steroids)
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::from_str(config.log_level.as_str()).unwrap_or(Level::DEBUG))
        .json()
        .finish();

    tracing::subscriber::set_global_default(subscriber)
        .expect("setting default stdout logger failed");

    let state = ServerState {
        config: config.clone(),
        client: hyper_util::client::legacy::Client::<(), ()>::builder(TokioExecutor::new())
            .build(HttpConnector::new()),
    };

    let app = Router::new().fallback(handler).with_state(state);

    // if we're in development mode - start the legacy DeepLynx server
    if config
        .development_mode
        .ok_or(ApplicationError::Application)?
    {
        tokio::spawn(async move {
            Command::new("yarn")
                .args(["run", "start"])
                .current_dir("../legacy")
                .stdout(Stdio::inherit())
                .output()
                .expect("failed to start legacy deeplynx service");
        });
    }

    let listener = tokio::net::TcpListener::bind("0.0.0.0:4000").await.unwrap();
    info!("DeepLynx listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
    Ok(())
}

async fn handler(
    State(state): State<ServerState>,
    mut req: Request,
) -> Result<Response, StatusCode> {
    let path = req.uri().path();
    let path_query = req
        .uri()
        .path_and_query()
        .map(|v| v.as_str())
        .unwrap_or(path);

    let uri = format!("{}{}", state.config.deeplynx_legacy_url, path_query);

    *req.uri_mut() = Uri::try_from(uri).unwrap();

    Ok(state
        .client
        .request(req)
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?
        .into_response())
}
