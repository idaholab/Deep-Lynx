use serde::{Deserialize, Serialize};

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
