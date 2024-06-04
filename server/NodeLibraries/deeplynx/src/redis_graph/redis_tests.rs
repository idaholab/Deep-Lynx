#[cfg(test)]
mod main_tests {
    use crate::config::Configuration;
    use serial_test::serial;
    use crate::redis_graph::loader::RedisGraphLoader;
    use crate::redis_graph::redis_errors::RedisLoaderError;

    #[tokio::test]
    #[serial]
    async fn test_redis_graph_load() -> Result<(), RedisLoaderError> {
        let redis_loader = RedisGraphLoader::new(Configuration::from_path(None).unwrap()).await?;

        // TODO: make sure you change this for an existing DeepLynx container in the db
        // no way I was going to try and recreate a graph simply for this test
        redis_loader.generate_redis_graph(1297, None, None).await?;

        Ok(())
    }
}
