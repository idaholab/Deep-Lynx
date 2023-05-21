#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

mod config;
mod data_types;
mod errors;
mod tests;

use crate::config::Configuration;
use crate::data_types::{DataTypes, LegacyDataTypes};
use crate::errors::{DataError, ValidationError};
use bytes::Bytes;
use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime};
use futures::stream::BoxStream;
use napi::bindgen_prelude::Buffer;
use rand::distributions::Alphanumeric;
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::postgres::PgPool;
use sqlx::types::Json;
use sqlx::{Executor, Pool, Postgres, Transaction};
use std::collections::HashMap;
use std::env;
use std::future::IntoFuture;
use std::io::{BufReader, Read};
use std::sync::Arc;
use std::task::Poll;
use futures::FutureExt;
use napi::bindgen_prelude::Either14::N;
use tokio::task::JoinHandle;
use uuid::Uuid;
use validator::{HasLen, Validate};

#[derive(Debug, Clone, sqlx::FromRow)]
struct ColumnReturn {
  table_name: Option<String>,
  column_name: Option<String>,
  udt_name: Option<String>, // data type
  numeric_precision: Option<i32>,
  numeric_scale: Option<i32>,
  character_maximum_length: Option<i32>,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow, Clone)]
pub struct Bucket {
  pub id: i32,
  pub name: String,
  pub structure: Json<Vec<BucketColumn>>,
  pub data_table_assignment: Option<String>,
  pub created_by: Option<String>,
  pub modified_by: Option<String>,
  pub created_at: Option<NaiveDateTime>,
  pub modified_at: Option<NaiveDateTime>,
}

#[derive(Debug, Deserialize, Serialize, Clone, Validate)]
pub struct BucketColumn {
  pub name: String, // user provided name, what we'll look for when parsing a CSV
  #[validate(length(max = 31))]
  pub short_name: String, // short name needed in case the name is over 32 characters, postgres's name limit
  pub id: Option<Uuid>,
  pub data_type: DataTypes,
  pub column_assignment: Option<String>, // since the max won't be much over 100 we're fine using i32
  pub format_string: Option<String>,
}

/// Because we can't send the raw Bucket back to Node, and because we want to work with Objects in
/// Node, we built these translation types for the Node return and parameter types
#[derive(Debug, Deserialize, Serialize, Clone, Validate)]
#[napi(object, js_name = "BucketColumn")]
pub struct JsBucketColumn {
  pub name: String, // user provided name, what we'll look for when parsing a CSV
  #[validate(length(max = 31))]
  pub short_name: String, // short name needed in case the name is over 32 characters, postgres's name limit
  pub id: Option<String>,
  pub data_type: String,
  pub column_assignment: Option<String>,
  pub format_string: Option<String>,
  pub numeric_precision: Option<i32>,
  pub numeric_scale: Option<i32>,
  pub max_characters: Option<i32>,
}

#[derive(Clone, Debug)]
#[napi(object)]
pub struct LegacyTimeseriesColumn {
  #[napi(js_name = "column_name")]
  pub column_name: String,
  #[napi(js_name = "property_name")]
  pub property_name: String,
  #[napi(js_name = "is_primary_timestamp")]
  pub is_primary_timestamp: bool,
  #[napi(js_name = "type")]
  pub data_type: String,
  #[napi(js_name = "date_conversion_format_string")]
  pub date_conversion_format_string: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow, Clone)]
#[napi(object, js_name = "Bucket")]
pub struct JsBucket {
  pub id: i32,
  pub name: String,
  pub data_table_assignment: Option<String>,
  pub structure: Vec<JsBucketColumn>,
  pub created_by: Option<String>,
  pub modified_by: Option<String>,
  pub created_at: Option<String>,
  pub modified_at: Option<String>,
}

/// The following are the From/To implementations for the Bucket -> JsBucket -> Bucket so that we
/// can easily move between them without a lot of boilerplate code.
impl From<JsBucket> for Bucket {
  fn from(value: JsBucket) -> Self {
    let created_at = match NaiveDateTime::parse_from_str(
      value
        .created_at
        .unwrap_or(chrono::Utc::now().naive_utc().to_string())
        .as_str(),
      "%Y-%m-%d %H:%M:%S",
    ) {
      Ok(t) => t,
      Err(_) => chrono::Utc::now().naive_utc(),
    };

    let modified_at = match NaiveDateTime::parse_from_str(
      value
        .modified_at
        .unwrap_or(chrono::Utc::now().naive_utc().to_string())
        .as_str(),
      "%Y-%m-%d %H:%M:%S",
    ) {
      Ok(t) => t,
      Err(_) => chrono::Utc::now().naive_utc(),
    };

    let columns: Vec<BucketColumn> = value
      .structure
      .iter()
      .map(|js| BucketColumn::from(js.clone()))
      .collect();

    Bucket {
      id: value.id,
      name: value.name,
      structure: Json(columns),
      data_table_assignment: value.data_table_assignment,
      created_by: value.created_by,
      modified_by: value.modified_by,
      created_at: Some(created_at),
      modified_at: Some(modified_at),
    }
  }
}

impl From<JsBucketColumn> for BucketColumn {
  fn from(value: JsBucketColumn) -> Self {
    let id = value
      .id
      .map(|id| Uuid::parse_str(id.as_str()).unwrap_or(Uuid::new_v4()));

    let mut bc = BucketColumn {
      name: value.name,
      short_name: value.short_name,
      id,
      data_type: DataTypes::from(value.data_type),
      column_assignment: value.column_assignment,
      format_string: value.format_string,
    };

    if bc.data_type == DataTypes::Numeric(0, 0)
      && value.numeric_scale.is_some()
      && value.numeric_precision.is_some()
    {
      bc.data_type = DataTypes::Numeric(
        value.numeric_precision.unwrap(),
        value.numeric_scale.unwrap(),
      );
    }

    if bc.data_type == DataTypes::Varchar(255) && value.max_characters.is_some() {
      bc.data_type = DataTypes::Varchar(value.max_characters.unwrap())
    }

    bc
  }
}

