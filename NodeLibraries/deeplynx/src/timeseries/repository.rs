use crate::config::Configuration;
use crate::timeseries::data_types::{DataTypes, LegacyDataTypes};
use crate::timeseries::ingestion;
use crate::timeseries::timeseries_errors::TimeseriesError;
use chrono::NaiveDateTime;
use rand::distributions::Alphanumeric;
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::postgres::PgPool;
use sqlx::types::Json;
use sqlx::{Executor, Postgres, Transaction};
use std::collections::HashMap;
use std::io::Read;
use std::sync::Arc;
use tokio::sync::mpsc::error::TryRecvError;
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

#[derive(Debug, Deserialize, Serialize, Validate)]
pub struct ChangeBucketPayload {
  #[validate(length(min = 1))]
  pub name: Option<String>,
  #[validate(length(min = 1))]
  pub columns: Vec<BucketColumn>,
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
  stream_reader_channel: Option<Arc<tokio::sync::mpsc::UnboundedSender<StreamMessage>>>,
  // this is how we receive status updates from the reader
  reader_status_channel:
    Option<Arc<tokio::sync::RwLock<tokio::sync::mpsc::Receiver<StreamStatusMessage>>>>,
}

/// BucketRepository contains all interactions with Buckets and the database layer of the application.
impl BucketRepository {
  /// Create a new BucketRepository, the base for all functions related to Buckets and their
  /// manipulation or data ingestion in the database
  pub async fn new(config: Configuration) -> Result<Self, TimeseriesError> {
    let connection_string = config
      .db_connection_string
      .clone()
      .ok_or(TimeseriesError::MissingConnectionString)?;
    let db = PgPool::connect(connection_string.as_str()).await?;

    Ok(BucketRepository {
      db,
      config,
      stream_reader_channel: None,
      reader_status_channel: None,
    })
  }

  /// Create a new bucket in the database based on a bucket definition
  pub async fn create_bucket(
    &self,
    payload: ChangeBucketPayload,
  ) -> Result<Bucket, TimeseriesError> {
    // first validate the payload before we attempt to do any database work
    payload.validate()?;

    // wrap the operation in a transaction as we might be altering existing tables
    let mut transaction = self.db.begin().await?;
    let mut inserted: Bucket =
      sqlx::query_as("INSERT INTO buckets(name, structure) VALUES($1, $2) RETURNING *")
        .bind(payload.name)
        .bind(json!(payload.columns))
        .fetch_one(transaction.as_mut())
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
            .fetch_all(transaction.as_mut())
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
      .execute(transaction.as_mut())
      .await?;

    transaction.commit().await?;
    Ok(inserted)
  }

  /// `retrieve_bucket` returns a bucket from the database
  pub async fn retrieve_bucket(&self, bucket_id: i32) -> Result<Bucket, TimeseriesError> {
    let current_bucket: Option<Bucket> =
      sqlx::query_as("SELECT * FROM buckets WHERE id = $1 LIMIT 1")
        .bind(bucket_id)
        .fetch_optional(&self.db)
        .await?;

    current_bucket.ok_or(TimeseriesError::NotFound)
  }

