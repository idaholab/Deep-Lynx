use napi::Error;
use thiserror::Error;

// Project specific errors and wrappers of other libraries errors so we can always return ours but
// still be able to use ? notation
#[derive(Error, Debug)]
pub enum ShapeHasherError{
}

// ignore the error here, it's just telling you From is more succinct - but for some reason napi doesn't like it
impl Into<napi::Error> for ShapeHasherError{
    fn into(self) -> Error {
        napi::Error::new(napi::Status::GenericFailure, self.to_string())
    }
}

