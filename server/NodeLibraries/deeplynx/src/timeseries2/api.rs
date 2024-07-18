use crate::error::APIError;
use chrono::offset::Utc;
use chrono::DateTime;
use lazy_static::lazy_static;

#[allow(unused_imports)]
use log::{
    error,
    info,
    warn,
};
use reqwest::header::{
    HeaderMap,
    HeaderValue,
};
use serde::{
    Deserialize,
    Serialize,
};
use serde_json::Value;
use std::env;
use std::path::Path;
use std::time::SystemTime;
use datafusion::datasource::physical_plan::FileStream;
use warp::hyper::body::Bytes;
use warp::Stream;
use reqwest::{multipart, Body, Client};
use tokio::fs::File;
use tokio_util::codec::{BytesCodec, FramedRead};

type Result<T> = std::result::Result<T, APIError>;

pub fn get_api_no_token() -> Result<Api> {
    let key = env::var("DL_API_KEY")?;
    let secret = env::var("DL_API_SECRET")?;
    let server = env::var("DL_SERVER")?;

    assert!(server.to_lowercase().starts_with("http"));

    log::trace!("KEY:{key}");
    log::trace!("SECRET:{secret}");
    log::trace!("SERVER:{server}");

    let api = Api::new(server, key, secret).unwrap();

    Ok(api)
}

// #[allow(dead_code)]
// pub fn api() -> &'static Api {
//     lazy_static! {
//         static ref API: Api = get_api_no_token().unwrap();
//     };
//     &API
// }

#[allow(dead_code)] // authentication
pub struct Api {
    pub(crate) client: reqwest::Client,
    pub(crate) server: String,
    // this is only pub so we can display it if needed
    // as with the --show-token option
    key: String,
    secret: String,
    pub bearer_token: String,
    headers: HeaderMap<HeaderValue>,
}

