extern crate core;

use neon::prelude::*;
use neon::types::buffer::TypedArray;
use std::io::{BufReader, Read};
use std::sync::{Arc, mpsc, Mutex};
use std::sync::mpsc::{Receiver, Sender};
use std::thread;
use std::time::Instant;
use neon::result::Throw;

pub struct Manager {
    channel: Sender<ManagerMessage>,
}

impl<'a> Finalize for Manager {}

impl Manager {
    fn new(mut cx: FunctionContext) -> JsResult<JsBox<Manager>> {
        let (tx, rx) = mpsc::channel::<ManagerMessage>();

        thread::spawn(move || {
            let stream = NodeStream::new(rx);
            let stream = BufReader::with_capacity(4096, stream);
            let mut i = 0;

            let mut rdr = csv::ReaderBuilder::new().flexible(true).from_reader(stream);
            let start = Instant::now();
            for result in rdr.records() {
                // The iterator yields Result<StringRecord, Error>, so we check the
                // error here..
                let record = result;
                // println!("{:?}", record);
                i += 1
            }

            let duration = start.elapsed();
            println!("Time elapsed in reading {:?} rows is: {:?}", i, duration);
        });


        return Ok(cx.boxed(Manager {
            channel: tx
        }));
    }

    fn read(mut cx: FunctionContext) -> JsResult<JsNull> {
        let manager = cx.argument::<JsBox<Manager>>(0)?;
        let null = cx.null();
        let chunk = cx.argument::<JsTypedArray<u8>>(1)?.as_slice(&mut cx).to_vec();

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
    channel: Receiver<ManagerMessage>,
    buffer: Vec<u8>,
    is_closed: bool,
}

impl NodeStream {
    fn new(rx: Receiver<ManagerMessage>) -> Self {
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
