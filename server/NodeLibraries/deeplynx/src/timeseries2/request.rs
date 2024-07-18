use crate::api::{Api, get_api_no_token};
use crate::error::TSError::Str;
use crate::error::{
    Result,
    TSError,
};
use crate::response::Response;
use crate::session::Session;
use crate::temp_file::TempFile;
use crate::types::{
    info_pretty,
    FileType,
    StoreType,
};
use lazy_static::lazy_static;
#[allow(unused_imports)]
use log::{
    error,
    info,
    trace,
    warn,
};
use regex::Regex;
use reqwest::header::HeaderMap;
use serde::{
    Deserialize,
    Serialize,
};
use serde_json::Value;
use std::fs;
use std::fs::File;
use std::io::{
    BufWriter,
    Write,
};

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct FilePathMetadata {
    id: String,
    adapter_file_path: String,
    adapter: StoreType,
}

impl FilePathMetadata {
    /// SQL table names must start with a letter
    /// and contain only ascii alphanumeric and '_"
    fn is_valid_table_name(name: &str) -> bool {
        lazy_static! {
            static ref RE: Regex = regex::Regex::new(r"[a-zA-Z_][a-zA-Z_0-9]*")
                .expect("valid_table_name static regex doesn't compile");
        }
        RE.is_match(name)
    }

    /// Use the id to create a table name suitable
    /// for most common SQL syntax-es
    fn get_table_name(&self) -> Result<String> {
        let name = format!("table_{}", self.id);
        if Self::is_valid_table_name(name.as_str()) {
            Ok(name)
        } else {
            Err(TSError::Error(format!(
                "Invalid table name from id: {}",
                self.id
            )))
        }
    }

    /// retrieve the file from the file store for local processing
    /// but only if it is "largeobject" aka DeepLynx storage
    async fn retrieve_file(&self) -> Result<String> {
        match self.adapter {
            StoreType::largeobject => {
                // download the file from DeepLynx blob storage and return the file path
                Ok(download_largeobject(self.adapter_file_path.as_str()).await?)
            }
            StoreType::filesystem => {
                // for local file system just return the file path
                Ok(self.adapter_file_path.clone())
            }
            StoreType::minio => {
                // todo
                Err(TSError::Unimplemented(format!(
                    "minio retrieve file {:?}",
                    self.adapter_file_path
                )))
            }
            StoreType::azure_blob => {
                // todo
                Err(TSError::Unimplemented(format!(
                    "azure_blob retrieve file {:?}",
                    self.adapter_file_path
                )))
            }
        }
    }

    /// retrieve the file from the file store for local processing
    /// but only if it is "largeobject" aka DeepLynx storage
    #[allow(dead_code)]
    async fn store_file(&self) -> Result<String> {
        match self.adapter {
            StoreType::largeobject => {
                // download the file from DeepLynx blob storage and return the file path
                Ok(download_largeobject(self.adapter_file_path.as_str()).await?)
            }
            StoreType::filesystem => {
                // for local file system just return the file path
                Ok(self.adapter_file_path.clone())
            }
            StoreType::minio => {
                // todo
                Err(TSError::Unimplemented(format!(
                    "minio retrieve file {:?}",
                    self.adapter_file_path
                )))
            }
            StoreType::azure_blob => {
                // todo
                Err(TSError::Unimplemented(format!(
                    "azure_blob retrieve file {:?}",
                    self.adapter_file_path
                )))
            }
        }
    }

