use std::path::Path;

use crate::timeseries::errors::QueryError;

#[napi(object)]
#[derive(Debug, Default, Clone)]
pub struct FileMetadata {
  pub id: String,
  #[napi(js_name = "file_name")]
  pub file_name: String,
  #[napi(js_name = "access_path")]
  pub file_path: String,
}

/// Extracts the table_name and file extension and returns it with the path
pub fn extract_table_info(files: Vec<FileMetadata>) -> Result<Vec<TableMetadata>, QueryError> {
  let mut table_info = Vec::new();
  for file in files {
    let full_path_string = format!("{}/{}", file.file_path, file.file_name);
    let ext_finder_path = Path::new(full_path_string.as_str())
      .extension()
      .ok_or_else(|| {
        QueryError::InvalidFileMetadata(format!(
          "File Path Metadata has no valid file extension from id: {}",
          file.id
        ))
      })?;
    let ext = match ext_finder_path.to_str() {
      None => {
        return Err(QueryError::InvalidFileMetadata(format!(
          "File Path Metadata has no valid file extension from id: {}",
          file.id
        )))?
      }
      Some(ex) => match ex {
        s if s.starts_with("csv") => FileType::Csv,
        s if s.starts_with("json") => FileType::Json,
        s if s.starts_with("parquet") => {
          return Err(QueryError::ToDo(format!(
            "Parquet file (id: {}). Parquet is currently unsupported for Timeseries2",
            file.id
          )))
        }
        s if s.starts_with("hdf5") => {
          return Err(QueryError::ToDo(format!(
            "HDF5 file (id: {}). HDF5 is currently unsupported for Timeseries2",
            file.id
          )))
        }
        s if s.starts_with("tdms") => {
          return Err(QueryError::ToDo(format!(
            "TDMS file (id: {}). TDMS is currently unsupported for Timeseries2",
            file.id
          )))
        }
        _ => {
          return Err(QueryError::ToDo(format!(
            "File Path Metadata file extension was corrupted by the uuid from id: {}",
            file.id
          )))
        }
      },
    };

    table_info.push(TableMetadata {
      name: format!("table_{}", file.id),
      file_path: full_path_string.clone(),
      file_type: ext,
    });
  }
  Ok(table_info)
}

pub struct TableMetadata {
  pub name: String,
  pub file_path: String,
  pub file_type: FileType,
}

pub enum FileType {
  Csv,
  // Parquet,
  Json,
}
