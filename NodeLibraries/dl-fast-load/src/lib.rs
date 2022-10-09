extern crate core;

use neon::prelude::*;
use neon::result::Throw;
use neon::types::buffer::TypedArray;
use once_cell::sync::OnceCell;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgConnection;
use std::borrow::Borrow;
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

impl<'a> Finalize for Manager {}

impl Manager {
    fn new(mut cx: FunctionContext) -> JsResult<JsBox<Manager>> {
        //let connection_string = cx.argument::<JsString>(0)?.value(&mut cx);
        let connection_string = String::from("postgresql://darrjw@localhost:5433/deep_lynx");
        let rt = runtime(&mut cx)?;
        let (tx, rx) = mpsc::channel::<ManagerMessage>();

        rt.spawn(async move {
            let pool = PgPoolOptions::new()
                .max_connections(5)
                .connect(connection_string.borrow())
                .await;

            println!("Connections established");
            let (mut tx1, mut rx1) = tokio::sync::mpsc::channel::<CopyMessage>(2048);

            rt.spawn(async move {
                let start = Instant::now();
                let mut copier = pool
                    .unwrap()
                    .copy_in_raw("COPY test_table(bldg_number) FROM STDIN WITH (FORMAT csv)")
                    .await;
                let mut copier = copier.unwrap();

                loop {
                    let message = rx1.recv().await;
                    match message {
                        None => {}
                        Some(m) => match m {
                            CopyMessage::Copy(message) => {
                                copier.send(message.as_slice()).await;
                            }
                            CopyMessage::Close => {
                                println!("finished");
                                break;
                            }
                        },
                    }
                }

                let bob = copier.finish().await;
                println!("{:?}", bob);
                let duration = start.elapsed();
                println!("Time elapsed in writing 1 million rows is: {:?}", duration);
            });

            let stream = NodeStream::new(rx);
            let stream = BufReader::with_capacity(4096, stream);
            let mut i = 0;

            let mut rdr = csv::ReaderBuilder::new().flexible(true).from_reader(stream);

            while let Some(result) = rdr.records().next() {
                // The iterator yields Result<StringRecord, Error>, so we check the
                // error here..
                let record = result.unwrap();
                tx1.send(CopyMessage::Copy(
                    [
                        record.as_byte_record().as_slice().to_vec(),
                        String::from("\n").into_bytes(),
                    ]
                    .concat(),
                ))
                .await;

                // println!("{:?}", record);

                i += 1;
            }

            tx1.send(CopyMessage::Close).await;
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

        manager.channel.send(ManagerMessage::Write(chunk)).unwrap();

        return Ok(null);
    }

    fn finish(mut cx: FunctionContext) -> JsResult<JsNull> {
        let manager = cx.argument::<JsBox<Manager>>(0)?;
        let null = cx.null();

        manager.channel.send(ManagerMessage::Close).unwrap();

        return Ok(null);
    }
}

enum CopyMessage {
    Copy(Vec<u8>),
    Close,
}

// Messages sent on the database channel
enum ManagerMessage {
    // Promise to resolve and callback to be executed
    // Deferred is threaded through the message instead of moved to the closure so that it
    // can be manually rejected.
    Write(Vec<u8>),
    // Indicates that the thread should be stopped and connection closed
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
    cx.export_function("manager", Manager::new)?;
    cx.export_function("read", Manager::read)?;
    cx.export_function("finish", Manager::finish)?;
    Ok(())
}
