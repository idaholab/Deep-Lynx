use crate::config::Configuration;
use crate::snapshot::errors::SnapshotError;
use futures_util::{StreamExt, TryStreamExt};
use polars::frame::DataFrame;
use polars::prelude::{col, len, lit, Expr, IntoLazy, LazyFrame, NamedFrom, Series};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::PgPool;
use std::collections::HashMap;
use tokio_util::compat::FuturesAsyncReadCompatExt;

#[derive(Clone)]
pub struct SnapshotGenerator {
  db: PgPool,
  // be warned - DataFrame is NOT Copy, you will have to Clone to work with it. That's why we build
  // a map of smaller DataFrames to search against, so we're cloning the bare minimum of data
  frame: Option<DataFrame>,
  by_metatype_ids: HashMap<u64, DataFrame>,
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
      by_metatype_ids: Default::default(),
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

    let mut ids: Vec<u64> = Vec::with_capacity(count.0 as usize);
    let mut container_ids: Vec<u64> = Vec::with_capacity(count.0 as usize);
    let mut metatype_ids: Vec<u64> = Vec::with_capacity(count.0 as usize);
    let mut data_source_ids: Vec<u64> = Vec::with_capacity(count.0 as usize);
    let mut original_data_ids: Vec<String> = Vec::with_capacity(count.0 as usize);
    let mut properties: Vec<String> = Vec::with_capacity(count.0 as usize);
    let mut metatype_name: Vec<String> = Vec::with_capacity(count.0 as usize);
    let mut metatype_uuid: Vec<String> = Vec::with_capacity(count.0 as usize);

    while let Some(record) = records.next().await {
      let n = record?;
      ids.push(n.id);
      container_ids.push(n.container_id);
      metatype_ids.push(n.metatype_id);
      data_source_ids.push(n.data_source_id);
      original_data_ids.push(n.original_data_id);
      properties.push(n.properties);
      metatype_name.push(n.metatype_name);
      metatype_uuid.push(n.metatype_uuid);
    }

    let ids: Series = Series::new("id", ids);
    let container_ids: Series = Series::new("container_id", container_ids);
    let metatype_ids: Series = Series::new("metatype_id", metatype_ids);
    let datasource_ids: Series = Series::new("data_source_id", data_source_ids);
    let original_data_ids: Series = Series::new("original_data_id", original_data_ids);
    let properties: Series = Series::new("properties", properties);
    let metatype_names: Series = Series::new("metatype_name", metatype_name);
    let metatype_uuid: Series = Series::new("metatype_uuid", metatype_uuid);

    let df = DataFrame::new(vec![
      ids,
      container_ids,
      metatype_ids,
      datasource_ids,
      original_data_ids,
      properties,
      metatype_names,
      metatype_uuid,
    ])?;

    // sort the frame in place so we have faster lookups on common fields
    let df = df.sort(["metatype_id", "data_source_id"], Default::default())?;

    self.frame = Some(df);
    Ok(())
  }

  /// find_nodes takes a set of parameters and returns the node ids of those nodes that match all
  /// parameters. Parameters are done an AND filter
  pub async fn find_nodes(
    &mut self,
    params: Vec<SnapshotParameters>,
  ) -> Result<Vec<u64>, SnapshotError> {
    // first we need to check the hashmap to see if we already have a dataframe for the metatype id
    // note: it is guaranteed that only one of the snapshot parameters will be a metatype_id parameter
    // due to how edges must work
    let metatype_filter: Vec<&SnapshotParameters> = params
      .iter()
      .filter(|p| p.param_type == "metatype_id")
      .collect();

    if metatype_filter.len() > 1 || metatype_filter.is_empty() {
      return Err(SnapshotError::General(String::from(
        "you must include at least one metatype_id filter in order to find nodes",
      )));
    }

    // now we can fetch the first filter without worrying
    let metatype_filter = metatype_filter.first().unwrap();

    let metatype_id = match metatype_filter.value.clone() {
      Value::Number(n) => n.as_u64().unwrap(),
      _ => 0,
    };

    if metatype_id == 0 {
      return Err(SnapshotError::General(String::from(
        "metatype id not valid",
      )));
    }

    if let std::collections::hash_map::Entry::Vacant(e) = self.by_metatype_ids.entry(metatype_id) {
      // unfortunately now we have to clone the dataframe to build out the metatype_id filter
      let df = self.frame.clone().unwrap().lazy(); // yes I know I'm unwrapping, it's fine

      e.insert(df.filter(col("metatype_id").eq(metatype_id)).collect()?);
    }

    // ok now that we're sure we have a dataframe in there for our metatype_id, let's pull it out
    let df = self
      .by_metatype_ids
      .get_mut(&metatype_id)
      .ok_or(SnapshotError::General(String::from(
        "unable to fetch dataframe for metatype_id",
      )))?;

    // now we build up an expression built on the rest of the parameters
    // note: the properties filter requires a secondary pass after this first one so that we can deserialize
    // the JSON it contains and check the value against the value presented in the filter.
    let mut errors = vec![];
    let mut expressions: Vec<Expr> = params
      .iter()
      .filter(|p| {
        p.param_type != "metatype_id"
          && p.param_type != "metatype_uuid"
          && p.param_type != "metatype_name"
      })
      .map(|p| match p.param_type.as_str() {
        "data_source" => Ok(col("data_source_id").eq(p.value.as_u64().ok_or(
          SnapshotError::General(String::from("unable to unwrap data_source_id")),
        )?)),
        "original_id" => Ok(col("original_data_id").eq(p.value.as_str().ok_or(
          SnapshotError::General(String::from("unable to unwrap original_id")),
        )?)),
        "id" => Ok(
          col("id").eq(
            p.value
              .as_u64()
              .ok_or(SnapshotError::General(String::from("unable to unwrap id")))?,
          ),
        ),
        "property" => Ok(
          col("properties")
            .str()
            .contains(lit(p.property.as_str()), false),
        ),
        _ => Err(SnapshotError::General(String::from(
          "unsupported edge parameter",
        ))),
      })
      .filter_map(|s| s.map_err(|e| errors.push(e)).ok())
      .collect();

    if !errors.is_empty() {
      return Err(SnapshotError::General(String::from(
        "unsupported edge parameters",
      )));
    };
    expressions.push(col("*"));

    let df = df.clone().lazy().select(expressions).collect()?;

    let ids: Vec<Option<u64>> = df.column("id")?.u64()?.iter().collect();

    Ok(ids.iter().copied().flatten().collect())
  }
}

#[derive(Deserialize, Serialize, Debug)]
/// Node represents the structure contained in the DeepLynx table.
pub struct Node {
  id: u64,
  container_id: u64,
  metatype_id: u64,
  data_source_id: u64,
  original_data_id: String,
  properties: String,
  metatype_name: String,
  metatype_uuid: String,
}

// unfortunately we have to pass in the params as JSON so that we can get the proper type for
// the value field
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct SnapshotParameters {
  #[serde(rename(serialize = "type", deserialize = "type"))]
  pub param_type: String,
  pub operator: String,
  pub key: String,
  pub property: String,
  pub value: Value,
}
