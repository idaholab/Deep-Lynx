use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct Response {
  pub report_id: String,
  pub is_error: bool,
  pub value: Value,
}

/// Public interface
impl Response {
  pub fn from_id_msg(id: &str, msg: &str) -> Self {
    Response {
      report_id: id.to_string(),
      is_error: true, // is this always supposed to be an error?
      value: Value::from(msg),
    }
  }

  fn as_string(&self) -> serde_json::Result<String> {
    serde_json::to_string(self)
  }
}

// #[cfg(test)]
// mod tests {

//   #[test]
//   fn from_id_msg_fn_works() {
//     todo!()
//   }

//   #[test]
//   fn as_string_fn_works() {
//     todo!()
//   }
// }
