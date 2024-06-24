#![deny(clippy::all)]
#![allow(non_snake_case)]

mod shapehasher_errors;
mod shapehasher_tests;

use serde::{Deserialize, Serialize};
use base64::{engine::general_purpose::STANDARD, Engine as _};
//use serde_json::{Value, Map};
use serde::de; // You need this to use de::Error::custom

//use serde_json;
use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;

//use sha2::{Sha256, Digest};

use sha2::{Sha256, Digest};
use serde_json::{self, Value, Map};
use base64;

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
                } 
                else {
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

//This method prepares the JSON file data to be parsed and hashed. It takes in the data from a JSON file, and checks for any stop nodes
//in the option struct to be ignored/removed from the data. It then calls the recurseData function to being breaking down data structure 
//and types
#[napi]
pub fn hash(a: String, options: Options) -> Result<String, napi::Error> {
  //Entry point of this file, serde_json::Value can reprsent any valid JSON, here we are parsing a string as JSON
  let data:serde_json::Value = serde_json::from_str(&a).map_err(|err| napi::Error::new(napi::Status::GenericFailure, format!("Failed to parse JSON: {}", err)))?;
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
  let outcome: String = recurseData(to_hash, stop_nodes_vec, &options, &mut initial_path)
        .map_err(|err| napi::Error::new(napi::Status::GenericFailure, format!("Error processing data: {}", err)))?;
    Ok(outcome)
}

//This function is where the real hashing happens (using the built in rust hasher)
//We first sort the keys and see if they match each other in each shape
//We then check if each value matches data types
//We also account for empty arrays or objects
fn json_object_to_hash(data: &str, options: &Options, path: &[String]) -> Result<String, serde_json::Error> {
    let value: serde_json::Value = serde_json::from_str(data)?;
    
    if let Some(object) = value.as_object() {
        let mut items: Vec<_> = object.iter().collect();
        items.sort_by(|a, b| a.0.cmp(&b.0)); // sort by key for consistency
        let mut to_hash = String::new(); // Initialize string to accumulate data for hashing

        for (key, value) in items {
            let mut path_vec = path.to_vec();
            path_vec.push(key.clone());
            // Append key to the string
            to_hash.push_str(key); 

            if options.is_value_node(key, &path_vec) {
              to_hash.push(':');
              //the following if-else was added to match hashes (from the older version) more accurately (avoiding quotes in string value nodes)
                // Check if the value is a string and handle accordingly
              if let Value::String(str_value) = value {
                to_hash.push_str(str_value);
              } else {
              // For non-string values, use the serialized form (this is for reverse compatability purposes)
                to_hash.push_str(&value.to_string());
              }
              continue;
            }
            // Hash the value type as a string representation
            let type_str = match value {
                Value::Null => ":null",
                Value::Bool(_) => ":bool",
                Value::Number(_) => ":number",
                Value::String(_) => ":string",
                Value::Array(arr) if arr.is_empty() => "EMPTY_ARRAY",
                Value::Array(_) => ":array",
                Value::Object(obj) if obj.is_empty() => "EMPTY_OBJECT",
                Value::Object(_) => ":object",
            };
            to_hash.push_str(type_str);
            path_vec.pop();
        }
        let mut hasher = Sha256::new();
        hasher.update(to_hash.as_bytes());
        // Finalize the hash
        let hash_bytes = hasher.finalize();
        // Encode the hash in Base64
        let hash_base64 = STANDARD.encode(hash_bytes);
        Ok(hash_base64)
    } else {
        // Handle the case where value is not an object
        Err(de::Error::custom("Expected a JSON object"))
    }
}

// A helper function to hash a string
fn compute_hash_for_string(s: &str) -> String {
  let mut hasher = DefaultHasher::new();
  s.hash(&mut hasher);
  format!("{}", hasher.finish())
}

//The inital called method to parse the JSON file into its appropriate datatypes. Recursive call with varying method arguments
//depending on arry or object parsing. If it is of other data types, consider it completely parsed. This method is simply used
//as a place holder for the program to comprehend how many of each data type there is, how is it seperated and whether there is
//nested data types. The actual parsing, hash formation and data type information is produced in the json_object_to_hash fuction
// V1 is value passed in of hash
// s1 is vector string representation of the stop nodes
// options is representation of the options
//path is used to keep track of current path and enable usage of value nodes
fn recurseData(v1: Value, s1: Vec<String>, options: &Options, path: &mut Vec<String>) -> Result<String, serde_json::Error> {
  let mut my_string = String::new();
  match v1 {  
      serde_json::Value::Null => {
      },
      serde_json::Value::Bool(_resBool) => {
      },
      serde_json::Value::Number(_resNum) => {
      },
      serde_json::Value::String(_resString) => {
      },
      serde_json::Value::Array(mut resArray) => {
        for value in resArray.iter_mut(){
          options.remove_stop_nodes(value);
        }
        //following line is required to maintain stop node functionality and to ensure proper breakdown of nested situations
        my_string = recurseArray(resArray, &mut my_string, &s1, options, path)?;
      },  
      serde_json::Value::Object(mut v) => {    
        for value in v.values_mut(){
          options.remove_stop_nodes(value);
        }
        //following line is reequired to maintain stop node functionality and to ensure proper breakdown of nested situations
        my_string = recurseObject(v.clone(), &mut my_string, &s1, options, path)?;
        //serilizaing given data structure (v) into JSON string
        let v_str = serde_json::to_string(&v)?;
        let hash = json_object_to_hash(&v_str, options, path)?;
        my_string.push_str(&format!("{}", hash));
      },
  };
  Ok(my_string) // return the result string
}

// //Recursive method call if parsing of JSON file results in array data. Data will be further broken down from this point into 
// //its appropriate data types
//V2 is the vector of values
//s5 is the final parsing string (continue to be appended in recusive functinos)
//s2 is vector of stop nodes
//options is passing of original options struct
//path is used to enable value node functionality by keeping track of path
fn recurseArray(v2: Vec<Value>, s5: &mut String, s2: &Vec<String>, options: &Options, path: &mut Vec<String>) -> Result<String, serde_json::Error>{
    let mut x: String = s5.to_string();
    // Use a HashSet to store unique hashes for objects within the array
    let mut unique_hashes: std::collections::HashSet<String> = std::collections::HashSet::new();
    for (index, val) in v2.iter().enumerate() {
      let val = val.clone();
      path.push(index.to_string()); // Add the current array index to the path
      match val {
          serde_json::Value::Null => {
          },
          serde_json::Value::Bool(_resBool) => {
          },
          serde_json::Value::Number(_resNum) => {
          },
          serde_json::Value::String(_resString) => {
          },
          serde_json::Value::Array(mut resArray) => {
            for value in resArray.iter_mut(){
              options.remove_stop_nodes(value);
            }
              //following line is reequired to maintain stop node functionality and to ensure proper breakdown of nested situations
            x = recurseArray(resArray, &mut x, &s2, options, path)?;
          },  
          serde_json::Value::Object(mut v) => {
            for value in v.values_mut(){
              options.remove_stop_nodes(value);
            }
            //following line is reequired to maintain stop node functionality and to ensure proper breakdown of nested situations
            x = recurseObject(v.clone(), &mut x, &s2, options, path)?;
            let v_str = serde_json::to_string(&v)?;
            let obj_hash = json_object_to_hash(&v_str, options, path)?;
            unique_hashes.insert(obj_hash); //since unique_hashes is defined as a hashset, it will not insert multiple of the same value
          },
      };
      path.pop(); // Remove the current index from the path
    }

    let mut sorted_hashes: Vec<_> = unique_hashes.into_iter().collect();
    sorted_hashes.sort();
    let combined_hash_data = sorted_hashes.join(",");
    let combined_hash = compute_hash_for_string(&combined_hash_data);
    x.push_str(&combined_hash);
    Ok(x)
}

// //Recursive method call if parsing of JSON file results in object data. Data will be further broken down from this point into 
// //its appropriate data types
//v3 is mapping of key values
fn recurseObject(v3: Map<String, Value>, s6: &mut String, s3: &Vec<String>, options: &Options, path: &mut Vec<String>) -> Result<String, serde_json::Error>{
    let mut y: String = s6.to_string();
    for (key, values) in v3.iter(){
      let values = values.clone();
      path.push(key.to_string()); // Add the current key to the path
      match values {
          serde_json::Value::Null => {
          },
          serde_json::Value::Bool(_resBool) => {
          },
          serde_json::Value::Number(_resNum) => {
          },
          serde_json::Value::String(_resString) => {
          },
          serde_json::Value::Array(mut resArray) => {
            for value in resArray.iter_mut(){
              options.remove_stop_nodes(value);
            }
            //following line is reequired to maintain stop node functionality and to ensure proper breakdown of nested situations
            y = recurseArray(resArray, &mut y, s3, options, path)?;
          },  
          serde_json::Value::Object(mut v) => {
            for value in v.values_mut(){
              options.remove_stop_nodes(value);
            }
            //following line is reequired to maintain stop node functionality and to ensure proper breakdown of nested situations
            y = recurseObject(v.clone(), &mut y, s3, options, path)?;
            let v_str = serde_json::to_string(&v)?;
            let obj_hash = json_object_to_hash(&v_str, options, path)?;
            y.push_str(&format!("{}", obj_hash));
          },
      };
      path.pop(); // Remove the current key from the path
  }
  Ok(y)
}
