mod data_types;
mod ingestion;
mod repository;
mod timeseries_errors;
mod timeseries_tests;

use crate::config::Configuration;
use crate::timeseries::data_types::DataTypes;
use crate::timeseries::repository::{
  Bucket, BucketColumn, BucketRepository, ChangeBucketPayload, LegacyTimeseriesColumn,
};
use chrono::NaiveDateTime;
use napi::bindgen_prelude::Buffer;
use serde::{Deserialize, Serialize};
use sqlx::types::Json;
use uuid::Uuid;
use validator::Validate;

// Because we can't send the raw Bucket back to Node, and because we want to work with Objects in
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
  pub unsafe fn begin_legacy_csv_ingestion(
    &mut self,
    data_source_id: String,
    columns: Vec<LegacyTimeseriesColumn>,
  ) -> Result<(), napi::Error> {
    let inner = self.inner.as_mut().ok_or(napi::Error::new(
      napi::Status::GenericFailure,
      "must call init before calling functions",
    ))?;

    match inner.begin_legacy_csv_ingestion(data_source_id, columns) {
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

    match inner.read_data(bytes) {
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
      Err(e) => Err(napi::Error::new(
        napi::Status::GenericFailure,
        e.to_string(),
      )),
    }
  }
}

#[napi]
pub fn infer_legacy_schema(csv: Buffer) -> Result<Vec<LegacyTimeseriesColumn>, napi::Error> {
  match BucketRepository::infer_legacy_schema(csv.to_vec().as_slice()) {
    Ok(results) => Ok(results),
    Err(e) => Err(napi::Error::new(
      napi::Status::GenericFailure,
      e.to_string(),
    )),
  }
}

#[napi]
pub fn infer_bucket_schema(csv: Buffer) -> Result<Vec<JsBucketColumn>, napi::Error> {
  match BucketRepository::infer_bucket_schema(csv.to_vec().as_slice()) {
    Ok(results) => Ok(
      results
        .iter()
        .map(|b| JsBucketColumn::from(b.clone()))
        .collect(),
    ),
    Err(e) => Err(napi::Error::new(
      napi::Status::GenericFailure,
      e.to_string(),
    )),
  }
}
