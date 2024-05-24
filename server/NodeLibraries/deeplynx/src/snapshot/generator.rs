use crate::config::Configuration;
use crate::snapshot::errors::SnapshotError;
use futures_util::{StreamExt, TryStreamExt};
use polars::frame::DataFrame;
use polars::prelude::{NamedFrom, Series};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use tokio_util::compat::FuturesAsyncReadCompatExt;

#[derive(Clone)]
pub struct SnapshotGenerator {
  db: PgPool,
  frame: Option<DataFrame>,
  _config: Configuration,
}

impl SnapshotGenerator {
  pub async fn new(config: Configuration) -> Result<Self, SnapshotError> {
    let connection_string = config
      .db_connection_string
      .clone()
      .ok_or(SnapshotError::MissingConnectionString)?;

    let db = PgPool::connect(connection_string.as_str()).await?;

    Ok(SnapshotGenerator {
      db,
      frame: None,
      _config: config,
    })
  }

  pub async fn generate_snapshot(
    &mut self,
    container_id: u64,
    timestamp: Option<String>,
  ) -> Result<(), SnapshotError> {
    let mut connection = self.db.acquire().await?;

    let query = match timestamp {
      None => format!(
        r#"SELECT q.*,  ROW_NUMBER () OVER(ORDER BY metatype_id) as new_id FROM (SELECT DISTINCT ON (nodes.id) nodes.id,
                    nodes.container_id,
                    nodes.metatype_id,
                    nodes.data_source_id,
                    nodes.original_data_id,
                    nodes.properties,
                    metatypes.name AS metatype_name,
                    metatypes.uuid AS metatype_uuid
                   FROM (nodes
                     LEFT JOIN metatypes ON ((metatypes.id = nodes.metatype_id)))
                  WHERE (nodes.deleted_at IS NULL) AND (nodes.container_id = {container_id}::bigint)
                  ORDER BY nodes.id, nodes.created_at) q ORDER BY q.metatype_id"#
      ),
      Some(ts) => format!(
        r#"
                 SELECT q.*,  ROW_NUMBER () OVER(ORDER BY metatype_id) as new_id FROM (SELECT DISTINCT ON (nodes.id) nodes.id,
                    nodes.container_id,
                    nodes.metatype_id,
                    nodes.data_source_id,
                    nodes.original_data_id,
                    nodes.properties,
                    metatypes.name AS metatype_name,
                    metatypes.uuid AS metatype_uuid
                   FROM (nodes
                     LEFT JOIN metatypes ON ((metatypes.id = nodes.metatype_id)))
                  WHERE (nodes.container_id = {container_id})
                  AND nodes.created_at <= '{ts}'
                  AND (nodes.deleted_at > '{ts}' OR nodes.deleted_at IS NULL)
                  ORDER BY nodes.id, nodes.created_at) q ORDER BY q.metatype_id"#
      ),
    };

    // first get the count of rows - we do this so we can do Vec::with_capacity to avoid memory
    // issues or slowdowns attempting to grow Vec
    let count: (i64,) = sqlx::query_as(format!("SELECT COUNT(*) FROM ({})", query).as_str())
      .fetch_one(&self.db)
      .await?;

    // you must LIMIT the query so we don't overload the Vec
    let mut async_reader = connection
      .copy_out_raw(
        format!(
          "COPY ({} LIMIT {}) TO STDOUT WITH (FORMAT csv, HEADER true);",
          query, count.0
        )
        .as_str(),
      )
      .await?
      // we have to convert the error so that we can turn it into an AsyncReader
      .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
      .into_async_read();

    let mut async_reader = csv_async::AsyncDeserializer::from_reader(async_reader.compat());
    let mut records = async_reader.deserialize::<Node>();

    let mut container_ids: Vec<u64> = Vec::with_capacity(count.0 as usize);
    let mut metatype_ids: Vec<u64> = Vec::with_capacity(count.0 as usize);
    let mut data_source_ids: Vec<u64> = Vec::with_capacity(count.0 as usize);
    let mut original_data_ids: Vec<String> = Vec::with_capacity(count.0 as usize);
    let mut properties: Vec<String> = Vec::with_capacity(count.0 as usize);
    let mut metatype_name: Vec<String> = Vec::with_capacity(count.0 as usize);
    let mut metatype_uuid: Vec<String> = Vec::with_capacity(count.0 as usize);

    while let Some(record) = records.next().await {
      let n = record?;
      container_ids.push(n.container_id);
      metatype_ids.push(n.metatype_id);
      data_source_ids.push(n.data_source_id);
      original_data_ids.push(n.original_data_id);
      properties.push(n.properties);
      metatype_name.push(n.metatype_name);
      metatype_uuid.push(n.metatype_uuid);
    }

    let container_ids: Series = Series::new("container_id", container_ids);
    let metatype_ids: Series = Series::new("metatype_id", metatype_ids);
    let datasource_ids: Series = Series::new("datasource_id", data_source_ids);
    let original_data_ids: Series = Series::new("original_data_id", original_data_ids);
    let properties: Series = Series::new("properties", properties);
    let metatype_names: Series = Series::new("metatype_name", metatype_name);
    let metatype_uuid: Series = Series::new("metatype_uuid", metatype_uuid);

    let df = DataFrame::new(vec![
      container_ids,
      metatype_ids,
      datasource_ids,
      original_data_ids,
      properties,
      metatype_names,
      metatype_uuid,
    ])?;

    self.frame = Some(df);
    Ok(())
  }
}

#[derive(Deserialize, Serialize, Debug)]
/// Node represents the structure contained in the DeepLynx table.
struct Node {
  container_id: u64,
  metatype_id: u64,
  data_source_id: u64,
  original_data_id: String,
  properties: String,
  metatype_name: String,
  metatype_uuid: String,
}
