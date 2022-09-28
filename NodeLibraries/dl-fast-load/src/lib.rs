extern crate core;

use neon::prelude::*;
use neon::types::buffer::TypedArray;
use std::io::{BufReader, Read};
use std::thread;

pub struct NodeStream<'a> {
    stream: Handle<'a, JsObject>,
    read_func: Handle<'a, JsFunction>,
    cx: FunctionContext<'a>,
}

impl<'a> NodeStream<'a> {
    fn new(stream: Handle<'a, JsObject>, mut cx: FunctionContext<'a>) -> Self {
        let read_func: Handle<JsFunction> = stream.get(&mut cx, "read").unwrap();

        return NodeStream {
            stream,
            read_func,
            cx,
        };
    }

    fn ret(&mut self) -> JsResult<JsString> {
        return Ok(JsString::new(&mut self.cx, "bob"));
    }
}

impl<'a> Read for NodeStream<'a> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        // since we're handling backpressure manually we need to wait until the stream is readable
        while !(self.stream.get(&mut self.cx, "readable").unwrap() as Handle<JsBoolean>)
            .value(&mut self.cx)
        {
            println!("Not readable")
        }

        if !(self.stream.get(&mut self.cx, "readableEnded").unwrap() as Handle<JsBoolean>)
            .value(&mut self.cx)
            && (self.stream.get(&mut self.cx, "readableLength").unwrap() as Handle<JsNumber>)
                .value(&mut self.cx) == 0 as f64
        {
            println!("ended");
            return Ok(0);
        }

        println!("reading");
        let values: JsResult<JsBuffer> = self
            .read_func
            .call_with(&self.cx)
            .this(self.stream)
            .arg(self.cx.number(buf.len() as i32))
            .apply(&mut self.cx);

        let bytes = values.unwrap();
        let bytes = bytes.as_slice(&mut self.cx);
        buf.copy_from_slice(bytes);

        return Ok(bytes.len());
    }
}

fn ingest<'a>(mut cx: FunctionContext) -> JsResult<JsNull> {
    let null = cx.null();
    let stream: Handle<JsObject> = cx.argument(0).unwrap();
    let mut reader = BufReader::with_capacity(4096, NodeStream::new(stream, cx));
    let mut rdr = csv::Reader::from_reader(reader);
    for result in rdr.records() {
        // The iterator yields Result<StringRecord, Error>, so we check the
        // error here..
        let record = result;
        println!("{:?}", record);
    }

    return Ok(null);
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("ingest", ingest)?;
    Ok(())
}
