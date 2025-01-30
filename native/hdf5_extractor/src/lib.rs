extern crate rustler;
extern crate serde_json;

mod hdf5_extractor;
use hdf5_extractor::extract_hdf5_info;

use rustler::{Encoder, Env, Term};
use serde_json::Value;
use std::collections::HashMap;

mod atoms {
    rustler::atoms! {
        ok,
        error
    }
}

#[rustler::nif]
pub fn extract<'a>(env: Env<'a>, file_path: String, _opts: Term<'a>) -> Term<'a> {
    match extract_hdf5_info(file_path) {
        Ok(hdf5_info_json) => match serde_json::to_string(&hdf5_info_json) {
            Ok(json_string) => match serde_json::from_str::<serde_json::Value>(&json_string) {
                Ok(decoded_json) => (atoms::ok(), json_to_term(env, decoded_json)).encode(env),
                Err(e) => {
                    let error_message = format!("JSON decoding error: {:?}", e);
                    (atoms::error(), error_message).encode(env)
                }
            },
            Err(e) => {
                let error_message = format!("JSON serialization error: {:?}", e);
                (atoms::error(), error_message).encode(env)
            }
        },
        Err(e) => {
            let error_message = format!("Error: {:?}", e);
            (atoms::error(), error_message).encode(env)
        }
    }
}

fn json_to_term<'a>(env: Env<'a>, value: Value) -> Term<'a> {
    match value {
        Value::Null => rustler::types::atom::nil().encode(env),
        Value::Bool(b) => b.encode(env),
        Value::Number(num) => {
            if let Some(i) = num.as_i64() {
                i.encode(env)
            } else if let Some(u) = num.as_u64() {
                u.encode(env)
            } else if let Some(f) = num.as_f64() {
                f.encode(env)
            } else {
                panic!("Unsupported number type")
            }
        }
        Value::String(s) => s.encode(env),
        Value::Array(arr) => {
            let terms: Vec<Term> = arr.into_iter().map(|v| json_to_term(env, v)).collect();
            terms.encode(env)
        }
        Value::Object(obj) => {
            let map: HashMap<_, _> = obj
                .into_iter()
                .map(|(k, v)| (k.encode(env), json_to_term(env, v)))
                .collect();
            map.encode(env)
        }
    }
}

rustler::init!("Elixir.Datum.Plugins.HDF5");
