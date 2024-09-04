#![deny(clippy::all)]
#![allow(non_snake_case)]

mod shapehasher_errors;
mod shapehasher_tests;

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
//use serde_json::{Value, Map};
use serde::de; // You need this to use de::Error::custom

//use sha2::{Sha256, Digest};

use base64;
use serde_json::{self, Map, Value};
use sha2::{Digest, Sha256};

#[derive(Serialize, Deserialize)]
#[napi(object)]
pub struct Options {
  pub stop_nodes: Option<Vec<String>>,
  pub value_nodes: Option<Vec<String>>,
}

impl Options {
  // Helper method to check if a variable name is present in value_nodes option
  fn is_value_node(&self, variable_name: &str, path: &[String]) -> bool {
    //here we check if self.value_nodes (from the options struct) is some (and not none) and if it is, passes the contents
    //of self.value_nodes to value_nodes for the duration of the if let block
    if let Some(value_nodes) = &self.value_nodes {
      //this iterates over each value in value_nodes collection and passes it to vn
      value_nodes.iter().any(|vn| {
        // parse the user-provided path into a vector string on the "."
        let vn_path = self.parse_path(vn);
        // Check if the user-provided path matches the current path in the JSON data
        //then checks if the last element in the parsed path matches the variable name
        vn_path == path && vn_path.last().map(|s| s.as_str()) == Some(variable_name)
      })
    } else {
      false
    }
  }

  fn parse_path(&self, path: &str) -> Vec<String> {
    path.split('.').map(|s| s.to_string()).collect()
  }

  // This method now takes `&self` so it can access the stop_nodes from the Options struct
  fn remove_stop_nodes(&self, obj: &mut Value) {
    //checking to see if stop nodes is empty or not
    if let Some(ref stop_nodes) = self.stop_nodes {
      // Recursively traverse the object and remove stop nodes
      if let Value::Object(map) = obj {
        let keys: Vec<String> = map.keys().cloned().collect();
        for key in keys {
          if stop_nodes.contains(&key) {
            map.remove(&key);
          } else {
            //recursion in the case of multiple levels, allowing access to any nested stop nodes
            //attempting to get mutable reference to value associated with key
            //use get mut instead of indexing because wont panic in case of key not being present
            if let Some(value) = map.get_mut(&key) {
              self.remove_stop_nodes(value);
            }
          }
        }
      }
    }
    // If stop_nodes is None, do nothing
  }
}

// This method prepares the JSON file data to be parsed and hashed. It takes in the data from a JSON file, and checks for any stop nodes
// in the option struct to be ignored/removed from the data. It then calls the recurseData function to being breaking down data structure
// and types. This function converts the string into valid serialized json, removes stop nodes at the outter layer, initiates a path string 
// for value node implementation and sends the info to recurseData to be further broken down.
// Note that is the entry point for the Rust shape hasher, passing the data from the type mappings type script file to here and
// returing there as well.
// argument "a" is the data to be hashed 
// options is the stop and value node settings the user has inputted
#[napi]
pub fn hash(a: String, options: Options) -> Result<String, napi::Error> {
  //Entry point of this file, serde_json::Value can reprsent any valid JSON, here we are parsing a string as JSON
  let data: serde_json::Value = serde_json::from_str(&a).map_err(|err| {
    napi::Error::new(
      napi::Status::GenericFailure,
      format!("Failed to parse JSON: {}", err),
    )
  })?;
  // Create a clone of the data to avoid manipulating the original object
  let mut to_hash = data.clone();
  let mut stop_nodes_vec: Vec<String> = Vec::new();
  if let Some(nodes) = &options.stop_nodes {
    // Now you can use the nodes variable, which contains the &Vec<String>.
    stop_nodes_vec = nodes.to_vec();
    options.remove_stop_nodes(&mut to_hash);
  }
  // Call recurseData with the updated 'to_hash' and 'stop_nodes_vec' values.
  let mut initial_path = Vec::new();
  let outcome: String =
    recurseData(to_hash, stop_nodes_vec, &options, &mut initial_path).map_err(|err| {
      napi::Error::new(
        napi::Status::GenericFailure,
        format!("Error processing data: {}", err),
      )
    })?;
  //dbg!(&outcome);
  println!("THE FOLLOWING IS THE what is going to be hashed: {}", outcome);
  let mut hasher = Sha256::new();
  hasher.update(outcome.as_bytes());
  // Finalize the hash
  let hash_bytes = hasher.finalize();
  // Encode the hash in Base64
  let hash_base64 = STANDARD.encode(hash_bytes);
  Ok(hash_base64)
}