impl Api {
    pub(crate) fn client() -> &'static reqwest::Client {
        lazy_static! {
            static ref CLIENT: reqwest::Client = reqwest::Client::new();
        }
        &CLIENT
    }

    /// this is deliberately non-async so we can create a global reference
    /// the async function get token is used to get the bearer token if needed for auth
    pub fn new(server: String, key: String, secret: String) -> Result<Api> {
        // let client = reqwest::Client::new();
        let mut headers = HeaderMap::new();
        headers.insert("x-api-key", key.parse()?);
        headers.insert("x-api-secret", secret.parse()?);
        let bearer_token = String::from("<to be initialized>");
        let client = reqwest::Client::new();
        Ok(Api {
            client,
            server,
            key,
            secret,
            bearer_token,
            headers,
        })
    }

    pub async fn get_json_value<T:Serialize+for<'a>Deserialize<'a>>(&self, route: &str) -> Result<T>
    {
        let mut headers = HeaderMap::new();
        headers.insert(
            "Authorization",
            format!("Bearer {}", self.bearer_token).parse()?,
        );
        let route_string = format!("{}/{}", self.server, route);
        Ok(self
            .client
            .get(route_string)
            .headers(headers)
            .send()
            .await?
            .json::<T>()
            .await?)
    }

    pub async fn get_json_text(&self, route: &str) -> Result<String> {
        let mut headers = HeaderMap::new();
        headers.insert(
            "Authorization",
            format!("Bearer {}", self.bearer_token).parse()?,
        );
        let route_string = format!("{}/{}", self.server, route);
        Ok(self
            .client
            .get(route_string)
            .headers(headers)
            .send()
            .await?
            .text()
            .await?)
    }

    pub async fn get_json_bytes(&self, route: &str) -> Result<Bytes> {
        let mut headers = HeaderMap::new();
        headers.insert(
            "Authorization",
            format!("Bearer {}", self.bearer_token).parse()?,
        );
        let route_string = format!("{}/{}", self.server, route);
        Ok(self
            .client
            .get(route_string)
            .headers(headers)
            .send()
            .await?
            .bytes()
            .await?)
    }

    pub async fn post_json_body(&self, route: &str, body: &str) -> Result<Value> {
        let mut headers = HeaderMap::new();
        headers.insert(
            "Authorization",
            format!("Bearer {}", self.bearer_token).parse()?,
        );
        headers.insert("Content-Type", "application/json".to_string().parse()?);
        headers.insert("Accept", "application/json".to_string().parse()?);
        let url = format!("{}/{}", self.server, route);
        let value = self
            .client
            .post(url)
            .headers(headers)
            .body(body.to_owned())
            .send()
            .await?
            .json::<Value>()
            .await?;
        Ok(value)
    }

    pub async fn create_container(&self, name: &str) -> Result<u64> {
        #[derive(Serialize, Deserialize)]
        struct Config {
            pub data_versioning_enabled: bool,
        }

        #[derive(Serialize, Deserialize)]
        struct Body {
            pub name: String,
            pub description: String,
            pub archived: bool,
            pub config: Config,
        }

        let body = Body {
            name: name.to_string(),
            description: format!("{} description", name),
            archived: false,
            config: Config {
                data_versioning_enabled: false,
            },
        };

        // let api = get_api_no_token()?;
        let route = "containers";
        let body_string = serde_json::to_string_pretty(&body)?;
        let v = self.post_json_body(route, body_string.as_str()).await?;
        // let pretty = serde_json::to_string_pretty(&v)?;

        if v["isError"].as_bool() == Some(true) {
            return Err(APIError::Str("could not create data_source"));
        };

        // todo for some unknown reason the create container info (holding the id) is
        // todo in an array
        let id_str = v["value"][0]["id"]
            .as_str()
            .ok_or(APIError::Str("No id create_data_source response"))?;
        let id = id_str.to_string().parse::<u64>()?;
        Ok(id)
    }

    pub async fn create_data_source(
        &self,
        container_id: u64,
        name: &str,
        adapter_type: &str,
    ) -> Result<u64> {
        #[derive(Serialize, Deserialize, Default)]
        struct Config {
            pub endpoint: String,
            pub auth_method: String,
            pub username: String,
            pub password: String,
        }

        #[derive(Serialize, Deserialize)]
        struct Body {
            pub name: String,
            pub adapter_type: String,
            pub active: bool,
            pub config: Config,
        }

        // let name = "test_data_source".to_string();
        // let adapter_type = "standard".to_string();
        let body = Body {
            name: name.to_string(),
            adapter_type: adapter_type.to_string(),
            active: true,
            config: Config::default(),
        };

        // let api = get_api_no_token()?;
        let route = format!("containers/{}/import/datasources", container_id);
        let body_string = serde_json::to_string_pretty(&body)?;
        let v = self
            .post_json_body(route.as_str(), body_string.as_str())
            .await?;

        if v["isError"].as_bool() == Some(true) {
            return Err(APIError::Str("could not create data_source"));
        };

        let id_str = v["value"]["id"]
            .as_str()
            .ok_or(APIError::Str("No id create_data_source response"))?;
        let id = id_str.to_string().parse::<u64>()?;
        Ok(id)
    }

    pub async fn upload_file(
        &self,
        container_id: u64,
        data_source_id: u64,
        import_file: &Path,
    ) -> Result<u64> {
        let route = format!(
            "containers/{}/import/datasources/{}/files",
            container_id, data_source_id
        );
        let mut headers = HeaderMap::new();
        headers.insert(
            "Authorization",
            format!("Bearer {}", self.bearer_token).parse()?,
        );

        // read file body as a stream
        let file = tokio::fs::File::open(import_file).await?;
        let stream = FramedRead::new(file, BytesCodec::new());
        let file_body = Body::wrap_stream(stream);

        //make form part of file
        let file_part = multipart::Part::stream(file_body)
            .file_name("gitignore.txt")
            .mime_str("text/plain")?;

        let os_file_name = import_file
            .file_name()
            .ok_or(APIError::Str("missing file name in upload_file"))?;
        let name = format!("{:?}", os_file_name);
        let desc = "imported_file_desc";

        let form = reqwest::multipart::Form::new()
            .text("name", name.clone())
            .text("description", desc)
            .text("data_versioning_enabled", "false")
            .text("path", "")
            .part("file", file_part);

        let v = self
            .client
            .post(format!("{}/{}", self.server, route))
            .headers(headers)
            .multipart(form)
            .send()
            .await?
            .json::<Value>()
            .await?;

        if v["isError"].as_bool() == Some(true) {
            return Err(APIError::Str("could not create data_source"));
        };

        let id_str = v["value"]["id"]
            .as_str()
            .ok_or(APIError::Str("No id create_data_source response"))?;
        let id = id_str.to_string().parse::<u64>()?;
        Ok(id)
    }

    pub async fn health_check(&self) -> Result<bool> {
        // not health route does not return json, just the version as text
        let value = self.get_json_text("health").await?;
        Ok(!value.is_empty())
    }

    pub async fn describe(&self, container_id: u64, file_id: u64) -> Result<u64> {
        // not health route does not return json, just the version as text
        let route = format!(
            "containers/{}/reports/datafusion/describe/{}",
            container_id, file_id
        );
        println!("describe route : {}", route);

        let v = self.get_json_value::<Value>(route.as_str()).await?;

        if v["isError"].as_bool() == Some(true) {
            return Err(APIError::Error(format!(
                "could not describe file_id {}",
                file_id
            )));
        };
        let id_str = v["value"]
            .as_str()
            .ok_or(APIError::Str("No id in describe response"))?;
        let id = id_str.to_string().parse::<u64>()?;
        Ok(id)
    }

    pub async fn poll_report(&self, container_id: u64, report_id: &u64) -> Result<String> {
        // not health route does not return json, just the version as text
        let route = format!(
            "containers/{}/reports/{}/poll",
            container_id, report_id
        );
        // println!("poll route : {}", route);
        //
        // #[derive(Serialize, Deserialize, Debug)]
        // struct PollValue {
        //     pub status: String,
        //     pub message: Option<String>,
        // }
        // #[derive(Serialize, Deserialize, Debug)]
        // struct PollResult {
        //     pub value: PollValue,
        //     #[serde(rename = "isError")]
        //     pub is_error: bool,
        // }

        let v:Value = self.get_json_value::<Value>(route.as_str()).await?;

        if v["isError"].as_bool() == Some(true) {
            return Err(APIError::Error(format!(
                "could not poll report_id {}",
                report_id
            )));
        };
        let id_str = v["value"]["status"]
            .as_str()
            .ok_or(APIError::Str("No status in poll response"))?;
        Ok(id_str.to_string())

        // info!("{:?}",v);
        // Ok("unkown".to_string())
        //
        // // info!("{}",serde_json::to_string_pretty(&v));
        //
        // if v.is_error {
        //     return Err(APIError::Error(format!(
        //         "could not describe file_id {}",
        //         report_id
        //     )));
        // };
        // Ok( v.value.status.clone() )
    }
} // impl Api

pub fn date_time_string() -> String {
    let system_time = SystemTime::now();
    let datetime: DateTime<Utc> = system_time.into();
    format!("{}", datetime.format("%Y-%m-%d %H:%M:%S"))
}

// #[cfg(test)]
// mod tests {
//     use crate::api::api;
//
//     #[test]
//     fn api_works() {
//         let _api = api();
//     }
// }