    pub(crate) fn sample(id: u64) -> Self {
        Self {
            id: id.to_string(),
            adapter_file_path: "containers/1/files/1/download".to_string(),
            adapter: StoreType::largeobject,
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Request {
    pub report_id: String,
    pub query: String,
    pub response_url: String,
    pub files: Vec<FilePathMetadata>,
}

/// public interface impl
impl Request {
    pub fn from_msg_body(body: &str) -> Result<Request> {
        Ok(serde_json::from_str::<Request>(body)?)
    }

    pub async fn process(&self) -> Result<Response> {
        if self.files.is_empty() {
            return Err(Str("Request has empty file list"));
        };
        // create the DataFusion session
        let mut session = Session::new(self.files[0].adapter)?;

        // first - register the tables
        let mut table_names: Vec<String> = vec![];
        let mut file_paths: Vec<String> = vec![];
        for file_path_metadata in &self.files {
            let table_name = file_path_metadata.get_table_name()?;
            table_names.push(table_name.clone());
            // retrieve the file and get the local path to it
            let file_path = file_path_metadata.retrieve_file().await?;
            file_paths.push(file_path.clone());
            // register it
            session
                .register_table(&table_name, file_path.as_str())
                .await?;
        }
        // second - run the actual query and get a DataFrame object
        // but also - if it is a DESCRIBE query then there should only be one file
        // in the list of files, in any case return the query results from files[0]
        let mut sql = self.query.clone();
        if sql.trim().to_uppercase().starts_with("DESCRIBE") {
            sql = format!("DESCRIBE {}", &table_names[0]);
        }

        let df = session.query(sql.as_str()).await?;

        // todo is this the only way to respond ... with upload_largeobject?
        // todo yes... currently
        let tf = TempFile::new(FileType::Csv, &df).await;
        let import_file = tf.file_path().clone();
        let route = self.response_url.as_str();
        let mut response = upload_largeobject(import_file, route).await?;

        // here is where we set the report_id to what was received in the request
        response.report_id = self.report_id.clone();
        Ok(response)
    }

    /// a sample of a Request object for testing
    pub fn sample(id: String) -> Self {
        Request {
            report_id: id,
            query: "SELECT * FROM table_2".to_string(),
            response_url: "<respons_rul>".to_string(),
            files: vec![
                FilePathMetadata::sample(1),
                FilePathMetadata::sample(2),
                FilePathMetadata::sample(3),
            ],
        }
    }
}

pub async fn upload_largeobject(import_file: String, route: &str) -> Result<Response> {
    const RE_STR: &str =
        r"containers/(?P<container_id>\d+)/reports/(?P<report_id>\d+)\?token=(?P<token>.*)";
    const RE_HINT: &str = "containers/<container_id>/reports/<report_id>";
    lazy_static! {
        // note: we don't really need this regex, or to parse the route,
        // but we do it for error checking
        static ref RE:Regex = regex::Regex
            ::new(RE_STR)
                .expect("upload static regex doesn't compile");
    }

    let api = get_api_no_token()?; // todo static or local... decide

    // get the captures just to check that the route is copacetic
    // then we will rebuild the route to make it super-copacetic
    let caps = RE.captures(route).ok_or(TSError::Error(format!(
        "upload route: '{}' does not match: '{}'",
        route, RE_HINT
    )))?;
    let container_id = caps["container_id"].parse::<u64>()?;
    let report_id = caps["report_id"].parse::<u64>()?;
    let token = caps["token"].parse::<String>()?;

    // rebuild the route from the successfully parsed input route to make
    // sure that it is correct vis-a-vis leading and trailing slashes
    // it will be appended onto the server and port in the get function
    let route = format!(
        "containers/{}/reports/{}?token={}",
        container_id, report_id, token
    ); //todo

    let mut headers = HeaderMap::new();
    headers.insert(
        "Authorization",
        format!("Bearer {}", api.bearer_token).parse()?,
    );

    let name = "imported_file_name";
    let desc = "imported_file_desc";

    let file = fs::read(&import_file)?;
    let file_part = reqwest::multipart::Part::bytes(file)
        .file_name(import_file.clone())
        .mime_str("text/csv")?;

    let form = reqwest::multipart::Form::new()
        .text("name", name)
        .text("description", desc)
        .text("data_versioning_enabled", "false")
        .text("path", "")
        .part("file", file_part);

    info!("uploading file...({})", import_file);
    let result_value = api
        .client
        .post(format!("{}/{route}", api.server))
        .headers(headers)
        .multipart(form)
        .send()
        .await?
        .json::<Value>()
        .await?;

    result_to_response(result_value)
}

pub async fn download_largeobject(route: &str) -> Result<String> {
    const RE_STR: &str = r"containers/(?P<container_id>\d+)/files/(?P<file_id>\d+)(/download)?";
    const RE_HINT: &str = r"containers/<container_id>/files/<file_id>";
    lazy_static! {
        // note this regex matches... whether or not the endpoint has "/download" on the end
        // also note, there is no error return from static code... it's compile time
        static ref RE:Regex = regex::Regex
        ::new(RE_STR)
        .expect("upload static regex doesn't compile");
    }
    let caps = RE.captures(route).ok_or(TSError::Error(format!(
        "Download route: '{}' does not match: '{}'",
        route, RE_HINT
    )))?;
    // get the captures just to check that the route is copacetic
    // then we will rebuild the route to make it super-copacetic
    let container_id = caps["container_id"].parse::<u64>()?;
    let file_id = caps["file_id"].parse::<u64>()?;

    let api = get_api_no_token()?; // todo static or local... decide

    // rebuild the route from the successfully parsed input route to make
    // sure that it is correct vis-a-vis leading and trailing slashes
    // it will be appended onto the server and port in the get function
    let route = format!("containers/{}/files/{}", container_id, file_id); //todo
    info!("download route:{}", route);

    // first get the metadata about the file... like filename
    let meta_value:Value = api.get_json_value::<Value>(route.as_str()).await?;
    info_pretty("api get result", &meta_value);

    // second download the file as bytes
    let file_name_value = &meta_value["value"]["file_name"];
    if !file_name_value.is_null() {
        if let Some(file_name) = file_name_value.as_str() {
            let file_path = TempFile::get_path(file_name);
            let route2 = format!("containers/{}/files/{}/download", container_id, file_id); //todo
            info!("Downloading file ({})...", file_path);
            let file_as_bytes = api.get_json_bytes(route2.as_str()).await?;
            info!("Creating temp file...");
            let file = File::create(&file_path)?;
            info!("Writing file ({})...", &file_path);
            BufWriter::new(file).write_all(file_as_bytes.as_ref())?;
            info!("returning file_path ({})...", &file_path);

            return Ok(file_path);
        }
    }
    Err(TSError::Download(format!(
        "could not download file ({})",
        route
    )))
}

// try whatever we can to parse a myriad of possible result jsons
pub fn result_to_response(outer_value: Value) -> Result<Response> {
    // first of all, can we parse this directly into a Response object using serde
    // then return the outer_value as a Response object (it is one)
    if let Ok(response) = serde_json::from_value::<Response>(outer_value.clone()) {
        return Ok(response);
    };

    // see if it is a typical error response and allow for alternate spelling of is_error
    #[derive(Serialize, Deserialize, Debug)]
    struct IsErrorValue {
        #[serde(alias = "isError")]
        is_error: bool,
        value: Value,
    }
    if let Ok(is_error) = serde_json::from_value::<IsErrorValue>(outer_value.clone()) {
        return Ok(Response {
            report_id: "unknown".to_string(),
            is_error: is_error.is_error,
            value: is_error.value,
        });
    };

    // same as above but the value field is a string rather than a json value
    #[derive(Serialize, Deserialize, Debug)]
    struct IsErrorString {
        #[serde(alias = "isError")]
        is_error: bool,
        value: String,
    }
    if let Ok(is_error) = serde_json::from_value::<IsErrorString>(outer_value.clone()) {
        return Ok(Response {
            report_id: "unknown".to_string(),
            is_error: is_error.is_error,
            value: serde_json::from_str::<Value>(is_error.value.as_str())?,
        });
    };

    // finally just return an Response error with value of outer_value
    Ok(Response {
        report_id: "unknown".to_string(),
        is_error: true,
        value: outer_value.clone(),
    })
}
