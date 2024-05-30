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
    generator.generate_snapshot(13, None).await?;
    let ids = generator
      .find_nodes(vec![
        SnapshotParameters {
          param_type: "metatype_id".to_string(),
          operator: "==".to_string(),
          key: Some("".to_string()),
          property: Some("".to_string()),
          // TODO: make sure you change the value to something that matches the nodes you have
          value: json!(13),
        },
        SnapshotParameters {
          param_type: "original_id".to_string(),
          operator: "==".to_string(),
          key: Some("".to_string()),
          property: Some("".to_string()),
          // TODO: make sure you change the value to something that matches the nodes you have
          value: json!(1),
        },
      ])
      .await?;

    dbg!(ids);

    Ok(())
  }
}
