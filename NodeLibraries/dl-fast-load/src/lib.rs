extern crate core;

use chrono::{DateTime, NaiveDateTime, Utc};
use neon::prelude::*;
use neon::result::Throw;
use neon::types::buffer::TypedArray;
use once_cell::sync::OnceCell;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgConnection;
use std::borrow::Borrow;
use std::collections::HashMap;
use std::future::Future;
use std::io::{BufReader, Read};
use std::ops::Deref;
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::Instant;
use tokio::runtime::Runtime;
use tokio::sync::futures;
use tokio::sync::mpsc::Sender;

// Return a global tokio runtime or create one if it doesn't exist.
// Throws a JavaScript exception if the `Runtime` fails to create.
fn runtime<'a, C: Context<'a>>(cx: &mut C) -> NeonResult<&'static Runtime> {
    static RUNTIME: OnceCell<Runtime> = OnceCell::new();

    RUNTIME.get_or_try_init(|| Runtime::new().or_else(|err| cx.throw_error(err.to_string())))
}

pub struct Manager {
    channel: mpsc::Sender<ManagerMessage>,
}

#[derive(Clone, Debug)]
pub struct DataSource {
    id: String,
    adapter_type: String,
    columns: Vec<TimeseriesColumn>,
}

#[derive(Clone, Debug)]
pub struct TimeseriesColumn {
    column_name: String,
    property_name: String,
    is_primary_timestamp: bool,
    data_type: String,
    date_conversion_format_string: String,
}

impl<'a> Finalize for Manager {}

impl Manager {
    fn new(mut cx: FunctionContext) -> JsResult<JsBox<Manager>> {
        let input_object = cx.argument::<JsObject>(0)?;

        let connection_string: Handle<JsString> = input_object.get(&mut cx, "connectionString")?;
        let connection_string = connection_string.value(&mut cx);

        let data_source: Handle<JsObject> = input_object.get(&mut cx, "dataSource")?;
        let data_source_id: Handle<JsString> = data_source.get(&mut cx, "id")?;
        let data_source_id = data_source_id.value(&mut cx);

        let adapter_type: Handle<JsString> = data_source.get(&mut cx, "adapter_type")?;
        let adapter_type = adapter_type.value(&mut cx);

        let config: Handle<JsObject> = data_source.get(&mut cx, "config")?;
        let columns: Handle<JsArray> = config.get(&mut cx, "columns")?;
        let mut final_columns: Vec<TimeseriesColumn> = vec![];

        for i in 0..columns.len(&mut cx) {
            let column: Handle<JsObject> = columns.get(&mut cx, i)?;
            let column_name: Handle<JsString> = column.get(&mut cx, "column_name")?;
            let property_name: Handle<JsString> = column.get(&mut cx, "property_name")?;
            let is_primary_timestamp: Handle<JsBoolean> =
                column.get(&mut cx, "is_primary_timestamp")?;
            let data_type: Handle<JsString> = column.get(&mut cx, "type")?;

            let mut date_conversion_format_string = JsString::new(&mut cx, "");
            if data_type.value(&mut cx).as_str() == "date" {
            date_conversion_format_string = column.get(&mut cx, "date_conversion_format_string")?;
            }

            final_columns.push(TimeseriesColumn {
                column_name: column_name.value(&mut cx),
                property_name: property_name.value(&mut cx),
                is_primary_timestamp: is_primary_timestamp.value(&mut cx),
                data_type: data_type.value(&mut cx),
                date_conversion_format_string: date_conversion_format_string.value(&mut cx),
            })
        }

        let data_source = DataSource {
            id: data_source_id,
            adapter_type: adapter_type,
            columns: final_columns,
        };
        let table_name = format!("y_{}", data_source.id);

        let rt = runtime(&mut cx)?;
        let (tx, rx) = mpsc::channel::<ManagerMessage>();

        rt.spawn(async move {
            let pool = PgPoolOptions::new()
                .max_connections(5)
                .connect(connection_string.borrow())
                .await;

            let (mut tx1, mut rx1) = tokio::sync::mpsc::channel::<ManagerMessage>(2048);
            rt.spawn(async move {
                let start = Instant::now();
                let mut copier = pool
                    .unwrap()
                    .copy_in_raw(
                        format!(
                            "COPY {} FROM STDIN WITH (DELIMITER '|', FORMAT csv)",
                            table_name
                        )
                        .as_str(),
                    )
                    .await;
                let mut copier = copier.unwrap();

                loop {
                    let message = rx1.recv().await;
                    match message {
                        None => {}
                        Some(m) => match m {
                            ManagerMessage::Write(message) => {
                                copier.send(message.as_slice()).await;
                            }
                            ManagerMessage::Close => {
                                println!("finished");
                                break;
                            }
                        },
                    }
                }

                let result = copier.finish().await;
                result.unwrap();
                println!(
                    "Time elapsed in writing rows is: {:?}",
                    start.elapsed()
                );
            });

            let stream = BufReader::with_capacity(4096, NodeStream::new(rx));
            let mut rdr = csv::ReaderBuilder::new().flexible(true).from_reader(stream);
            let mut order: Vec<usize> = vec![];
            let mut map: HashMap<usize, TimeseriesColumn> = HashMap::new();

            // because we're borrowing here lets keep this in its own scope
            // we need to build the order in which we reorganize the csv file
            for column in data_source.columns {
                {
                    let headers = rdr.headers().unwrap();

                    for (i, header) in headers.iter().enumerate() {
                        if header == column.property_name {
                            order.push(i);
                            map.insert(i, column.clone());
                            break;
                        }
                    }
                }
            }

            let mut i = 0;
            while let Some(result) = rdr.records().next() {
                let mut to_send: Vec<String> = vec![];
                let record = result.unwrap();
                for index in &order {
                    match record.get(index.clone()) {
                        Some(value) => {
                            match map.get(&index) {
                                Some(column) => {
                                    if column.data_type == "date" {
                                        let parsed = NaiveDateTime::parse_from_str(
                                            value,
                                            column.date_conversion_format_string.as_str(),
                                        )
                                        .unwrap();
                                        to_send.push(parsed.to_string());
                                        continue;
                                    }

                                    // make sure we're removing the comma on number types, postgres will freak out
                                    if column.data_type == "number"
                                        || column.data_type == "number64"
                                        || column.data_type == "float"
                                        || column.data_type == "float64"
                                    {
                                        to_send.push(value.replace(",", ""));
                                        continue;
                                    }

                                    to_send.push(value.to_string());
                                }
                                None => {}
                            }
                        }
                        None => {}
                    }
                }

                // append an additional empty field, will eventually be used to capture metadata
                to_send.push(String::from(""));
                let sent = tx1
                    .send(ManagerMessage::Write(
                        [to_send.join("|").as_bytes(), String::from("\n").as_bytes()].concat(),
                    ))
                    .await;

                i += 1;
            }

            tx1.send(ManagerMessage::Close).await;
        });

        return Ok(cx.boxed(Manager { channel: tx }));
    }

