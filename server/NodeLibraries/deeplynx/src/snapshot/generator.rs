use crate::config::Configuration;
use crate::snapshot::errors::SnapshotError;
use futures_util::{StreamExt, TryStreamExt};
use polars::frame::DataFrame;
use polars::prelude::{col, lit, Expr, IntoLazy, NamedFrom, Series};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::PgPool;
use tokio_util::compat::FuturesAsyncReadCompatExt;

#[derive(Clone)]
pub struct SnapshotGenerator {
  db: PgPool,
  // be warned - DataFrame is NOT Copy, you will have to Clone to work with it.
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

  // this builds the raw dataframe for use in other functions. This snapshot is of all the nodes at
  // a given point in time and used for quick lookups.
  pub async fn generate_snapshot(
    &mut self,
    container_id: u64,
    timestamp: Option<String>,
  ) -> Result<(), SnapshotError> {
    let mut connection = self.db.acquire().await?;

    // we use this query for both count and copy, so easy to just work with it once
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

    // first get the count of rows - we do this in order to do Vec::with_capacity to avoid memory
    // issues or slowdowns attempting to grow a Vec with each append
    let count: (i64,) = sqlx::query_as(format!("SELECT COUNT(*) FROM ({}) q", query).as_str())
      .fetch_one(&self.db)
      .await?;

    // you must LIMIT the query, so we don't overload the Vec
    let async_reader = connection
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

    // the raw holders for the values for each row - these will be converted into Series, so we can
    // build the DataFrame - order isn't important
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

    // build the actual dataframe
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

    // sort the frame in place, so we have faster lookups on common fields
    let df = df.sort(["metatype_id", "data_source_id"], Default::default())?;

    self.frame = Some(df);
    Ok(())
  }

  /// find_nodes takes a set of parameters and returns the node ids of those nodes that match all
  /// parameters. Parameters are done an AND filter
  pub async fn find_nodes(
    &self,
    params: Vec<SnapshotParameters>,
  ) -> Result<Vec<u64>, SnapshotError> {
    // now we build up an expression built on the rest of the parameters
    // note: the properties filter requires a secondary pass after this first one so that we can deserialize
    // the JSON it contains and check the value against the value presented in the filter - this secondary
    // pass is performed by the calling node.js function and is run directly against the Postgres database
    let mut errors = vec![];

    // ok now let's pull the frame out
    let df = self
      .frame
      .clone()
      .ok_or(SnapshotError::General(String::from(
        "no dataframe initiated",
      )))?;

    // Expr are the raw filters built that we will run against the data frane
    let lazy_frame = params
      .iter()
      // the metatype_name and metatype_uuid are not supported any longer, any params using these
      // deprecated param types will be handled in node.js
      .filter(|p| p.param_type != "metatype_uuid" && p.param_type != "metatype_name")
      .map(|p| {
        // we must handle the fact that almost every field could be either a number or a string type
        // it's annoying yes, but better to handle it here than try to preemptively convert
        match p.param_type.as_str() {
          "metatype_id" => {
            let value = match p.value.clone() {
              Value::Number(n) => n.as_u64().ok_or(SnapshotError::General(String::from(
                "unable to convert metatype_id",
              )))?,
              Value::String(n) => n.as_str().parse::<u64>()?,
              _ => return Err(SnapshotError::General("unsupported value type".to_string())),
            };

            to_expr("metatype_id", p.operator.clone(), value)
          }
          "data_source" => {
            let value = match p.value.clone() {
              Value::Number(n) => n.as_u64().ok_or(SnapshotError::General(String::from(
                "unable to convert data_source_id",
              )))?,
              Value::String(n) => n.as_str().parse::<u64>()?,
              _ => return Err(SnapshotError::General("unsupported value type".to_string())),
            };

            to_expr("data_source_id", p.operator.clone(), value)
          }
          "id" => {
            let value = match p.value.clone() {
              Value::Number(n) => n
                .as_u64()
                .ok_or(SnapshotError::General(String::from("unable to convert id")))?,
              Value::String(n) => n.as_str().parse::<u64>()?,
              _ => return Err(SnapshotError::General("unsupported value type".to_string())),
            };

            to_expr("id", p.operator.clone(), value)
          }
          "original_id" => {
            let value = match p.value.clone() {
              Value::Number(n) => n
                .as_u64()
                .ok_or(SnapshotError::General(String::from(
                  "unable to convert original_data_id",
                )))?
                .to_string(),
              Value::String(n) => n,
              _ => return Err(SnapshotError::General("unsupported value type".to_string())),
            };

            return match p.operator.clone().as_str() {
              "==" => Ok(col("original_data_id").eq(lit(value))),
              "!=" => Ok(col("original_data_id").neq(lit(value))),
              "like" => Ok(col("original_data_id").str().contains(lit(value), false)),
              _ => Err(SnapshotError::General(String::from(
                "unsupported operator for original_id",
              ))),
            };
          }
          // this is only the first pass for properties, we just check for the property existence in
          // properties json string, so we don't have to serialize things
          "property" => {
            let value = match p.value.clone() {
              Value::Number(n) => n
                .as_u64()
                .ok_or(SnapshotError::General(String::from(
                  "unable to convert original_data_id",
                )))?
                .to_string(),
              Value::String(n) => n,
              _ => return Err(SnapshotError::General("unsupported value type".to_string())),
            };

            Ok(col("properties").str().contains(lit(value), false))
          }
          _ => Err(SnapshotError::General(format!(
            "unsupported edge parameter {}",
            p.param_type.as_str(),
          ))),
        }
      })
      .filter_map(|s| s.map_err(|e| errors.push(e)).ok())
      // we fold this into a select filter that will allow us to build a query plan
      .fold(df.clone().lazy(), |acc, e| acc.filter(e));

    if !errors.is_empty() {
      return Err(SnapshotError::General(format!(
        "unsupported edge parameters: {:?}",
        errors
      )));
    };

    let df = lazy_frame.collect()?;

    // we only return the ids of the nodes to avoid having to build rows out of the dataframe, or
    // serialize into Node records
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
  pub key: Option<String>,
  pub property: Option<String>,
  pub value: Value,
}

fn to_expr<E: Into<Expr>>(
  col_name: &str,
  operator: String,
  value: E,
) -> Result<Expr, SnapshotError> {
  match operator.as_str() {
    "==" => Ok(col(col_name).eq(value)),
    "!=" => Ok(col(col_name).neq(value)),
    "<" => Ok(col(col_name).lt(value)),
    "<=" => Ok(col(col_name).lt_eq(value)),
    ">" => Ok(col(col_name).gt(value)),
    ">=" => Ok(col(col_name).gt_eq(value)),
    _ => Err(SnapshotError::General(String::from("unsupported operator"))),
  }
}