// The inital called method to parse the JSON file into its appropriate datatypes. Recursive call with varying method arguments
// depending on array or object parsing. If it is of other data types, consider it completely parsed. This method is simply used
// as a place holder for the program to comprehend how many of each data type there is, how is it seperated and whether there is
// nested data types. The actual parsing and data type information is produced in the recurseArray and recurseObject fuctions.
// cleanedData is the json data passed in from the hash function with stop nodes removed at the outter most layer
// stopNodes is vector string representation of the stop nodes
// options is representation of the options
// path is used to keep track of current path and enable usage of value nodes
fn recurseData(
  cleanedData: Value,
  stopNodes: Vec<String>,
  options: &Options,
  path: &mut Vec<String>,
) -> Result<String, serde_json::Error> {
  let mut my_string = String::new();

  match cleanedData {
      serde_json::Value::Null => {}
      serde_json::Value::Bool(_) => {}
      serde_json::Value::Number(_) => {}
      serde_json::Value::String(_) => {}
      serde_json::Value::Array(mut resArray) => {
          for value in resArray.iter_mut() {
              options.remove_stop_nodes(value);
          }
          // Call `recurseArray` to process the array
          let arr_hash = recurseArray(resArray, &mut my_string, &stopNodes, options, path)?;
          my_string.push_str(&format!("array({})", arr_hash)); // Add "array" keyword
      }
      serde_json::Value::Object(mut v) => {
          for value in v.values_mut() {
              options.remove_stop_nodes(value);
          }
          // Call `recurseObject` to process the object
          let obj_hash = recurseObject(v.clone(), my_string.clone(), &stopNodes, options, path)?;
          my_string.push_str(&format!("object({})", obj_hash)); // Add "object" keyword
      }
  };

  Ok(my_string)
}


// Recursive method call if parsing of JSON file results in array data. Data will be further broken down from this point into
// its appropriate data types. Also checks if value node has been implemented at the path and add value instead of data type 
// accordingly. Also accounts for empty arrays or objects as well as further nested arrays or objects. Utilizes unique_hashes
// hashset to flatten redudant objects within an array that are meant to be recognized as the same. Also calls sort such that
// keys can be in different order but still result in the same hash.
// V2 is the vector of values
// s5 is the final parsing string (continue to be appended in recusive functinos)
// s2 is vector of stop nodes
// options is passing of original options struct
// path is used to enable value node functionality by keeping track of path
fn recurseArray(
  v2: Vec<Value>,
  s5: &mut String,
  s2: &Vec<String>,
  options: &Options,
  path: &mut Vec<String>,
) -> Result<String, serde_json::Error> {
  let mut x: String = s5.to_string();
  let mut unique_hashes: std::collections::HashSet<String> = std::collections::HashSet::new();

  if v2.is_empty() {
      // Handle the empty array case directly
      x.push_str("EMPTY_ARRAY");
  } else {
      for (key, val) in v2.iter().enumerate() {
          path.push(key.to_string());

          let value_type_or_value: String = if options.is_value_node(&key.to_string(), path) {
            // If the current path and key is a value node, include the actual value
            match val {
                Value::Object(obj) => { 
                  if obj.is_empty() {
                  format!(":{}", "EMPTY_OBJECT")
                } else {
                  let obj_hash = recurseObject(val.as_object().unwrap().clone(), String::new(), s2, options, path)?;
                  format!(":object({})", obj_hash)
                }
              }
                Value::Array(arr) => { 
                  if arr.is_empty() {
                  format!(":{}", "EMPTY_ARRAY")
                } else {
                  let arr_hash = recurseArray(val.as_array().unwrap().clone(), &mut x, s2, options, path)?;
                  format!(":array({})", arr_hash)
                }
              }
                Value::Null => {
                  format!("{}:null", key)
              }
                Value::Bool(b) => {
                  format!("{}:{}", key, b)
                }
                Value::Number(n) => {
                  format!("{}:{}", key, n)
                }
                Value::String(s) => {
                  format!("{}:{}", key, s.clone())
                }
            }
        } else {
            // If it's not a value node, include the type of the value
            match val {
                Value::Object(obj) => { 
                  if obj.is_empty() {
                  format!(":{}", "EMPTY_OBJECT")
                } else {
                  let obj_hash = recurseObject(val.as_object().unwrap().clone(), String::new(), s2, options, path)?;
                  format!(":object({})", obj_hash)
                }
              }
                Value::Array(arr) => { 
                  if arr.is_empty()  {
                  format!(":{}", "EMPTY_ARRAY")
                } else {
                  let arr_hash = recurseArray(val.as_array().unwrap().clone(), &mut x, s2, options, path)?;
                  format!(":array({})", arr_hash)
                }
              }
                Value::Null => {
                  format!("{}:null", key)

              }
                Value::Bool(_) => {
                  format!("{}:bool", key)
              }
                Value::Number(_) => {
                  format!("{}:number", key)
                }
                Value::String(_) => {
                  format!("{}:string", key)
              }
            }
        };

          unique_hashes.insert(value_type_or_value);
          path.pop();
      }

      // Combine all unique hashes and sort them
      let mut sorted_hashes: Vec<_> = unique_hashes.into_iter().collect();
      sorted_hashes.sort();
      let combined_hash_data = sorted_hashes.join(",");
      x.push_str(&combined_hash_data);
  }

  Ok(x)
}


