use std::path::Path;

use super::errors::Timeseries2Error;

#[napi(object)]
#[derive(Debug, Default, Clone)]
pub struct FileMetadata {
  pub id: u32,
  #[napi(js_name = "file_name")]
  pub file_name: String,
  #[napi(js_name = "access_path")]
  pub file_path: String,
}

/// Extracts the table_name and file extension and returns it with the path
pub fn extract_table_info(
  files: Vec<FileMetadata>,
) -> Result<Vec<TableMetadata>, Timeseries2Error> {
  let mut table_info = Vec::new();
  for file in files {
    let full_path_string = format!("{}/{}", file.file_path, file.file_name);
    let ext_finder_path = Path::new(full_path_string.as_str())
      .extension()
      .ok_or_else(|| {
        Timeseries2Error::InvalidFileMetadata(format!(
          "File Path Metadata has no valid file extension from id: {}",
          file.id
        ))
      })?;
    let ext = match ext_finder_path.to_str() {
      None => {
        return Err(Timeseries2Error::InvalidFileMetadata(format!(
          "File Path Metadata has no valid file extension from id: {}",
          file.id
        )))?
      }
      Some(ex) => match ex {
        s if s.starts_with("csv") => FileType::Csv,
        s if s.starts_with("json") => FileType::Json,
        s if s.starts_with("parquet") => {
          return Err(Timeseries2Error::ToDo(format!(
            "Parquet file (id: {}). Parquet is currently unsupported for Timeseries2",
            file.id
          )))
        }
        s if s.starts_with("hdf5") => {
          return Err(Timeseries2Error::ToDo(format!(
            "HDF5 file (id: {}). HDF5 is currently unsupported for Timeseries2",
            file.id
          )))
        }
        s if s.starts_with("tdms") => {
          return Err(Timeseries2Error::ToDo(format!(
            "TDMS file (id: {}). TDMS is currently unsupported for Timeseries2",
            file.id
          )))
        }
        _ => {
          return Err(Timeseries2Error::ToDo(format!(
            "File Path Metadata file extension was corrupted by the uuid from id: {}",
            file.id
          )))
        }
      },
    };

    table_info.push(TableMetadata {
      id: file.id,
      name: format!("table_{}", file.id),
      file_path: full_path_string.clone(),
      file_type: ext,
    });
  }
  Ok(table_info)
}

pub struct TableMetadata {
  pub id: u32,
  pub name: String,
  pub file_path: String,
  pub file_type: FileType,
}

pub enum FileType {
  Csv,
  // Parquet,
  Json,
}
