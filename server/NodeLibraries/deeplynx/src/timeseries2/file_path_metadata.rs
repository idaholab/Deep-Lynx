use std::path::Path;

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
pub fn extract_table_info(files: &Vec<FilePathMetadata>) -> Result<Vec<TableMetadata>, String> {
  let mut table_info = Vec::new();
  for file in files {
    let file_id = file
      .id
      .as_ref()
      .ok_or("file_id can technically be null but should never be null.")?;

    let adapter_file_path = file
      .adapter_file_path
      .as_ref()
      .ok_or("file_id can technically be null but should never be null.")?;
    let ext_plus_uuid = Path::new(adapter_file_path.as_str())
      .extension()
      .ok_or_else(|| {
        format!(
          "File Path Metadata has no valid file extension from id: {}",
          file_id
        )
      })?;
    let ext = match ext_plus_uuid.to_str() {
      None => {
        return Err(format!(
          "File Path Metadata has no valid file extension from id: {}",
          file_id
        ))?
      }
      Some(ex) => match ex {
        s if s.starts_with("csv") => FileType::Csv,
        s if s.starts_with("json") => FileType::Json,
        s if s.starts_with("parquet") => {
          return Err(format!(
            "Parquet file (id: {}). Parquet is currently unsupported for Timeseries2",
            file_id
          ))
        }
        s if s.starts_with("hdf5") => {
          return Err(format!(
            "HDF5 file (id: {}). HDF5 is currently unsupported for Timeseries2",
            file_id
          ))
        }
        s if s.starts_with("tdms") => {
          return Err(format!(
            "TDMS file (id: {}). TDMS is currently unsupported for Timeseries2",
            file_id
          ))
        }
        _ => {
          return Err(format!(
            "File Path Metadata file extension was corrupted by the uuid from id: {}",
            file_id
          ))
        }
      },
    };

    table_info.push(TableMetadata {
      name: format!("table_{}", file_id),
      adapter_file_path: adapter_file_path.clone(),
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
  Json,
}
