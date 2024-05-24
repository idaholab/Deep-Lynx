#[cfg(test)]
mod main_tests {
  use crate::config::Configuration;
  use crate::snapshot::errors::SnapshotError;
  use crate::snapshot::generator::{SnapshotGenerator, SnapshotParameters};
  use serde_json::{json, Number, Value};

  #[tokio::test]
  async fn test_snapshot_generator() -> Result<(), SnapshotError> {
    let mut generator =
      SnapshotGenerator::new(Configuration::from_path(Some(String::from(".config.yml"))).unwrap())
        .await?;

    // TODO: make sure you change this for an existing DeepLynx container in the db, no way I was going to try and recreate a graph simply for this test
    generator.generate_snapshot(104, None).await?;

    Ok(())
  }

  #[tokio::test]
  async fn test_node_filter() -> Result<(), SnapshotError> {
    let mut generator =
      SnapshotGenerator::new(Configuration::from_path(Some(String::from(".config.yml"))).unwrap())
        .await?;

    // TODO: make sure you change this for an existing DeepLynx container in the db, no way I was going to try and recreate a graph simply for this test
    generator.generate_snapshot(104, None).await?;
    let ids = generator
      .find_nodes(vec![SnapshotParameters {
        param_type: "metatype_id".to_string(),
        operator: "==".to_string(),
        key: "".to_string(),
        property: "".to_string(),
        value: json!(297),
      }])
      .await?;

    dbg!(ids);

    Ok(())
  }
}
