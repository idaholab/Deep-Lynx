use amiquip::{
    Channel,
    Connection,
    Consumer,
    ConsumerMessage,
    ConsumerOptions,
    Exchange,
    Publish,
    Queue,
    QueueDeclareOptions,
};
use log::{
    error,
    info,
};
use std::{
    thread,
    time,
};
use ts2::cli::Cli;
use ts2::request::Request;
use ts2::response::Response;
use ts2::types::info_pretty;

#[tokio::main]
async fn main() {
    let cli = Cli::custom_parse();

    let mut connection = open_rabbitmq_or_hunt(cli.url_rabbitmq.as_str()); // TODO: remove, we don't use queues

    let channel = open_channel_or_exit(&mut connection); // TODO: remove, we don't use queues

    let request_queue = declare_queue_or_exit(&channel, cli.emitter_queue.to_owned()); // TODO: remove, we don't use queues

    let consumer = create_consumer_or_exit(&request_queue); // TODO: remove, we don't use queues

    // let exchange = Exchange::direct(&channel);

    // TODO: remove, we don't use queues
    info!(
        "Waiting for messages on queue: {} ... ",
        cli.emitter_queue.to_owned()
    );

    for message in consumer.receiver().iter() {
        match message {
            ConsumerMessage::Delivery(delivery) => {
                let body = String::from_utf8_lossy(&delivery.body);
                _ = consumer.ack(delivery.clone()); // ignore any errors

                // create a Request object from the message body // catching errors
                let request = Request::from_msg_body(body.as_ref()); // TODO: this is what we care about- parsing Request from payload

                match request {
                    Ok(request) => {
                        info_pretty("processing request:", &request);
                        let response = process_request_or_continue(request).await;
                        info_pretty("got response: ", &response);
                        publish_response_and_continue(
                            Exchange::direct(&channel),
                            cli.response_queue.as_str(),
                            response,
                        );
                    }
                    // we are in main() so no errors get passed up... process 'em
                    Err(_e) => {
                        publish_response_and_continue(
                            Exchange::direct(&channel),
                            &cli.response_queue,
                            Response::from_id_msg("unknown", "invalid request message body"),
                        );
                    }
                };
            }
            other => {
                match other {
                    // todo:rhetorical: how do we test all these possibilities? and...
                    // todo:rhetorical: are there any of these that are non fatal
                    ConsumerMessage::Delivery(_) => { /* already handled */ }
                    ConsumerMessage::ClientCancelled => {
                        info!("Client Cancelled")
                    }
                    ConsumerMessage::ServerCancelled => {
                        info!("Server Cancelled")
                    }
                    ConsumerMessage::ClientClosedChannel => {
                        info!("Client Closed Channel")
                    }
                    ConsumerMessage::ServerClosedChannel(ref _m) => {
                        info!("Server  Closed Channel")
                    }
                    ConsumerMessage::ClientClosedConnection => {
                        info!("Client Closed Connection")
                    }
                    ConsumerMessage::ServerClosedConnection(ref _m) => {
                        info!("Server Closed Connection")
                    }
                }
                break;
            }
        }
    }
    _ = connection.close();
}

fn open_rabbitmq_or_hunt(url: &str) -> Connection { // TODO: remove, we don't use queues
    loop {
        match Connection::insecure_open(url) {
            Ok(connection) => {
                return connection;
            }
            Err(_) => {
                thread::sleep(time::Duration::from_secs(3));
                info!("Looking for RabbitMQ {}... (Hunting Wabbits)", url);
            }
        }
    }
}

fn open_channel_or_exit(connection: &mut Connection) -> Channel { // TODO: remove, we don't use queues
    match connection.open_channel(None) {
        Ok(channel) => channel,
        Err(_) => {
            error!("Could not open channel in queue.");
            std::process::exit(42);
        }
    }
}

fn declare_queue_or_exit(channel: &Channel, queue_name: String) -> Queue { // TODO: remove, we don't use queues
    // Declare the queue options (note: must match DL options)
    let options = QueueDeclareOptions {
        durable: true,
        exclusive: false,
        auto_delete: false,
        arguments: Default::default(),
    };

    // let queue = channel.queue_declare("events", QueueDeclareOptions::default())?;
    // declare the queue that we are listening to
    let request_queue = match channel.queue_declare(queue_name, options.clone()) {
        Ok(rq) => rq,
        Err(_) => {
            error!("Could not open queue by name.");
            std::process::exit(42);
        }
    };
    request_queue
}

fn create_consumer_or_exit<'a>(request_queue: &'a Queue<'a>) -> Consumer<'a> { // TODO: remove, we don't use queues
    let options = ConsumerOptions {
        no_local: false,
        no_ack: false,
        exclusive: false,
        arguments: Default::default(),
    };
    let consumer = match request_queue.consume(options) {
        Ok(c) => c,
        Err(_) => {
            error!("Could not create consumer in queue.");
            std::process::exit(42);
        }
    };
    consumer
}

fn publish_response_and_continue(exchange: Exchange, queue: &str, response: Response) { // TODO: remove, we don't use queues
    let response_string = match serde_json::to_string(&response) {
        Ok(s) => s,
        Err(e) => {
            error!("main1:{}", e);
            return;
        }
    };
    match exchange.publish(Publish::new(response_string.as_bytes(), queue.to_owned())) {
        Ok(_) => {}
        Err(e) => {
            error!("main2:{}", e);
        }
    };
}

async fn process_request_or_continue(request: Request) -> Response { // this is really the only thing we still care to do
    match request.process().await {
        Ok(response) => response,
        Err(e) => e.to_response(request, format!("{}", e)),
    }
}