  /// Amends an existing bucket with new information and potentially new columns. Lots of debate
  /// went into what we could and couldn't update. In the end we've decided to allow the user to
  /// update everything and just deal with it. We want to make sure it's as easy as possible for
  /// our users so we accept the added difficulties
  pub async fn update_bucket(
    &self,
    bucket_id: i32,
    payload: ChangeBucketPayload,
  ) -> Result<Bucket, TimeseriesError> {
    payload.validate()?;

    let current_bucket: Option<Bucket> =
      sqlx::query_as("SELECT * FROM buckets WHERE id = $1 LIMIT 1")
        .bind(bucket_id)
        .fetch_optional(&self.db)
        .await?;

    let mut current_bucket = current_bucket.ok_or(TimeseriesError::NotFound)?;
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
            .ok_or(TimeseriesError::Unwrap("table assignment".to_string()))?,
          dc_names.join(",")
        )
        .as_str(),
      )
      .bind(bucket_id)
      .execute(transaction.as_mut())
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
            .bind(current_bucket.data_table_assignment.clone().ok_or(TimeseriesError::Unwrap("table assignment".to_string()))?)
            .fetch_all(transaction.as_mut())
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
                    .fetch_one(transaction.as_mut())
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
                    .fetch_one(transaction.as_mut())
                    .await?
            }
        };

    transaction.commit().await?;

    Ok(updated)
  }

  /// deletes a bucket and its data completely
  pub async fn delete_bucket(&self, bucket_id: i32) -> Result<(), TimeseriesError> {
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
  ) -> Result<(), TimeseriesError> {
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
  ) -> Result<(), TimeseriesError> {
    // let's move from unordered columns into ordered tables - though we're not sorting the
    // tables, we'll pick the first one that matches our parameters for right now
    let mut column_map: HashMap<String, Vec<ColumnReturn>> = HashMap::new();
    for column in &columns {
      let table_name = column
        .clone()
        .table_name
        .ok_or(TimeseriesError::Unwrap("table name unwrap".to_string()))?;

      if !column_map.contains_key(&table_name) {
        column_map.insert(table_name, vec![column.clone()]);
      } else {
        let mut internal = column_map
          .get(&table_name)
          .ok_or(TimeseriesError::Unwrap(
            "table hash map fetch unwrap".to_string(),
          ))?
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
          .ok_or(TimeseriesError::Unwrap("data table assignment".to_string()))?
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
                .ok_or(TimeseriesError::Unwrap("column name unwrap".to_string()))?,
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

  /// `infer_bucket_schema` takes a csv file and attempts to guess what the correct bucket column
  /// data types should be - this should not be used without user input to validate and accept the
  /// results as this is a rough estimate at best and will not handle things like timestamps
  pub fn infer_bucket_schema<T: Read>(reader: T) -> Result<Vec<BucketColumn>, TimeseriesError> {
    let mut csv_reader = csv::ReaderBuilder::new().from_reader(reader);

    let mut results: Vec<BucketColumn> = csv_reader
      .headers()?
      .iter()
      .map(|h| BucketColumn {
        name: h.to_string(),
        short_name: "".to_string(),
        id: None,
        data_type: DataTypes::Bool,
        column_assignment: None,
        format_string: None,
      })
      .collect();

    while let Some(record) = csv_reader.records().next() {
      let record = record?;

      for (i, column) in results.iter_mut().enumerate() {
        let value = match record.get(i) {
          None => continue,
          Some(v) => v,
        };

        if value.is_empty() {
          continue;
        }

        if value.to_lowercase() == "true" || value.to_lowercase() == "false" {
          column.data_type = DataTypes::Bool;
          continue;
        }

        if value.starts_with('{') && value.ends_with('}') {
          column.data_type = DataTypes::Jsonb;
          continue;
        }

        if value.replace(',', "").parse::<i32>().is_ok() {
          column.data_type = DataTypes::Int;
          continue;
        }

        if value.replace(',', "").parse::<i64>().is_ok() {
          column.data_type = DataTypes::BigInt;
          continue;
        }

        // we can't do the same stripping on floats because of european number notation with commas
        if value.parse::<f64>().is_ok() {
          column.data_type = DataTypes::Double;
          continue;
        }

        column.data_type = DataTypes::Text;
      }
    }

    Ok(results)
  }

  pub fn infer_legacy_schema<T: Read>(
    reader: T,
  ) -> Result<Vec<LegacyTimeseriesColumn>, TimeseriesError> {
    let mut csv_reader = csv::ReaderBuilder::new().from_reader(reader);

    let mut results: Vec<LegacyTimeseriesColumn> = csv_reader
      .headers()?
      .iter()
      .map(|h| LegacyTimeseriesColumn {
        column_name: h.to_string(),
        property_name: "".to_string(),
        is_primary_timestamp: false,
        data_type: "".to_string(),
        date_conversion_format_string: None,
      })
      .collect();

    while let Some(record) = csv_reader.records().next() {
      let record = record?;

      for (i, column) in results.iter_mut().enumerate() {
        let value = match record.get(i) {
          None => continue,
          Some(v) => v,
        };

        if value.is_empty() {
          continue;
        }

        if value.to_lowercase() == "true" || value.to_lowercase() == "false" {
          column.data_type = LegacyDataTypes::Boolean.into();
          continue;
        }

        if value.starts_with('{') && value.ends_with('}') {
          column.data_type = LegacyDataTypes::Json.into();
          continue;
        }

        if value.replace(',', "").parse::<i32>().is_ok() {
          column.data_type = LegacyDataTypes::Number.into();
          continue;
        }

        if value.replace(',', "").parse::<i64>().is_ok() {
          column.data_type = LegacyDataTypes::Number64.into();
          continue;
        }

        // we can't do the same stripping on floats because of european number notation with commas
        if value.parse::<f64>().is_ok() {
          column.data_type = LegacyDataTypes::Float64.into();
          continue;
        }

        column.data_type = LegacyDataTypes::String.into();
      }
    }

    Ok(results)
  }

  /*   TODO: Correct this function eventually, not needed for a while since we'll be using node to query
  /// `download_data_simple` is a simple data download function to bring this microservice into
     /// feature parity with the current service and enables the "download data source" route to
     /// continue to work from DeepLynx
     pub async fn download_data_simple(
         &self,
         bucket_id: i32,
         query_options: Vec<QueryOption>,
     ) -> Result<BoxStream<Result<Bytes, sqlx::Error>>, TimeseriesError> {
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
                         .ok_or(TimeseriesError::Unwrap(
                             "column name passed to query options doesn't exist".to_string(),
                         ))?
                         .column_assignment
                         .clone()
                         .ok_or(TimeseriesError::Unwrap("column name not present".to_string()))?;

                     let primary_start = option.primary_start.ok_or(TimeseriesError::Unwrap(
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
                         .ok_or(TimeseriesError::Unwrap(
                             "column name passed to query options doesn't exist".to_string(),
                         ))?
                         .column_assignment
                         .clone()
                         .ok_or(TimeseriesError::Unwrap("column name".to_string()))?;

                     let secondary_start = option.secondary_start.ok_or(TimeseriesError::Unwrap(
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
                         .ok_or(TimeseriesError::Unwrap("column table assignment".to_string()))?
                 )
             }
             false => {
                 format!(
                     r#"COPY (SELECT {} FROM buckets."{}" WHERE {}) TO STDOUT WITH (FORMAT csv, HEADER TRUE)"#,
                     select_as_statements.join(","),
                     bucket
                         .data_table_assignment
                         .ok_or(TimeseriesError::Unwrap("column table assignment".to_string()))?,
                     where_statements.join("AND")
                 )
             }
         };

         let mut connection = self.db.acquire().await?;
         let result = connection.copy_out_raw(statement.as_str()).await?;
         Ok(result)
     }*/

  /// `begin_csv_ingestion` intializes a data pipeline and prepares it to receive csv data from a node.js
  /// readable stream. We have to do things this way because there is no stream interopt between Rust
  /// and node.js - so we basically spin up a thread to handle ingestion and then stream the data from
  /// node.js to it
  pub async fn begin_csv_ingestion(&mut self, bucket_id: i32) -> Result<(), TimeseriesError> {
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<StreamMessage>();
    let (status_tx, status_rx) = tokio::sync::mpsc::channel::<StreamStatusMessage>(2048);
    let db_connection = self.db.clone();

    // inner multithreaded loop to handle the copy from the csv file to the db
    tokio::task::spawn(async move {
      let stream_reader = NodeStreamReader::new(rx);

      let result = ingestion::ingest_csv(db_connection, stream_reader, bucket_id).await;
      match result {
        Ok(_) => match status_tx.send(StreamStatusMessage::Complete).await {
          Ok(_) => Ok(()),
          Err(e) => Err(TimeseriesError::Thread(e.to_string())),
        },
        Err(e) => match status_tx.send(StreamStatusMessage::Error(e)).await {
          Ok(_) => Ok(()),
          Err(e) => Err(TimeseriesError::Thread(format!(
            "ingest csv problem: {}",
            e
          ))),
        },
      }
    });

    // set that status message receiver so that the complete ingestion can wait on it
    self.stream_reader_channel = Some(Arc::new(tx));
    self.reader_status_channel = Some(Arc::new(tokio::sync::RwLock::new(status_rx)));
    Ok(())
  }

  /// `begin_legacy_csv_ingestion` intializes a data pipeline and prepares it to receive csv data from a node.js
  /// readable stream. We have to do things this way because there is no stream interopt between Rust
  /// and node.js - so we basically spin up a thread to handle ingestion and then stream the data from
  /// node.js to it
  pub fn begin_legacy_csv_ingestion(
    &mut self,
    data_source_id: String,
    columns: Vec<LegacyTimeseriesColumn>,
  ) -> Result<(), TimeseriesError> {
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<StreamMessage>();
    let (status_tx, status_rx) = tokio::sync::mpsc::channel::<StreamStatusMessage>(4096);
    let db_connection = self.db.clone();

    tokio::spawn(async move {
      let stream_reader = NodeStreamReader::new(rx);

      match ingestion::ingest_csv_legacy(db_connection, stream_reader, data_source_id, columns)
        .await
      {
        Ok(_) => match status_tx.send(StreamStatusMessage::Complete).await {
          Ok(_) => Ok(()),
          Err(e) => Err(TimeseriesError::Thread(e.to_string())),
        },
        Err(e) => match status_tx.send(StreamStatusMessage::Error(e)).await {
          Ok(_) => Ok(()),
          Err(e) => Err(TimeseriesError::Thread(format!(
            "ingest csv problem: {}",
            e
          ))),
        },
      }
    });

    // set that status message receiver so that the complete ingestion can wait on it
    self.stream_reader_channel = Some(Arc::new(tx));
    self.reader_status_channel = Some(Arc::new(tokio::sync::RwLock::new(status_rx)));
    Ok(())
  }

  /// `read_data` is called by the stream to pass data into the previously configured multithreaded
  /// reader. Call this function regardless of what starting method you called to ingest the data
  pub fn read_data(&mut self, bytes: Vec<u8>) -> Result<(), TimeseriesError> {
    let channel = self
      .reader_status_channel
      .as_mut()
      .ok_or(TimeseriesError::Unwrap(
        "no stream status channel".to_string(),
      ))?;

    let mut channel = futures::executor::block_on(channel.write());

    match channel.try_recv() {
      Ok(m) => match m {
        StreamStatusMessage::Error(e) => return Err(e),
        StreamStatusMessage::Complete => return Ok(()),
      },
      Err(e) => match e {
        tokio::sync::mpsc::error::TryRecvError::Empty => {}
        tokio::sync::mpsc::error::TryRecvError::Disconnected => {
          return Err(TimeseriesError::Thread(
            "status thread disconnected".to_string(),
          ))
        }
      },
    }

    let channel = self
      .stream_reader_channel
      .clone()
      .ok_or(TimeseriesError::Unwrap("no reader channel".to_string()))?;

    match channel.send(StreamMessage::Write(bytes)) {
      Ok(_) => Ok(()),
      Err(e) => {
        if channel.send(StreamMessage::Close).is_err() {
          eprintln!("cannot send close message on stream message channel")
        }
        Err(TimeseriesError::Thread(e.to_string()))
      }
    }
  }

  /// `complete ingestion` waits for either the first error message or complete status from the
  /// stream thread - this is how we can let users wait for the ingestion to be completed and how
  /// we can eventually send data back - this is called regardless of what starting method you called
  /// to ingest data
  pub async fn complete_ingestion(&mut self) -> Result<(), TimeseriesError> {
    let reader_channel = self
      .stream_reader_channel
      .as_mut()
      .ok_or(TimeseriesError::Unwrap(
        "no stream status channel".to_string(),
      ))?;

    {
      match reader_channel.send(StreamMessage::Close) {
        Ok(_) => {}
        Err(e) => {
          return Err(TimeseriesError::Thread(format!(
            "unable to send close message to reader {}",
            e
          )))
        }
      }
    }

    let channel = self
      .reader_status_channel
      .as_mut()
      .ok_or(TimeseriesError::Unwrap(
        "no stream status channel".to_string(),
      ))?;

    let mut channel = channel.write().await;

    match channel.recv().await {
      None => Err(TimeseriesError::Thread(
        "channel closed before message could be received".to_string(),
      )),
      Some(m) => match m {
        StreamStatusMessage::Error(e) => Err(e),
        StreamStatusMessage::Complete => Ok(()),
      },
    }
  }
}

/*
This entire section is our async reader for pulling in from node.js streams. This allows us to
setup an async reader to pass into things like the CSV parser and allows us to async ingest data
 */
#[derive(Debug, Clone)]
enum StreamMessage {
  Write(Vec<u8>),
  Close,
}

enum StreamStatusMessage {
  Error(TimeseriesError),
  Complete,
}

pub struct NodeStreamReader {
  rx: tokio::sync::mpsc::UnboundedReceiver<StreamMessage>,
  buffer: Vec<u8>,
  is_closed: bool,
}

impl NodeStreamReader {
  fn new(rx: tokio::sync::mpsc::UnboundedReceiver<StreamMessage>) -> Self {
    NodeStreamReader {
      rx,
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

      return if send.len() > buf.len() {
        let (dest, overflow) = send.split_at(buf.len());

        buf.copy_from_slice(dest);
        self.buffer.extend_from_slice(overflow);

        Ok(dest.len())
      } else {
        buf.copy_from_slice(send.as_slice());
        Ok(buf.len())
      };
    }

    loop {
      let message = match self.rx.try_recv() {
        Ok(m) => m,
        Err(e) => match e {
          TryRecvError::Empty => continue,
          TryRecvError::Disconnected => break,
        },
      };

      match message {
        StreamMessage::Write(bytes) => self.buffer.extend_from_slice(bytes.as_slice()),
        StreamMessage::Close => {
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
