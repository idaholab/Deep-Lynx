extern crate core;

use neon::prelude::*;
use std::borrow::BorrowMut;
use std::io::Read;
use neon::handle::Managed;
use neon::types::buffer::TypedArray;

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
        // pull the read func from the stream object


        let values: JsResult<JsBuffer> = self.read_func.call_with(&self.cx).this(self.stream).arg(self.cx.number(100)).apply(&mut self.cx);
        let bob = values.unwrap();
        let check = bob.as_slice(&mut self.cx);
        dbg!(check);


        /*
        let values :Handle<JsValue>= self.read_func.call(&mut self.cx, self.stream, vec![]).unwrap();
        println!("{:?}", values.to_raw());


        let array: JsResult<JsObject> = values
            .downcast_or_throw(&mut self.cx);
        println!("{:?}", array);

         */


        return Ok(buf.len());
    }
}

fn ingest<'a>(mut cx: FunctionContext) -> JsResult<JsNull> {
    let stream: Handle<JsObject> = cx.argument(0).unwrap();
    let null = cx.null();

    let mut node_stream = NodeStream::new(stream, cx);
    let mut buf: Vec<u8> = vec![];


    node_stream.read(&mut buf);

    return Ok(null);
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("ingest", ingest)?;
    Ok(())
}
