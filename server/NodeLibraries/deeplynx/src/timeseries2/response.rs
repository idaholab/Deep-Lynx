// use crate::error::Result;
// use crate::temp_file::TempFile;
// use crate::types::FileType;
use serde::{
    Deserialize,
    Serialize,
};
use serde_json::Value;
// use std::fs::File;
// use std::io::BufRead;

// use crate::request::upload_largeobject;
// use datafusion::prelude::DataFrame;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct Response {
    pub report_id: String,
    pub is_error: bool,
    pub value: Value,
}

/// Public interface
impl Response {
    pub fn from_id_msg(id: &str, msg: &str) -> Self {
        Response {
            report_id: id.to_string(),
            is_error: true,
            value: Value::from(msg),
        }
    }

    #[allow(dead_code)]
    fn as_string(&self) -> serde_json::Result<String> {
        serde_json::to_string(self)
    }
    // pub(crate) fn from_tuple(report_id: String, is_error: bool, msg: String) -> Response {
    //     // if we can turn this msg into a json value then do it and use that in Response {}
    //     // otherwise convert it to a safe string and use the format below
    //     if let Ok(value) = serde_json::from_str(msg.as_str()) {
    //         Response { report_id, is_error, value }
    //     } else {
    //         let msg_fixed = msg.replace('\"', "");
    //         let error_json = format!(r#"{{ "error": "{}" }}"#, msg_fixed);
    //         let value = match serde_json::from_str::<Value>(error_json.as_str()) {
    //             Ok(v) => v,
    //             Err(_) => {
    //                 return Response::default();
    //             }
    //         };
    //         Response { report_id, is_error, value }
    //     }
    // }

    // #[allow(dead_code)] // until it's definitely not needed
    // pub(crate) async fn from_describe_df(df: &DataFrame) -> Result<Response> {
    //     #[derive(Serialize, Deserialize)]
    //     struct DescribeRecord {
    //         column_name: String,
    //         data_type: String,
    //         is_nullable: String,
    //     }
    //     #[derive(Serialize, Deserialize)]
    //     struct DescribeResponse {
    //         count: u64,
    //         fields: Vec<DescribeRecord>,
    //     }
    //     let df_writer = TempFile::new(FileType::Json, df).await;
    //     let temp_file_path = df_writer.file_path();
    //
    //     let file = File::open(temp_file_path.as_str())?;
    //
    //     // todo:rhetorical: can we read the df directly without writing a temp file?
    //     let mut describe_response = DescribeResponse {
    //         count: 0,
    //         fields: vec![],
    //     };
    //     for line in std::io::BufReader::new(file).lines() {
    //         let describe_record = serde_json::from_str::<DescribeRecord>(line?.as_str())?;
    //         describe_response.count += 1;
    //         describe_response.fields.push(describe_record);
    //     }
    //     // now that we have a describe response, add it to the actual response object
    //     let value = serde_json::to_value(&describe_response)?;
    //     let response = Response {
    //         is_error: false,
    //         value,
    //     };
    //     Ok(response)
    // }

    // #[allow(dead_code)]
    // pub(crate) async fn from_sql_df(df: &DataFrame, route: &str) -> Result<Response> {
    //     let temp_file = TempFile::new(FileType::Csv, df).await;
    //     let response = upload_largeobject(temp_file.file_path().clone(), route).await?;
    //     Ok(response)
    // }
}