    fn read(mut cx: FunctionContext) -> JsResult<JsNull> {
        let manager = cx.argument::<JsBox<Manager>>(0)?;
        let null = cx.null();
        let chunk = cx
            .argument::<JsTypedArray<u8>>(1)?
            .as_slice(&mut cx)
            .to_vec();

        // TODO: add better error handling
        manager.channel.send(ManagerMessage::Write(chunk)).unwrap();

        return Ok(null);
    }

    fn finish(mut cx: FunctionContext) -> JsResult<JsNull> {
        let manager = cx.argument::<JsBox<Manager>>(0)?;
        let null = cx.null();

        // TODO: add better error handling
        manager.channel.send(ManagerMessage::Close).unwrap();

        return Ok(null);
    }
}

enum ManagerMessage {
    Write(Vec<u8>),
    Close,
}

pub struct NodeStream {
    channel: mpsc::Receiver<ManagerMessage>,
    buffer: Vec<u8>,
    is_closed: bool,
}

impl NodeStream {
    fn new(rx: mpsc::Receiver<ManagerMessage>) -> Self {
        return NodeStream {
            channel: rx,
            buffer: vec![],
            is_closed: false,
        };
    }
}

impl Read for NodeStream {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        if self.is_closed {
            return Ok(0);
        }

        if self.buffer.len() >= buf.len() {
            let send = self.buffer.clone();
            self.buffer = vec![];

            if (send.len() > buf.len()) {
                let (dest, overflow) = send.split_at(buf.len());

                buf.copy_from_slice(dest);
                self.buffer.extend_from_slice(overflow);

                return Ok(dest.len());
            } else {
                buf.copy_from_slice(send.as_slice());
                return Ok(buf.len());
            }
        }

        while let Ok(message) = self.channel.recv() {
            match message {
                ManagerMessage::Write(bytes) => self.buffer.extend_from_slice(bytes.as_slice()),
                ManagerMessage::Close => {
                    self.is_closed = true;
                    buf[..self.buffer.len()].copy_from_slice(self.buffer.as_slice());
                    let len = self.buffer.len();
                    self.buffer = vec![];

                    return Ok(len);
                }
            }

            if self.buffer.len() >= buf.len() {
                break;
            }
        }

        let send = self.buffer.clone();
        self.buffer = vec![];

        if (send.len() > buf.len()) {
            let (dest, overflow) = send.split_at(buf.len());

            buf.copy_from_slice(dest);
            self.buffer.extend_from_slice(overflow);

            return Ok(dest.len());
        } else {
            buf.copy_from_slice(send.as_slice());
            return Ok(buf.len());
        }
    }
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("new", Manager::new)?;
    cx.export_function("read", Manager::read)?;
    cx.export_function("finish", Manager::finish)?;
    Ok(())
}