impl From<BucketColumn> for JsBucketColumn {
  fn from(value: BucketColumn) -> Self {
    let id = value.id.map(|u| u.to_string());

    let mut js_column = JsBucketColumn {
      name: value.name,
      short_name: value.short_name,
      id,
      data_type: value.data_type.to_postgres_string(),
      column_assignment: value.column_assignment,
      format_string: value.format_string,
      numeric_precision: None,
      numeric_scale: None,
      max_characters: None,
    };

    match value.data_type {
      DataTypes::Numeric(precision, scale) => {
        js_column.numeric_precision = Some(precision);
        js_column.numeric_scale = Some(scale);
        js_column
      }
      DataTypes::Varchar(max) => {
        js_column.max_characters = Some(max);
        js_column
      }
      _ => js_column,
    }
  }
}

impl From<Bucket> for JsBucket {
  fn from(value: Bucket) -> Self {
    JsBucket {
      id: value.id,
      name: value.name,
      data_table_assignment: value.data_table_assignment,
      structure: value
        .structure
        .iter()
        .map(|c| JsBucketColumn::from(c.clone()))
        .collect(),
      created_by: value.created_by,
      modified_by: value.modified_by,
      created_at: Some(
        value
          .created_at
          .unwrap_or(chrono::Utc::now().naive_utc())
          .to_string(),
      ),
      modified_at: Some(
        value
          .modified_at
          .unwrap_or(chrono::Utc::now().naive_utc())
          .to_string(),
      ),
    }
  }
}

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct ChangeBucketPayload {
  #[validate(length(min = 1))]
  pub name: Option<String>,
  #[validate(length(min = 1))]
  pub columns: Vec<BucketColumn>,
}

#[derive(Debug, Deserialize, Serialize, Validate)]
#[napi(object, js_name = "ChangeBucketPayload")]
pub struct JsChangeBucketPayload {
  #[validate(length(min = 1))]
  pub name: Option<String>,
  #[validate(length(min = 1))]
  pub columns: Vec<JsBucketColumn>,
}

impl From<JsChangeBucketPayload> for ChangeBucketPayload {
  fn from(value: JsChangeBucketPayload) -> Self {
    ChangeBucketPayload {
      name: value.name,
      columns: value
        .columns
        .iter()
        .map(|js| BucketColumn::from(js.clone()))
        .collect(),
    }
  }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct QueryOption {
  pub primary_key: Option<String>,
  pub secondary_key: Option<String>,
  pub primary_start: Option<String>,
  pub primary_end: Option<String>,
  pub secondary_start: Option<String>,
  pub secondary_end: Option<String>,
}

#[derive(Clone)]
pub struct BucketRepository {
  db: PgPool,
  config: Configuration,
  // this is the channel that we pass data into once the data pipeline has been initiated
  stream_reader_channel: Option<Arc<tokio::sync::RwLock<tokio::sync::mpsc::Sender<StreamMessage>>>>,
  // this is how we receive status updates from the reader
  reader_status_channel:
    Option<Arc<tokio::sync::RwLock<tokio::sync::mpsc::Receiver<StreamStatusMessage>>>>,
}

#[napi(js_name = "BucketRepository")]
pub struct JsBucketRepository {
  inner: Option<BucketRepository>,
}

/// JsBucketRepository is the Javascript friendly wrapper over bucket repository.
#[napi]
impl JsBucketRepository {
  #[napi(constructor)]
  #[allow(clippy::all)]
  pub fn new() -> Self {
    JsBucketRepository { inner: None }
  }

  /// # Safety
  ///
  /// This function should be called before any work done on the object
  #[napi]
  pub async unsafe fn init(&mut self, config: Configuration) -> Result<(), napi::Error> {
    let inner = match BucketRepository::new(config).await {
      Ok(b) => b,
      Err(e) => return Err(e.into()),
    };

    self.inner = Some(inner);
    Ok(())
  }

  #[napi]
  pub async fn create_bucket(
    &self,
    payload: JsChangeBucketPayload,
  ) -> Result<JsBucket, napi::Error> {
    let inner = self.inner.clone().ok_or(napi::Error::new(
      napi::Status::GenericFailure,
      "must call init before calling functions",
    ))?;

    match inner.create_bucket(payload.into()).await {
      Ok(r) => Ok(r.into()),
      Err(e) => Err(napi::Error::new(
        napi::Status::GenericFailure,
        e.to_string(),
      )),
    }
  }

  #[napi]
  pub async fn retrieve_bucket(&self, bucket_id: i32) -> Result<JsBucket, napi::Error> {
    let inner = self.inner.clone().ok_or(napi::Error::new(
      napi::Status::GenericFailure,
      "must call init before calling functions",
    ))?;

    match inner.retrieve_bucket(bucket_id).await {
      Ok(r) => Ok(r.into()),
      Err(e) => Err(napi::Error::new(
        napi::Status::GenericFailure,
        e.to_string(),
      )),
    }
  }

  #[napi]
  pub async fn update_bucket(
    &self,
    bucket_id: i32,
    payload: JsChangeBucketPayload,
  ) -> Result<JsBucket, napi::Error> {
    let inner = self.inner.clone().ok_or(napi::Error::new(
      napi::Status::GenericFailure,
      "must call init before calling functions",
    ))?;

    match inner.update_bucket(bucket_id, payload.into()).await {
      Ok(r) => Ok(r.into()),
      Err(e) => Err(napi::Error::new(
        napi::Status::GenericFailure,
        e.to_string(),
      )),
    }
  }

  #[napi]
  pub async fn delete_bucket(&self, bucket_id: i32) -> Result<(), napi::Error> {
    let inner = self.inner.clone().ok_or(napi::Error::new(
      napi::Status::GenericFailure,
      "must call init before calling functions",
    ))?;

    match inner.delete_bucket(bucket_id).await {
      Ok(_) => Ok(()),
      Err(e) => Err(napi::Error::new(
        napi::Status::GenericFailure,
        e.to_string(),
      )),
    }
  }

