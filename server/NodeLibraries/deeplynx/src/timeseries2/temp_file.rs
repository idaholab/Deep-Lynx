use crate::api::date_time_string;
use crate::error::{
    Result,
    TSError,
};
use crate::types::FileType;
use datafusion::dataframe::DataFrameWriteOptions;
use datafusion::prelude::DataFrame;
use log::{
    error,
    info,
};
use std::fs;
use std::path::{
    Path,
    PathBuf,
};
use tokio::time::Instant;

// TODO FIX the overkill on the create dir logic here

const TMP_DIRECTORY: &str = ".temp_files";
pub struct TempFile {
    file_name: String,
}
impl TempFile {
    pub(crate) async fn new(file_type: FileType, df: &DataFrame) -> Self {
        if !Path::new(TMP_DIRECTORY).exists() {
            _ = fs::create_dir(Path::new(TMP_DIRECTORY));
        }
        if let Ok(file_name) = TempFile::_write_file(file_type, df).await {
            TempFile { file_name }
        } else {
            error!("Could not write temporary file.");
            TempFile {
                file_name: "".to_string(),
            }
        }
    }

    pub(crate) fn file_path(&self) -> String {
        if !Path::new(TMP_DIRECTORY).exists() {
            _ = fs::create_dir(Path::new(TMP_DIRECTORY));
        }
        self.file_name.clone()
    }

    async fn _write_file(file_type: FileType, df: &DataFrame) -> Result<String> {
        if !Path::new(TMP_DIRECTORY).exists() {
            _ = fs::create_dir(Path::new(TMP_DIRECTORY));
        }

        let start = Instant::now();
        info!("Writing temporary file...");

        let output_directory_path = format!("{}/{}", TMP_DIRECTORY, date_time_string());
        match file_type {
            FileType::Csv => {
                df.clone()
                    .write_csv(
                        output_directory_path.as_str(),
                        DataFrameWriteOptions::default(),
                        None,
                    )
                    .await?;
            }
            FileType::Parquet => {
                df.clone()
                    .write_parquet(
                        output_directory_path.as_str(),
                        DataFrameWriteOptions::default(),
                        None,
                    )
                    .await?;
            }
            FileType::Json => {
                df.clone()
                    .write_json(
                        output_directory_path.as_str(),
                        DataFrameWriteOptions::default(),
                    )
                    .await?;
            }
            _ => {
                unimplemented!()
            }
        };
        // remarkably hard to get a file_path_string from a directory listing
        let paths: Vec<_> = fs::read_dir(&output_directory_path).unwrap().collect();
        let mut file_path_string: String = String::new();
        if let Some(path) = paths.into_iter().next() {
            file_path_string = format!("{}", path?.path().display());
        }

        let duration = start.elapsed();
        info!("Wrote file: {:?}", duration);
        Ok(file_path_string)
    }

    pub(crate) fn remove_file(&self) -> Result<()> {
        let file_path = self.file_name.clone();
        info!("Removing temporary file: ({}).", &file_path);
        if let Some(directory_path) = PathBuf::from(file_path.clone()).parent() {
            if directory_path.starts_with(format!("{}/", TMP_DIRECTORY)) {
                fs::remove_file::<&str>(file_path.as_str())?;
                fs::remove_dir::<&str>(directory_path.to_string_lossy().as_ref())?;
                return Ok(());
            }
        }
        Err(TSError::FileDeletionError)
    }

    pub(crate) fn get_path(file_name: &str) -> String {
        if !Path::new(TMP_DIRECTORY).exists() {
            _ = fs::create_dir(Path::new(TMP_DIRECTORY));
        }
        format!("{}/{}", TMP_DIRECTORY, file_name)
    }

    pub(crate) fn remove_all() -> Result<()> {
        let path = format!("{}/", TMP_DIRECTORY);
        fs::remove_dir_all(path.as_str())?;
        fs::create_dir(path.as_str())?;
        Ok(())
    }
}
impl Drop for TempFile {
    fn drop(&mut self) {
        _ = self.remove_file();
    }
}
