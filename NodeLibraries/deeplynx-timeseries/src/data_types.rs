use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, PartialEq, Clone)]
pub enum DataTypes {
  Bool,
  Char,
  SmallInt,
  Int,
  BigInt,
  Real,
  Double,
  Numeric(i32, i32),
  Varchar(i32),
  Text,
  Bytea,
  TimestampWithTimezone,
  Timestamp,
  Date,
  Time,
  Uuid,
  Jsonb,
}
#[derive(Debug, Deserialize, Serialize, PartialEq, Clone)]
pub enum LegacyDataTypes {
  Number,
  Number64,
  Float,
  Float64,
  Date,
  String,
  Boolean,
  Json,
}

impl DataTypes {
  pub fn to_postgres_string(&self) -> String {
    match self {
      DataTypes::Bool => "BOOL".to_string(),
      DataTypes::Char => "CHAR".to_string(),
      DataTypes::SmallInt => "SMALLINT".to_string(),
      DataTypes::Int => "INT".to_string(),
      DataTypes::BigInt => "BIGINT".to_string(),
      DataTypes::Real => "REAL".to_string(),
      DataTypes::Double => "DOUBLE PRECISION".to_string(),
      DataTypes::Numeric(precision, scale) => {
        if *precision == 0 && *scale == 0 {
          "NUMERIC".to_string()
        } else {
          format!("NUMERIC({precision}, {scale})")
        }
      }
      DataTypes::Varchar(length) => format!("VARCHAR({length})"),
      DataTypes::Text => "TEXT".to_string(),
      DataTypes::Bytea => "BYTEA".to_string(),
      DataTypes::TimestampWithTimezone => "TIMESTAMPTZ".to_string(),
      DataTypes::Timestamp => "TIMESTAMP".to_string(),
      DataTypes::Date => "DATE".to_string(),
      DataTypes::Time => "TIME".to_string(),
      DataTypes::Uuid => "UUID".to_string(),
      DataTypes::Jsonb => "JSONB".to_string(),
    }
  }
}

impl From<String> for DataTypes {
  fn from(value: String) -> Self {
    match value.to_uppercase().as_str() {
      "BOOL" => DataTypes::Bool,
      "CHAR" => DataTypes::Char,
      "SMALLINT" => DataTypes::SmallInt,
      "INT" => DataTypes::Int,
      "INT4" => DataTypes::Int,
      "INT8" => DataTypes::BigInt,
      "BIGINT" => DataTypes::BigInt,
      "REAL" => DataTypes::Real,
      "FLOAT4" => DataTypes::Real,
      "DOUBLE PRECISION" => DataTypes::Double,
      "FLOAT8" => DataTypes::Double,
      "NUMERIC" => DataTypes::Numeric(0, 0), // users will need to do an additional check to get precision/scale
      "VARCHAR" => DataTypes::Varchar(255),  // users will need to do an additional check for length
      "TEXT" => DataTypes::Text,
      "BYTEA" => DataTypes::Bytea,
      "TIMESTAMPTZ" => DataTypes::TimestampWithTimezone,
      "TIMESTAMP WITH TIMEZONE" => DataTypes::TimestampWithTimezone,
      "TIMESTAMP" => DataTypes::Timestamp,
      "TIMESTAMP WITHOUT TIMEZONE" => DataTypes::Timestamp,
      "DATE" => DataTypes::Date,
      "TIME" => DataTypes::Time,
      "TIME WITHOUT TIMEZONE" => DataTypes::Time,
      "UUID" => DataTypes::Uuid,
      "JSONB" => DataTypes::Jsonb,
      _ => DataTypes::Jsonb, // catch all
    }
  }
}

impl From<String> for LegacyDataTypes {
  fn from(value: String) -> Self {
    match value.to_lowercase().as_str() {
      "number" => LegacyDataTypes::Number,
      "number64" => LegacyDataTypes::Number64,
      "float" => LegacyDataTypes::Float,
      "float64" => LegacyDataTypes::Float64,
      "date" => LegacyDataTypes::Date,
      "string" => LegacyDataTypes::String,
      "boolean" => LegacyDataTypes::Boolean,
      _ => LegacyDataTypes::Json,
    }
  }
}

impl From<LegacyDataTypes> for String {
  fn from(value: LegacyDataTypes) -> Self {
    match value {
      LegacyDataTypes::Number => "number".to_string(),
      LegacyDataTypes::Number64 => "number64".to_string(),
      LegacyDataTypes::Float => "float".to_string(),
      LegacyDataTypes::Float64 => "float64".to_string(),
      LegacyDataTypes::Date => "date".to_string(),
      LegacyDataTypes::String => "string".to_string(),
      LegacyDataTypes::Boolean => "boolean".to_string(),
      LegacyDataTypes::Json => "json".to_string(),
    }
  }
}
