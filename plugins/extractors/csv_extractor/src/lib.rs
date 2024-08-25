use arrow_csv::infer_schema_from_files;
use std::{env, process};

#[no_mangle]
pub fn extract() {
    let file_name = match env::var_os("FILE_NAME") {
        None => {
            eprintln!("missing file location");
            process::exit(1)
        }
        Some(l) => l,
    }
    .into_string()
    .unwrap();

    let file_name = format!("/temp/{}", file_name);

    let mut delim_buffer = [0; 1];
    match env::var_os("DELIMITER") {
        None => ',',
        Some(l) => {
            let vec: Vec<char> = l.to_str().unwrap().chars().collect();
            match vec.first() {
                None => ',',
                Some(c) => *c,
            }
        }
    }
    .encode_utf8(&mut delim_buffer);

    let schema = infer_schema_from_files(&[file_name], delim_buffer[0], Some(100), true).unwrap();

    match serde_json::to_string(&schema) {
        Ok(o) => {
            println!("{o}")
        }
        Err(e) => {
            eprintln!("error converting schema to json {:?}", e);
            process::exit(1)
        }
    }
}
