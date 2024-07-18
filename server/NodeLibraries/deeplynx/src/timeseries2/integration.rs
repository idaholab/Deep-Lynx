// NOTE: test file. This should be revisited near the end.
#![feature(assert_matches)]

use std::assert_matches::assert_matches;
use std::iter::zip;
// #![allow(unused_imports, dead_code, unused_variables)]
use amiquip::{
    Connection,
    ConsumerMessage,
    ConsumerOptions,
    Exchange,
    Publish,
    QueueDeclareOptions,
};
use log::{info, SetLoggerError};
use serde_json::Value;
use std::path::Path;
use datafusion::common::assert_contains;
use ts2::api::{
    // api,
    date_time_string,
    get_api_no_token,
};
use ts2::cli;
use ts2::cli::Cli;
use ts2::error::{APIError, Result, TSError};
use ts2::logger::setup_logger;
use ts2::request::{
    result_to_response,
    Request,
};

#[tokio::test]
async fn test_build() -> Result<()> {
    let cli = Cli::custom_parse();

    info!("Initializing the API...");
    let api = get_api_no_token()?;
    info!("  done.");

    info!("Attaching to RabbitMQ...");
    let _ = attach_to_rabbitmq(cli).await?;
    info!("  Attached.");

    info!("DeepLynx health check...");
    let _ = api.health_check().await?;
    info!("  Health check done.");

    info!("Creating a container and data sources for testing");
    let container_name = format!("test_container {}", date_time_string());
    info!("  Creating \"{}\"...", container_name);
    let container_id = api.create_container(container_name.as_str()).await?;
    info!("    Created container_id {}", container_id);

    info!("Creating a single data source...");
    let data_source_id = api
        .create_data_source(container_id, "test_data_source", "standard")
        .await?;
    info!("  Created data source_id {}.", data_source_id);

    // https://stackoverflow.com/questions/66681354/reqwest-send-multipart-form-with-very-large-attachment
    info!("Uploading \"timeseries\" test files...");
    let mut file_ids = Vec::<u64>::new();
    for s in vec![
        "./tests/userdata1.csv",
        "./tests/userdata1.parquet",
        "./tests/output_1000.csv",
        ]
        .iter()
    {
        info!("  Uploading File {} ...", s);
        let import_file = Path::new(s);
        // let container_id = 68;
        // let data_source_id = 68;
        let file_id = api
            .upload_file(container_id, data_source_id, import_file)
            .await?;
        info!("    Uploaded file_id {}", file_id);
        // break;
        file_ids.push(file_id);
    }

    info!("\"Describing\" the uploaded files...");
    let mut report_ids = Vec::<u64>::new();
    for file_id in file_ids {
        info!("  Describing file_id {}...", file_id);
        let report_id = api.describe(container_id, file_id).await?;
        info!("    Described and got report_id {}", report_id);
        report_ids.push(report_id);
    }

    info!("\"Polling\" the pending Reports...");
    let mut statuses = Vec::<String>::new();
    for report_id in &report_ids {
        info!("  Polling report_id {}...", report_id);
        let status = api.poll_report(container_id, report_id).await?;
        info!("    Polled report_id {} is {}...", report_id,  status);
        statuses.push(status.clone());
    }

    // test what if the report doesn't exist
    let report_id = 123457; // gibberish report number
    info!("\"Polling\" unknown report_id {} ...", report_id);
    let status = match api.poll_report(container_id, &report_id).await {
        Ok(_) => { assert!(false); "error".to_string() }
        Err(e) => { format!("{}",e) }
    };
    info!("    Polled report_id {} is {}...", report_id,  status);

    for (report_id,status) in zip(&report_ids,statuses) {
        assert_matches!(status.as_str(), "ready"|"polling"|"error");
        if status == "ready" {
            // todo what is the next test???

        }


    }
    // let file = "./tests/userdata1.csv";
    // let id1 = api.upload_file(container_id, data_source_id , Path::new(format!("{}",file).as_str())).await?;
    //
    // let file = "./tests/userdata1.parquet";
    // println!("Uploading File {}", file);
    // let id1 = api.upload_file(container_id, data_source_id , Path::new(format!("{}",file).as_str())).await?;

    // info!("describe file");
    // let _report_id1 = api.describe(container_id,id1).await?;
    // let _report_id2 = api.describe(container_id,id2).await?;

    // assert!(false);
    Ok(())
}

