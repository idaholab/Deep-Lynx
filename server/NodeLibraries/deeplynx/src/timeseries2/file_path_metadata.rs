use std::path::Path;

use super::errors::Timeseries2Error;

#[napi(object)]
#[derive(Debug, Default, Clone)]
pub struct FilePathMetadata {
  pub id: Option<String>,
  pub adapter: Option<String>,
  #[napi(js_name = "data_source_id")]
  pub data_source_id: Option<String>,
  #[napi(js_name = "file_name")]
  pub file_name: Option<String>,
  #[napi(js_name = "adapter_file_path")]
  pub adapter_file_path: Option<String>,
}

/// Extracts the table_name and file extension and returns it with the path
pub fn extract_table_info(
  files: &Vec<FilePathMetadata>,
) -> Result<Vec<TableMetadata>, Timeseries2Error> {
  let mut table_info = Vec::new();
  for file in files {
    let file_id = file
      .id
      .as_ref()
      .ok_or(Timeseries2Error::InvalidFileMetadata(
        "file_id should never be null.".to_string(),
      ))?;
    let file_name = file
      .file_name
      .as_ref()
      .ok_or(Timeseries2Error::InvalidFileMetadata(
        "file_id should never be null.".to_string(),
      ))?;
    let adapter_file_path =
      file
        .adapter_file_path
        .as_ref()
        .ok_or(Timeseries2Error::InvalidFileMetadata(
          "file adapter_file_path should never be null.".to_string(),
        ))?;
    let full_path_string = format!("{adapter_file_path}/{file_name}");
    let ext_finder_path = Path::new(full_path_string.as_str())
      .extension()
      .ok_or_else(|| {
        Timeseries2Error::InvalidFileMetadata(format!(
          "File Path Metadata has no valid file extension from id: {}",
          file_id
        ))
      })?;
    let ext = match ext_finder_path.to_str() {
      None => {
        return Err(Timeseries2Error::InvalidFileMetadata(format!(
          "File Path Metadata has no valid file extension from id: {}",
          file_id
        )))?
      }
      Some(ex) => match ex {
        s if s.starts_with("csv") => FileType::Csv,
        s if s.starts_with("json") => FileType::Json,
        s if s.starts_with("parquet") => {
          return Err(Timeseries2Error::ToDo(format!(
            "Parquet file (id: {}). Parquet is currently unsupported for Timeseries2",
            file_id
          )))
        }
        s if s.starts_with("hdf5") => {
          return Err(Timeseries2Error::ToDo(format!(
            "HDF5 file (id: {}). HDF5 is currently unsupported for Timeseries2",
            file_id
          )))
        }
        s if s.starts_with("tdms") => {
          return Err(Timeseries2Error::ToDo(format!(
            "TDMS file (id: {}). TDMS is currently unsupported for Timeseries2",
            file_id
          )))
        }
        _ => {
          return Err(Timeseries2Error::ToDo(format!(
            "File Path Metadata file extension was corrupted by the uuid from id: {}",
            file_id
          )))
        }
      },
    };

    table_info.push(TableMetadata {
      name: format!("table_{}", file_id),
      adapter_file_path: full_path_string.clone(),
      file_type: ext,
    });
  }
  Ok(table_info)
}

pub struct TableMetadata {
  pub name: String,
  pub adapter_file_path: String,
  pub file_type: FileType,
}

pub enum FileType {
  Csv,
  // Parquet,
  Json,
}