// Recursive method call if parsing of JSON file results in object data. Data will be further broken down from this point into
// its appropriate data types. Identical implementation to recurseArray above.
// v3 is mapping of key values
// s6 is the final parsing string (continue to be appended in recusive functinos)
// s3 is vector of stop nodes
// options is passing of original options struct
// path is used to enable value node functionality by keeping track of path
fn recurseObject(
  v3: Map<String, Value>,
  s6: String,
  s3: &Vec<String>,
  options: &Options,
  path: &mut Vec<String>,
) -> Result<String, serde_json::Error> {
  let mut y: String = s6.to_string();
  let mut unique_hashes: std::collections::HashSet<String> = std::collections::HashSet::new();

  // Collect and sort the keys
  let mut sorted_keys: Vec<&String> = v3.keys().collect();
  sorted_keys.sort();

  for key in sorted_keys {
      let val = v3.get(key).unwrap();

      // Check if this key is in stop nodes; if so, skip it
      if options.stop_nodes.as_ref().map_or(false, |stop_nodes| stop_nodes.contains(key)) {
          continue;
      }

      path.push(key.to_string());

      let value_type_or_value: String = if options.is_value_node(&key.to_string(), path) {
        // If the current path and key is a value node, include the actual value
        match val {
            Value::Object(obj) if obj.is_empty() => {
              format!("{}:{}", key, "EMPTY_OBJECT")
          }
            Value::Object(_) => {
              let obj_hash = recurseObject(val.as_object().unwrap().clone(), String::new(), s3, options, path)?;
              format!("{}:object({})", key, obj_hash)
            }
            Value::Array(arr) if arr.is_empty() => {
              format!("{}:{}", key, "EMPTY_ARRAY")
          }
            Value::Array(_) => {
              let arr_hash = recurseArray(val.as_array().unwrap().clone(), &mut y, s3, options, path)?;
              format!("{}:array({})", key, arr_hash)
            }
            Value::Null => {
              format!("{}:null", key)
          }
            Value::Bool(b) => {
              format!("{}:{}", key, b)
            }
            Value::Number(n) => {
              format!("{}:{}", key, n)
            }
            Value::String(s) => {
              format!("{}:{}", key, s.clone())
            }
        }
    } else {
        // If it's not a value node, include the type of the value
        match val {
            Value::Object(obj) => {
              if obj.is_empty() 
              {
              format!("{}:{}", key, "EMPTY_OBJECT")
            } else {
              let obj_hash = recurseObject(val.as_object().unwrap().clone(), String::new(), s3, options, path)?;
              format!("{}:object({})", key, obj_hash)
            }
          }
            Value::Array(arr) => { 
              if arr.is_empty() {
              format!("{}:{}", key, "EMPTY_ARRAY")
            }
            else {
              let arr_hash = recurseArray(val.as_array().unwrap().clone(), &mut y, s3, options, path)?;
              format!("{}:array({})", key, arr_hash)
            }
          }
            Value::Null => {
              format!("{}:null", key)

          }
            Value::Bool(_) => {
              format!("{}:bool", key)
          }
            Value::Number(_) => {
              format!("{}:number", key)
            }
            Value::String(_) => {
              format!("{}:string", key)
          }
        }
    };

      unique_hashes.insert(value_type_or_value);
      path.pop();
  }

  // Combine all unique hashes and sort them
  let mut sorted_hashes: Vec<_> = unique_hashes.into_iter().collect();
  sorted_hashes.sort();
  y.push_str(&sorted_hashes.join(","));

  Ok(y)
}