// #[tokio::test]
async fn attach_to_rabbitmq(cli:Cli) -> Result<bool> {
    let mut connection = match Connection::insecure_open(cli.url_rabbitmq.as_str()) {
        Ok(c) => c,
        Err(e) => return Err(TSError::from(e)),
    };
    let channel = match connection.open_channel(None) {
        Ok(channel) => channel,
        Err(_) => {
            return Err(TSError::Str("Could not open channel in queue."));
        }
    };

    // create a request queue
    let queue_options = QueueDeclareOptions {
        durable: true,
        exclusive: false,
        auto_delete: false,
        arguments: Default::default(),
    };
    let queue_name = cli.emitter_queue.as_str();
    let request_queue = match channel.queue_declare(queue_name, queue_options.clone()) {
        Ok(rq) => rq,
        Err(_) => {
            return Err(TSError::Error(format!(
                "Could not open {} queue.",
                queue_name
            )));
        }
    };

    // create a consumer for request queue
    let consumer_options = ConsumerOptions {
        no_local: false,
        no_ack: false,
        exclusive: false,
        arguments: Default::default(),
    };
    let _consumer = match request_queue.consume(consumer_options) {
        Ok(c) => c,
        Err(_) => {
            return Err(TSError::Error(format!(
                "Could create {} consumer.",
                queue_name
            )));
        }
    };

    // create a response queue
    let queue_name = cli.response_queue.as_str();
    let _response_queue = match channel.queue_declare(queue_name, queue_options.clone()) {
        Ok(rq) => rq,
        Err(_) => {
            return Err(TSError::Error(format!(
                "Could not open {} queue.",
                queue_name
            )));
        }
    };

    // Get a handle to the direct exchange on our channel.
    let exchange = Exchange::direct(&channel);

    // Publish a Request to the queue. Just pass the json string as-is and let the
    // consumer verify and return error codes.
    let request = Request::sample("42".to_string());
    let body = serde_json::to_string(&request)?;
    exchange.publish(Publish::new(body.as_bytes(), cli.emitter_queue))?;
    Ok(true)
}

// // #[tokio::test]
// async fn deep_lynx_health_check() -> Result<()> {
//     let api = get_api_no_token()?;
//     let b = api.health_check().await?;
//     assert!(b);
//     Ok(())
// }
//
// // #[tokio::test]
// async fn create_container() -> Result<()> {
//     let name = format!("test_container {}", date_time_string());
//     let api = get_api_no_token()?;
//     let id = api
//         .create_container(name.as_str())
//         .await?;
//     println!("container_id: {}", id);
//     Ok(())
// }
//
// // #[tokio::test]
// async fn create_data_source() -> Result<()> {
//     let api = get_api_no_token()?;
//     api
//         .create_data_source(1, "test_data_source", "standard")
//         .await?;
//     Ok(())
// }

// #[tokio::test]
// async fn upload_file() -> Result<()> {
//     for p in vec!["./tests/userdata1.csv", "./tests/userdata1.parquet"] {
//         let container_id = 1;
//         let data_source_id = 1;
//         let import_file = Path::new(p);
//         assert!(import_file.exists());
//         let api = get_api_no_token()?;
//         let id = api
//             .upload_file(container_id, data_source_id, import_file)
//             .await?;
//         println!("upload_id: {}", id);
//     }
//
//     Ok(())
// }

// #[tokio::test]
// async fn describe() -> Result<()> {
//     let api = get_api_no_token()?;
//     let id = api.describe(1,1).await?;
//     println!("describe report_id is {}", id);
//     Ok(())
// }

#[allow(dead_code)]
pub fn publish(request: Request) -> Result<()> {
    let cli = Cli::custom_parse();

    let mut connection = Connection::insecure_open(cli.url_rabbitmq.as_str())?;

    // Open a channel - None says let the library choose the channel ID.
    let channel = connection.open_channel(None)?;

    // Declare the queue options (note: must match DL options)
    let options = QueueDeclareOptions {
        durable: true,
        exclusive: false,
        auto_delete: false,
        arguments: Default::default(),
    };

    // Get a handle to the direct exchange on our channel.
    let exchange = Exchange::direct(&channel);

    // Publish a message to the queue. Just pass the json string as-is and let the
    // consumer verify and return error codes.
    let body = serde_json::to_string::<Request>(&request)?;
    let routing_key = cli.emitter_queue;
    exchange.publish(Publish::new(body.as_bytes(), routing_key))?;

    // // now listen for response
    let response_queue = channel.queue_declare(cli.response_queue.to_owned(), options.clone())?;
    let consumer = response_queue.consume(ConsumerOptions::default())?;

    // for (_i, message) in consumer.receiver().iter().enumerate() {
    // no loop here as above because we are only waiting for one response
    if let Some((_i, message)) = consumer.receiver().iter().enumerate().next() {
        match message {
            ConsumerMessage::Delivery(delivery) => {
                let body = String::from_utf8_lossy(&delivery.body).to_string();
                consumer.ack(delivery)?;
                let value = serde_json::from_str::<Value>(body.as_ref())?;
                let _response = result_to_response(value)?;
            }
            other => {
                info!("Consumer ended: {:?}", other);
            }
        }
    }

    Ok(connection.close()?)
}
