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
        // TODO: get the argument object out of the function
        let connection_string = cx.argument::<JsString>(0)?.value(&mut cx);
        //let connection_string = String::from("postgresql://darrjw@localhost:5433/deep_lynx");
        // TODO: copy the argument object into a rust struct representing the table needing to be done

        let rt = runtime(&mut cx)?;
        let (tx, rx) = mpsc::channel::<ManagerMessage>();

        rt.spawn(async move {
            let pool = PgPoolOptions::new()
                .max_connections(5)
                .connect(connection_string.borrow())
                .await;

            // TODO: pull in table information this is going to, pass it into the copy thread, this thread - only in charge of the copy
            let (mut tx1, mut rx1) = tokio::sync::mpsc::channel::<ManagerMessage>(2048);
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

                println!("{:?}", copier.finish().await);
                println!("Time elapsed in writing 1 million rows is: {:?}", start.elapsed());
            });

            let stream = BufReader::with_capacity(4096, NodeStream::new(rx));
            let mut rdr = csv::ReaderBuilder::new().flexible(true).from_reader(stream);

            let mut i = 0;
            while let Some(result) = rdr.records().next() {
                // TODO: if it has a header, set a map for accessing and ordering the input if header isn't set then ignore map and do a straight insert in the order of the input
                // TODO: create a record to send that's in the proper order, has timestamps converted, and has had string replace ran to get rid of "," on numbers (or "." if european)
                // TODO: add better error handling
                let record = result.unwrap();
                let sent = tx1.send(ManagerMessage::Write(
                    [
                        record.as_byte_record().as_slice().to_vec(),
                        String::from("\n").into_bytes(),
                    ]
                        .concat(),
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
