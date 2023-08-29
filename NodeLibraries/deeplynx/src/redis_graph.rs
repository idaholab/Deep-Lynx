mod loader;
pub mod redis_errors;
mod redis_tests;

use crate::redis_graph::loader::RedisGraphLoader;
use crate::config::Configuration;

#[napi(js_name = "RedisGraphLoader")]
pub struct JsRedisGraphLoader {
    inner: Option<RedisGraphLoader>,
}

#[napi]
impl JsRedisGraphLoader {
    #[napi(constructor)]
    #[allow(clippy::all)]
    pub fn new() -> Self {
        JsRedisGraphLoader { inner: None }
    }

    /// # Safety
    ///
    /// This function should be called before any work done on the object
    #[napi]
    pub async unsafe fn init(&mut self, config: Configuration) -> Result<(), napi::Error> {
        let inner = match RedisGraphLoader::new(config).await {
            Ok(b) => b,
            Err(e) => return Err(e.into()),
        };

        self.inner = Some(inner);
        Ok(())
    }

    #[napi]
    pub async fn generate_redis_graph(
        &self,
        container_id: String,
        timestamp: Option<String>,
    ) -> Result<(), napi::Error> {
        let inner = self.inner.clone().ok_or(napi::Error::new(
            napi::Status::GenericFailure,
            "must call init before calling functions",
        ))?;

        // we convert to a u64 here because js can't handle 64bit numbers
        match inner
            .generate_redis_graph(
                container_id
                    .parse::<u64>()
                    .map_err(|e| napi::Error::new(napi::Status::GenericFailure, e.to_string()))?,
                timestamp,
            ) // to u64 is a safe cast because container_id isn't negative
            .await
        {
            Ok(_) => Ok(()),
            Err(e) => Err(napi::Error::new(
                napi::Status::GenericFailure,
                e.to_string(),
            )),
        }
    }
}