  #[napi]
  /// # Safety
  ///
  /// This spawns multithreaded operations so be wary. The beginCsvIngestion function initializes the
  /// repository to receive CSV data from a node.js source
  pub async unsafe fn begin_csv_ingestion(&mut self, bucket_id: i32) -> Result<(), napi::Error> {
    let inner = self.inner.as_mut().ok_or(napi::Error::new(
      napi::Status::GenericFailure,
      "must call init before calling functions",
    ))?;

    match inner.begin_csv_ingestion(bucket_id).await {
      Ok(_) => Ok(()),
      Err(e) => Err(napi::Error::new(
        napi::Status::GenericFailure,
        e.to_string(),
      )),
    }
  }

  #[napi]
  /// # Safety
  ///
  /// This spawns multithreaded operations so be wary. The beginCsvIngestion function initializes the
  /// repository to receive CSV data from a node.js source
  pub async unsafe fn begin_legacy_csv_ingestion(&mut self, data_source_id: String, columns: Vec<LegacyTimeseriesColumn>) -> Result<(), napi::Error> {
    let inner = self.inner.as_mut().ok_or(napi::Error::new(
      napi::Status::GenericFailure,
      "must call init before calling functions",
    ))?;

    match inner.begin_legacy_csv_ingestion(data_source_id, columns).await {
      Ok(_) => Ok(()),
      Err(e) => Err(napi::Error::new(
        napi::Status::GenericFailure,
        e.to_string(),
      )),
    }
  }

  #[napi]
  /// # Safety
  ///
  /// A "begin_x_ingestion" must have been called successfully before you attempt to read.
  /// This is how data is passed into our internal pipeline
  pub fn read_data(&mut self, bytes: Buffer) -> Result<(), napi::Error> {
    let bytes: Vec<u8> = bytes.into();

    let inner = self.inner.as_mut().ok_or(napi::Error::new(
      napi::Status::GenericFailure,
      "must call init before calling functions",
    ))?;

    match futures::executor::block_on(inner.read_data(bytes)) {
      Ok(_) => Ok(()),
      Err(e) => Err(napi::Error::new(
        napi::Status::GenericFailure,
        e.to_string(),
      )),
    }
  }

  #[napi]
  /// # Safety
  ///
  /// This terminates multithreaded operations so be wary. This is called when you've completed the
  /// ingestion and can also be used to check for errors during the operation
  pub async unsafe fn complete_ingestion(&mut self) -> Result<(), napi::Error> {
    let inner = self.inner.as_mut().ok_or(napi::Error::new(
      napi::Status::GenericFailure,
      "must call init before calling functions",
    ))?;

    match inner.complete_ingestion().await {
      Ok(_) => Ok(()),
      Err(e) => {
        Err(napi::Error::new(
          napi::Status::GenericFailure,
          e.to_string(),
        ))
      },
    }
  }
}

/// BucketRepository contains all interactions with Buckets and the database layer of the application.
impl BucketRepository {
  /// Create a new BucketRepository, the base for all functions related to Buckets and their
  /// manipulation or data ingestion in the database
  pub async fn new(config: Configuration) -> Result<Self, DataError> {
    let db = PgPool::connect(config.db_connection_string.as_str()).await?;

    Ok(BucketRepository {
      db,
      config,
      stream_reader_channel: None,
      reader_status_channel: None,
    })
  }

  /// Create a new bucket in the database based on a bucket definition
  pub async fn create_bucket(&self, payload: ChangeBucketPayload) -> Result<Bucket, DataError> {
    // first validate the payload before we attempt to do any database work
    payload.validate()?;

    // wrap the operation in a transaction as we might be altering existing tables
    let mut transaction = self.db.begin().await?;
    let mut inserted: Bucket =
      sqlx::query_as("INSERT INTO buckets(name, structure) VALUES($1, $2) RETURNING *")
        .bind(payload.name)
        .bind(json!(payload.columns))
        .fetch_one(&mut transaction)
        .await?;

    // set the bucket structures UUIDs
    for bc in inserted.structure.iter_mut() {
      bc.id = Some(Uuid::new_v4());
    }

    let columns: Vec<ColumnReturn> = sqlx::query_as(
            r#"SELECT table_name, column_name,udt_name, numeric_precision, numeric_scale, character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'buckets' AND  table_name <> 'buckets' AND table_name <> '_sqlx_migrations'
                AND column_name <> '_bucket_id' AND column_name <> '_inserted_at' ORDER BY table_name"#
        )
        .fetch_all(&mut transaction)
        .await?;

    // no columns indicates we have no existing data tables, time to make one
    if columns.is_empty() {
      // this also assigns the columns from the new table to the inserted bucket
      self
        .create_data_table_from(&mut transaction, &mut inserted)
        .await?;
    } else {
      self
        .make_data_table_assignments(&mut transaction, &mut inserted, columns)
        .await?;
    }

    // update the bucket with the new column assignments it gained in the block above
    sqlx::query("UPDATE buckets SET structure = $1, data_table_assignment = $2 WHERE id = $3")
      .bind(json!(inserted.structure))
      .bind(inserted.data_table_assignment.clone())
      .bind(inserted.id)
      .execute(&mut transaction)
      .await?;

    transaction.commit().await?;
    Ok(inserted)
  }

  /// `retrieve_bucket` returns a bucket from the database
  pub async fn retrieve_bucket(&self, bucket_id: i32) -> Result<Bucket, DataError> {
    let current_bucket: Option<Bucket> =
      sqlx::query_as("SELECT * FROM buckets WHERE id = $1 LIMIT 1")
        .bind(bucket_id)
        .fetch_optional(&self.db)
        .await?;

    current_bucket.ok_or(DataError::NotFound)
  }

