#[cfg(test)]
mod main_tests {
  use crate::config::Configuration;
  use crate::errors::LoaderError;
  use crate::RedisGraphLoader;
  use serial_test::serial;

  #[tokio::test]
  #[serial]
  async fn test_redis_graph_load() -> Result<(), LoaderError> {
    let redis_loader = RedisGraphLoader::new(Configuration::new(None)?).await?;

    // TODO: make sure you change this for an existing DeepLynx container in the db
    // no way I was going to try and recreate a graph simply for this test
    redis_loader.generate_redis_graph(45, None).await?;

    Ok(())
  }
}
