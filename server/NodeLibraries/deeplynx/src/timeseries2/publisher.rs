#![allow(unused_variables, dead_code)]
use crate::request::Request;

use crate::cli::Cli;
use log::info;

use crate::error::{
    Result,
    TSError,
};
use crate::response::Response;
use crate::types::info_pretty;
use amiquip::{
    Connection,
    ConsumerMessage,
    ConsumerOptions,
    Exchange,
    Publish,
    QueueDeclareOptions,
};

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
    exchange.publish(Publish::new(
        cli.json_string
            .ok_or(TSError::Str("no json to publish"))?
            .as_bytes(),
        cli.emitter_queue,
    ))?;

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
                let response = serde_json::from_str::<Response>(body.as_ref())?;

                info_pretty("got response:", response);
            }
            other => {
                info!("Consumer ended: {:?}", other);
            }
        }
    }

    Ok(connection.close()?)
}

// fn stringify(json: &str) -> String {
//     str::replace(str::replace(json, "\"", "\\\"").as_str(), "\n", "")
// }