  /// Amends an existing bucket with new information and potentially new columns. Lots of debate
  /// went into what we could and couldn't update. In the end we've decided to allow the user to
  /// update everything and just deal with it. We want to make sure it's as easy as possible for
  /// our users so we accept the added difficulties
  pub async fn update_bucket(
    &self,
    bucket_id: i32,
    payload: ChangeBucketPayload,
  ) -> Result<Bucket, DataError> {
    payload.validate()?;

    let current_bucket: Option<Bucket> =
      sqlx::query_as("SELECT * FROM buckets WHERE id = $1 LIMIT 1")
        .bind(bucket_id)
        .fetch_optional(&self.db)
        .await?;

    let mut current_bucket = current_bucket.ok_or(DataError::NotFound)?;
    let mut transaction = self.db.begin().await?;

    // column present in both bucket and payload and type has changed
    let mut column_changed_types: Vec<BucketColumn> = current_bucket
      .structure
      .iter_mut()
      .filter_map(|c| {
        payload
          .columns
          .iter()
          .filter(|pc| pc.id.is_some())
          .find(|pc| pc.id == c.id)
          .filter(|&pc| pc.data_type != c.data_type)
      })
      .cloned()
      .collect();

    // columns present on bucket but not on payload where payload has an id
    let deleted_columns: Vec<BucketColumn> = current_bucket
      .structure
      .iter()
      .filter(|c| payload.columns.iter().any(|pc| pc.id != c.id))
      .cloned()
      .collect();

    let deleted_columns = [deleted_columns, column_changed_types.clone()].concat();

    // set the deleted columns data to null so we avoid data pollution in case we pick that
    // column again in assignment phase
    let dc_names: Vec<String> = deleted_columns
      .iter()
      .map(|dc| match dc.column_assignment.clone() {
        None => "".to_string(),
        Some(a) => a,
      })
      .collect();

    let dc_names: Vec<String> = dc_names
      .iter()
      .map(|n| format!("\"{}\" = NULL", n))
      .collect();

    if !dc_names.is_empty() {
      sqlx::query(
        format!(
          "UPDATE buckets.\"{}\" SET {}",
          current_bucket
            .data_table_assignment
            .clone()
            .ok_or(DataError::Unwrap("table assignment".to_string()))?,
          dc_names.join(",")
        )
        .as_str(),
      )
      .bind(bucket_id)
      .execute(&mut transaction)
      .await?;
    }

    // now we need to go through the changed column types, remove the assignment and then combine
    // them with the payload
    let column_changed_types: Vec<BucketColumn> = column_changed_types
      .iter_mut()
      .map(|c| {
        c.column_assignment = None;
        c.clone()
      })
      .collect();

    let updated_payload_columns: Vec<BucketColumn> = payload
      .columns
      .iter()
      .filter(|pc| {
        if pc.id.is_none() {
          return true;
        }

        if column_changed_types.iter().any(|c| c.id == pc.id)
          || deleted_columns.iter().any(|c| c.id == pc.id)
        {
          return false;
        }

        true
      })
      .cloned()
      .collect();

    current_bucket.structure = Json([column_changed_types, updated_payload_columns].concat());

    let columns: Vec<ColumnReturn> = sqlx::query_as(
      r#"SELECT table_name, column_name,udt_name, numeric_precision, numeric_scale, character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = 'buckets' AND  table_name <> 'buckets' AND table_name <> '_sqlx_migrations' AND table_name = '$1'
                AND column_name <> '_bucket_id' AND column_name <> '_inserted_at' ORDER BY table_name"#,
    )
        .bind(current_bucket.data_table_assignment.clone().ok_or(DataError::Unwrap("table assignment".to_string()))?)
        .fetch_all(&mut transaction)
        .await?;

    // now set the new assignments prior to saving the bucket
    self
      .make_data_table_assignments(&mut transaction, &mut current_bucket, columns)
      .await?;

    // update the bucket with the new column assignments it gained in the block above
    let updated: Bucket = match payload.name {
      None => {
        sqlx::query_as("UPDATE buckets SET structure = $1, data_table_assignment = $2 WHERE id = $3 RETURNING *")
          .bind(json!(current_bucket.structure))
          .bind(current_bucket.data_table_assignment.clone())
          .bind(current_bucket.id)
          .fetch_one(&mut transaction)
          .await?
      }
      Some(n) => {
        sqlx::query_as(
          "UPDATE buckets SET name = $1, structure = $2, data_table_assignment = $3 WHERE id = $4 RETURNING *",
        )
        .bind(n)
        .bind(json!(current_bucket.structure))
        .bind(current_bucket.data_table_assignment.clone())
        .bind(current_bucket.id)
        .fetch_one(&mut transaction)
        .await?
      }
    };

    transaction.commit().await?;

    Ok(updated)
  }

  /// deletes a bucket and its data completely
  pub async fn delete_bucket(&self, bucket_id: i32) -> Result<(), DataError> {
    sqlx::query("DELETE FROM buckets WHERE id = $1")
      .bind(bucket_id)
      .execute(&self.db)
      .await?;
    Ok(())
  }

  /// `create_data_table_from` creates a new data table from a bucket definition, also assigns
  /// the columns to the bucket and handles the internal transaction passed to it from the caller
  async fn create_data_table_from<'a>(
    &self,
    transaction: &mut Transaction<'a, Postgres>,
    bucket: &mut Bucket,
  ) -> Result<(), DataError> {
    let mut column_declarations: Vec<String> = vec![];

    for bucket_column in bucket.structure.iter_mut() {
      let rand_column_name: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(7)
        .map(char::from)
        .collect();

      let rand_column_name = rand_column_name.to_lowercase();

      column_declarations.push(format!(
        "\"{rand_column_name}\" {} DEFAULT NULL",
        bucket_column.data_type.to_postgres_string()
      ));

      bucket_column.column_assignment = Some(rand_column_name);
    }

    let rand_table_name: String = rand::thread_rng()
      .sample_iter(&Alphanumeric)
      .take(7)
      .map(char::from)
      .collect();

    let rand_table_name = rand_table_name.to_lowercase();
    let rand_table_name = rand_table_name.as_str();
    let create_statement = format!(
      "
                CREATE TABLE IF NOT EXISTS buckets.\"{rand_table_name}\"(
                    _inserted_at TIMESTAMP DEFAULT NOW(),
                    _bucket_id INT,
                    {}
                )
            ",
      column_declarations.join(",")
    );

    transaction.execute(create_statement.as_str()).await?;

    let index_statement = format!(
      "
                CREATE INDEX _{rand_table_name}_bucket_idx ON buckets.\"{rand_table_name}\"(_bucket_id)
            "
    );
    transaction.execute(index_statement.as_str()).await?;

    bucket.data_table_assignment = Some(rand_table_name.to_string());

    // now to create the hypertable
    transaction
      .execute(
        format!("SELECT create_hypertable('buckets.{rand_table_name}', '_inserted_at')").as_str(),
      )
      .await?;

    Ok(())
  }

  /// `make_data_table_assignments` makes the column and table assignments for a bucket - needs the
  /// transaction in order to potentially make a new table if needed
  async fn make_data_table_assignments<'a>(
    &self,
    transaction: &mut Transaction<'a, Postgres>,
    bucket: &mut Bucket,
    columns: Vec<ColumnReturn>,
  ) -> Result<(), DataError> {
    // let's move from unordered columns into ordered tables - though we're not sorting the
    // tables, we'll pick the first one that matches our parameters for right now
    let mut column_map: HashMap<String, Vec<ColumnReturn>> = HashMap::new();
    for column in &columns {
      let table_name = column
        .clone()
        .table_name
        .ok_or(DataError::Unwrap("table name unwrap".to_string()))?;

      if !column_map.contains_key(&table_name) {
        column_map.insert(table_name, vec![column.clone()]);
      } else {
        let mut internal = column_map
          .get(&table_name)
          .ok_or(DataError::Unwrap("table hash map fetch unwrap".to_string()))?
          .clone();

        internal.push(column.clone());

        column_map.insert(table_name, internal);
      }
    }

    // check to see if this is an update to an existing set of assignments, this helps us
    // override the max columns check later on, column assignments are wiped between table
    //checks otherwise.
    let len = bucket.structure.len();
    let mut unassigned_bucket_columns: Vec<&mut BucketColumn> = bucket
      .structure
      .iter_mut()
      .filter(|s| s.column_assignment.is_none())
      .collect();
    let is_update = unassigned_bucket_columns.len() < len;

    // now that we're sorted into tables, compare each table to the bucket until we find the
    // first one that fits
    for (table_name, columns) in column_map {
      // if we've already got a table assignment, skip until the right table
      if bucket.data_table_assignment.is_some()
        && bucket
          .data_table_assignment
          .clone()
          .ok_or(DataError::Unwrap("data table assignment".to_string()))?
          != table_name
      {
        continue;
      }

      let mut assigned_columns: Vec<String> = vec![];

      // match the bucket columns to the first available, un-taken datatable column
      for bucket_column in unassigned_bucket_columns.iter_mut() {
        let valid_column = columns.iter().find(|&c| {
          let column_data_type = match &c.udt_name {
            None => return false,
            Some(t) => t,
          };

          let mut column_data_type = DataTypes::from(column_data_type.to_string());
          // need to capture precision or max length for certain data types for accuracy
          match column_data_type {
            DataTypes::Numeric(_, _) => {
              column_data_type = DataTypes::Numeric(
                c.numeric_precision.unwrap_or(0),
                c.numeric_scale.unwrap_or(0),
              )
            }
            DataTypes::Varchar(_) => {
              column_data_type = DataTypes::Varchar(c.character_maximum_length.unwrap())
            }
            _ => {}
          };

          column_data_type == bucket_column.data_type
            && !assigned_columns.contains(&c.column_name.clone().unwrap())
        });

        // valid column indicates we can store this bucket column in it
        match valid_column {
          None => {}
          Some(vc) => {
            bucket_column.column_assignment = vc.column_name.clone();
            assigned_columns.push(
              vc.column_name
                .clone()
                .ok_or(DataError::Unwrap("column name unwrap".to_string()))?,
            )
          }
        }
      }

      let unassigned_columns: Vec<&&mut BucketColumn> = unassigned_bucket_columns
        .iter()
        .filter(|&bc| bc.column_assignment.is_none())
        .collect();

      // if no unassigned, we can say this is our table assigment
      if unassigned_columns.length() == 0 {
        bucket.data_table_assignment = Some(table_name);
        return Ok(());
      }

      // if adding unassigned columns would push this data table over the limit wipe and
      // start all the way over
      let max_columns = self.config.max_columns.unwrap_or(100);

      if (columns.length() > max_columns as u64
        || unassigned_columns.length() > max_columns as u64 - columns.length())
        && !is_update
      {
        for bucket_column in unassigned_bucket_columns.iter_mut() {
          bucket_column.column_assignment = None;
        }

        continue;
      }

      // if we made it here then we need to add the columns to the data table and make the assignment
      let mut column_declarations: Vec<String> = vec![];
      for column in bucket.structure.iter_mut() {
        if column.column_assignment.is_some() {
          continue;
        }

        let rand_column_name: String = rand::thread_rng()
          .sample_iter(&Alphanumeric)
          .take(7)
          .map(char::from)
          .collect();

        column_declarations.push(format!(
          "ADD COLUMN \"{rand_column_name}\" {} DEFAULT NULL",
          column.data_type.to_postgres_string()
        ));

        column.column_assignment = Some(rand_column_name);
      }

      bucket.data_table_assignment = Some(table_name.clone());

      // now add the columns
      let alter_statement = format!(
        r#"
                    ALTER TABLE buckets."{}" {}
                "#,
        table_name,
        column_declarations.join(",")
      );

      transaction.execute(alter_statement.as_str()).await?;
      return Ok(());
    }

    // if we're here it's because we had no tables that matched or had enough columns left
    // so now we make one
    self.create_data_table_from(transaction, bucket).await
  }

  /// `ingest_bucket_data` takes a readable stream of CSV formatted data and attempts to ingest that
  /// data into the given bucket by ID. Note that if your CSV data does not implement all columns
  /// of your bucket, only the columns you've included in the csv will be ingested and no error
  /// given. If your CSV data has too many columns, only those columns defined in the bucket will
  /// be ingested, with no error given. If you have columns with duplicate names, only the first
  /// instance of that name will be ingested if it doesnt error.
  pub async fn ingest_csv<T: Read>(
    db: Pool<Postgres>,
    reader: T,
    bucket_id: i32,
  ) -> Result<(), DataError> {
    // fetch the bucket first
    let bucket: Bucket = sqlx::query_as("SELECT * FROM buckets WHERE id = $1")
      .bind(bucket_id)
      .fetch_optional(&db)
      .await?
      .ok_or(DataError::NotFound)?;

    let mut csv_reader = csv::ReaderBuilder::new().flexible(false).from_reader(reader);
    // let's fetch the headers - also a quick way to check if we're actually dealing with a csv
    // they should stay in the order they are in the CSV - index, csv name, column name
    #[derive(Clone)]
    struct Position {
      index: usize,
      column_name: String,
      data_type: DataTypes,
      format_string: Option<String>,
    }

    let mut positions: Vec<Position> = vec![];
    for (i, header) in csv_reader.headers()?.iter().enumerate() {
      // check to see if that header exists in the bucket definition, if it does, record its
      // spot and name
      match bucket
        .structure
        .iter()
        .find(|bc| bc.name.as_str() == header)
      {
        None => {}
        Some(bc) => positions.push(Position {
          index: i,
          column_name: bc.column_assignment.clone().ok_or(DataError::Unwrap(
            "column assignment not present".to_string(),
          ))?,
          data_type: bc.data_type.clone(),
          format_string: bc.format_string.clone(),
        }),
      }
    }

    if positions.is_empty() {
      return Err(DataError::CsvValidation(ValidationError::MissingColumns));
    }

    let column_names: Vec<String> = positions
      .clone()
      .iter()
      .map(|pos| format!("\"{}\"", pos.column_name.clone()))
      .collect();

    let mut copier = db
        .copy_in_raw(
          format!(
            "COPY buckets.\"{}\"({},_bucket_id) FROM STDIN WITH (FORMAT csv, HEADER FALSE, DELIMITER \",\")",
            bucket
                .data_table_assignment
                .ok_or(DataError::Unwrap("table name from bucket".to_string()))?,
            column_names.join(",")
          )
              .as_str(),
        )
        .await?;

    // in order to append the bucket_id we have to actually parse the csv row per row and send
    // it into the copier - it's really not that slow since the underlying async reader has is
    // buffered
    while let Some(record) = csv_reader.records().next() {
      let record = record?;
      let mut new_record: Vec<String> = vec![];

      for position in &positions {
        let value = record
          .get(position.index)
          .ok_or(DataError::Unwrap(format!("csv record field: {}, {:?}", position.index, record)))?;

        match position.data_type {
          DataTypes::TimestampWithTimezone => {
            let format_string = match position.format_string.clone() {
              None => "%Y-%m-%d %H:%M:%S%:::z".to_string(),
              Some(s) => s,
            };

            let timestamptz = DateTime::parse_from_str(value, format_string.as_str())?;
            new_record.push(timestamptz.to_string())
          }
          DataTypes::Timestamp => {
            let format_string = match position.format_string.clone() {
              None => "%Y-%m-%d %H:%M:%S".to_string(),
              Some(s) => s,
            };

            let timestamp = NaiveDateTime::parse_from_str(value, format_string.as_str())?;
            new_record.push(timestamp.to_string())
          }
          DataTypes::Date => {
            let format_string = match position.format_string.clone() {
              None => "%Y-%m-%d".to_string(),
              Some(s) => s,
            };

            let date = NaiveDate::parse_from_str(value, format_string.as_str())?;
            new_record.push(date.to_string())
          }
          DataTypes::Time => {
            let format_string = match position.format_string.clone() {
              None => "%H:%M:%S".to_string(),
              Some(s) => s,
            };

            let time = NaiveTime::parse_from_str(value, format_string.as_str())?;
            new_record.push(time.to_string())
          }
          _ => new_record.push(value.to_string()),
        };
      }

      new_record.push(format!("{bucket_id}"));
      copier
        .send([new_record.join(",").as_bytes(), "\n".as_bytes()].concat())
        .await?;
    }

    copier.finish().await?;
    Ok(())
  }

  /// ingest_csv_legacy allows us to use the same paradigm as all other bucket ingestion patterns here
  pub async fn ingest_csv_legacy<T: Read>(
    db: Pool<Postgres>,
    reader: T,
    data_source_id: String,
    columns: Vec<LegacyTimeseriesColumn>
  ) -> Result<(), DataError> {
    let mut csv_reader = csv::ReaderBuilder::new().flexible(true).from_reader(reader);
    // let's fetch the headers - also a quick way to check if we're actually dealing with a csv
    // they should stay in the order they are in the CSV - index, csv name, column name
    #[derive(Clone)]
    struct Position {
      index: usize,
      column_name: String,
      data_type: LegacyDataTypes,
      format_string: Option<String>,
    }

    let mut positions: Vec<Position> = vec![];
    for (i, header) in csv_reader.headers()?.iter().enumerate() {
      // check to see if that header exists in the bucket definition, if it does, record its
      // spot and name
      match columns
          .iter()
          .find(|bc| bc.property_name.as_str() == header)
      {
        None => {}
        Some(bc) => positions.push(Position {
          index: i,
          column_name: bc.column_name.clone(),
          data_type: bc.data_type.clone().into(),
          format_string: bc.date_conversion_format_string.clone(),
        }),
      }
    }

    if positions.is_empty() {
      return Err(DataError::CsvValidation(ValidationError::MissingColumns));
    }

    let column_names: Vec<String> = positions
        .clone()
        .iter()
        .map(|pos| format!("\"{}\"", pos.column_name.clone()))
        .collect();

    let mut copier = db
        .copy_in_raw(
          format!(
            "COPY y_{}({}) FROM STDIN WITH (FORMAT csv, HEADER FALSE, DELIMITER \",\")",
            data_source_id,
            column_names.join(",")
          )
              .as_str(),
        )
        .await?;

    // in order to append the bucket_id we have to actually parse the csv row per row and send
    // it into the copier - it's really not that slow since the underlying async reader has is
    // buffered
    while let Some(record) = csv_reader.records().next() {
      let record = record?;
      let mut new_record: Vec<String> = vec![];

      for position in &positions {
        let value = record
            .get(position.index)
            .ok_or(DataError::Unwrap("csv record field".to_string()))?;

        match position.data_type {
          LegacyDataTypes::Date => {
            let format_string = match position.format_string.clone() {
              None => "%Y-%m-%d %H:%M:%S".to_string(),
              Some(s) => s,
            };

            let timestamp = NaiveDateTime::parse_from_str(value, format_string.as_str())?;
            new_record.push(timestamp.to_string())
          }
          _ => new_record.push(value.to_string()),
        };
      }

      copier
          .send([new_record.join(",").as_bytes(), "\n".as_bytes()].concat())
          .await?;
    }
    println!("out of copier");

    copier.finish().await?;
    Ok(())
  }

  /// `download_data_simple` is a simple data download function to bring this microservice into
  /// feature parity with the current service and enables the "download data source" route to
  /// continue to work from DeepLynx
  pub async fn download_data_simple(
    &self,
    bucket_id: i32,
    query_options: Vec<QueryOption>,
  ) -> Result<BoxStream<Result<Bytes, sqlx::Error>>, DataError> {
    let bucket: Bucket = sqlx::query_as("SELECT * FROM buckets WHERE id = $1")
      .bind(bucket_id)
      .fetch_one(&self.db)
      .await?;

    let select_as_statements: Vec<String> = bucket
      .structure
      .iter()
      .map(|bc| {
        format!(
          r#""{}" as "{}""#,
          bc.column_assignment.clone().unwrap(),
          bc.short_name
        )
      })
      .collect();

    let mut where_statements: Vec<String> = vec![];

    for option in query_options {
      match option.primary_key {
        None => {}
        Some(pk) => {
          let column = bucket
            .structure
            .iter()
            .find(|bc| bc.name == pk)
            .ok_or(DataError::Unwrap(
              "column name passed to query options doesn't exist".to_string(),
            ))?
            .column_assignment
            .clone()
            .ok_or(DataError::Unwrap("column name not present".to_string()))?;

          let primary_start = option.primary_start.ok_or(DataError::Unwrap(
            "primary key provided but no start value provided".to_string(),
          ))?;

          match option.primary_end {
            None => {
              where_statements.push(format!(r#""{}" > '{}'"#, column, primary_start));
            }
            Some(end) => {
              where_statements.push(format!(
                r#""{}" > '{}' AND "{}" < '{}' "#,
                column, primary_start, pk, end
              ));
            }
          };
        }
      };

      match option.secondary_key {
        None => {}
        Some(sk) => {
          let column = bucket
            .structure
            .iter()
            .find(|bc| bc.name == sk)
            .ok_or(DataError::Unwrap(
              "column name passed to query options doesn't exist".to_string(),
            ))?
            .column_assignment
            .clone()
            .ok_or(DataError::Unwrap("column name".to_string()))?;

          let secondary_start = option.secondary_start.ok_or(DataError::Unwrap(
            "secondary key provided but no start value provided".to_string(),
          ))?;

          match option.secondary_end {
            None => {
              where_statements.push(format!(r#""{}" > '{}'"#, column, secondary_start));
            }
            Some(end) => {
              where_statements.push(format!(
                r#""{}" > '{}' AND "{}" < '{}' "#,
                column, secondary_start, column, end
              ));
            }
          };
        }
      };
    }

    let statement = match where_statements.is_empty() {
      true => {
        format!(
          r#"SELECT {} FROM buckets."{}""#,
          select_as_statements.join(","),
          bucket
            .data_table_assignment
            .ok_or(DataError::Unwrap("column table assignment".to_string()))?
        )
      }
      false => {
        format!(
          r#"COPY (SELECT {} FROM buckets."{}" WHERE {}) TO STDOUT WITH (FORMAT csv, HEADER TRUE)"#,
          select_as_statements.join(","),
          bucket
            .data_table_assignment
            .ok_or(DataError::Unwrap("column table assignment".to_string()))?,
          where_statements.join("AND")
        )
      }
    };

    let result = self.db.copy_out_raw(statement.as_str()).await?;
    Ok(result)
  }

  /// `begin_csv_ingestion` intializes a data pipeline and prepares it to receive csv data from a node.js
  /// readable stream. We have to do things this way because there is no stream interopt between Rust
  /// and node.js - so we basically spin up a thread to handle ingestion and then stream the data from
  /// node.js to it
  pub async fn begin_csv_ingestion(&mut self, bucket_id: i32) -> Result<(), DataError> {
    let (tx, rx) = tokio::sync::mpsc::channel::<StreamMessage>(2048);
    let (status_tx, status_rx) = tokio::sync::mpsc::channel::<StreamStatusMessage>(2048);
    let db_connection = self.db.clone();

    // inner multithreaded loop to handle the copy from the csv file to the db
    tokio::task::spawn(async move {
      let stream_reader = NodeStreamReader::new(rx);

      let result = BucketRepository::ingest_csv(db_connection, stream_reader, bucket_id).await;
      println!("sending stream status close");
      match result {
        Ok(_) => match status_tx.send(StreamStatusMessage::Complete).await{
          Ok(_) => Ok(()),
          Err(e) => Err(DataError::Thread(e.to_string())),
        },
        Err(e) => match status_tx.send(StreamStatusMessage::Error(e)).await{
          Ok(_) => Ok(()),
          Err(e) => Err(DataError::Thread(format!("ingest csv problem: {}", e))),
        },
      }
    });

    // set that status message receiver so that the complete ingestion can wait on it
    self.stream_reader_channel = Some(Arc::new(tokio::sync::RwLock::new(tx)));
    self.reader_status_channel = Some(Arc::new(tokio::sync::RwLock::new(status_rx)));
    Ok(())
  }

  /// `begin_legacy_csv_ingestion` intializes a data pipeline and prepares it to receive csv data from a node.js
  /// readable stream. We have to do things this way because there is no stream interopt between Rust
  /// and node.js - so we basically spin up a thread to handle ingestion and then stream the data from
  /// node.js to it
  pub async fn begin_legacy_csv_ingestion(&mut self, data_source_id: String, columns: Vec<LegacyTimeseriesColumn>) -> Result<(), DataError> {
    let (tx, rx) = tokio::sync::mpsc::channel::<StreamMessage>(2048);
    let (status_tx, status_rx) = tokio::sync::mpsc::channel::<StreamStatusMessage>(2058);
    let db_connection = self.db.clone();

    // inner multithreaded loop to handle the copy from the csv file to the db
    tokio::task::spawn(async move {
      let stream_reader = NodeStreamReader::new(rx);

      match BucketRepository::ingest_csv_legacy(db_connection, stream_reader, data_source_id, columns).await {
        Ok(_) => match status_tx.send(StreamStatusMessage::Complete).await{
          Ok(_) => Ok(()),
          Err(e) => Err(DataError::Thread(e.to_string())),
        },
        Err(e) => match status_tx.send(StreamStatusMessage::Error(e)).await {
          Ok(_) => Ok(()),
          Err(e) => Err(DataError::Thread(format!("ingest csv problem: {}", e))),
        },
      }
    });


    // set that status message receiver so that the complete ingestion can wait on it
    self.stream_reader_channel = Some(Arc::new(tokio::sync::RwLock::new(tx)));
    self.reader_status_channel = Some(Arc::new(tokio::sync::RwLock::new(status_rx)));
    Ok(())
  }

  /// `read_data` is called by the stream to pass data into the previously configured multithreaded
  /// reader. Call this function regardless of what starting method you called to ingest the data
  pub async fn read_data(&mut self, bytes: Vec<u8>) -> Result<(), DataError> {
    let channel = self
      .stream_reader_channel
      .as_mut()
      .ok_or(DataError::Unwrap("no reader channel".to_string()))?;

    let channel = channel.write().await;
    match channel.send(StreamMessage::Write(bytes)).await {
      Ok(_) => Ok(()),
      Err(e) => {
        channel.send(StreamMessage::Close);
        Err(DataError::Thread(e.to_string()))
      },
    }
  }

  /// `complete ingestion` waits for either the first error message or complete status from the
  /// stream thread - this is how we can let users wait for the ingestion to be completed and how
  /// we can eventually send data back - this is called regardless of what starting method you called
  /// to ingest data
  pub async fn complete_ingestion(&mut self) -> Result<(), DataError> {
    let reader_channel = self
      .stream_reader_channel
      .as_mut()
      .ok_or(DataError::Unwrap("no stream status channel".to_string()))?;

    let reader_channel = reader_channel.write().await;
    match reader_channel.send(StreamMessage::Close).await {
      Ok(_) => {}
      Err(e) => {
        return Err(DataError::Thread(format!(
          "unable to send close message to reader {}",
          e
        )))
      }
    }

    let channel = self
      .reader_status_channel
      .as_mut()
      .ok_or(DataError::Unwrap("no stream status channel".to_string()))?;

    let mut channel = channel.write().await;

    match channel.recv().await {
      None => {
        Err(DataError::Thread(
          "channel closed before message could be received".to_string(),
        ))
      },
      Some(m) => match m {
        StreamStatusMessage::Error(e) => {
          Err(e)
        },
        StreamStatusMessage::Complete => {
          Ok(())
        },
      },
    }
  }
}

/*
This entire section is our async reader for pulling in from node.js streams. This allows us to
setup an async reader to pass into things like the CSV parser and allows us to async ingest data
 */
#[derive(Debug)]
enum StreamMessage {
  Write(Vec<u8>),
  Close,
}

enum StreamStatusMessage {
  Error(DataError),
  Complete,
}

pub struct NodeStreamReader {
  channel: tokio::sync::mpsc::Receiver<StreamMessage>,
  buffer: Vec<u8>,
  is_closed: bool,
}

impl NodeStreamReader {
  fn new(rx: tokio::sync::mpsc::Receiver<StreamMessage>) -> Self {
    NodeStreamReader {
      channel: rx,
      buffer: vec![],
      is_closed: false,
    }
  }
}

impl Read for NodeStreamReader {
  fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
    if self.is_closed {
      return Ok(0);
    }

    if self.buffer.len() >= buf.len() {
      let send = self.buffer.clone();
      self.buffer = vec![];

      if send.len() > buf.len() {
        let (dest, overflow) = send.split_at(buf.len());

        buf.copy_from_slice(dest);
        self.buffer.extend_from_slice(overflow);

        return Ok(dest.len());
      } else {
        buf.copy_from_slice(send.as_slice());
        return Ok(buf.len());
      }
    }

    while let Some(message) = futures::executor::block_on(self.channel.recv()) {
      match message {
        StreamMessage::Write(bytes) => self.buffer.extend_from_slice(bytes.as_slice()),
        StreamMessage::Close => {
          println!("close message received");
          self.is_closed = true;
          buf[..self.buffer.len()].copy_from_slice(self.buffer.as_slice());
          let len = self.buffer.len();
          self.buffer = vec![];

          return Ok(len);
        }
      }

      if self.buffer.len() >= buf.len() {
        break;
      }
    }

    let send = self.buffer.clone();
    self.buffer = vec![];

    if send.len() > buf.len() {
      let (dest, overflow) = send.split_at(buf.len());

      buf.copy_from_slice(dest);
      self.buffer.extend_from_slice(overflow);

      Ok(dest.len())
    } else {
      buf.copy_from_slice(send.as_slice());
      Ok(buf.len())
    }
  }
}
