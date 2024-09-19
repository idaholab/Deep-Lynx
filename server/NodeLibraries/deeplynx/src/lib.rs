#![deny(clippy::all)]
#[macro_use]
extern crate napi_derive;

mod config;
pub mod errors;
/// The structure of the DeepLynx package is fairly simple, but we will note it is continually evolving.
/// It originally started out as completely separate packages. As we did more with Rust however, we
/// realized we needed to pull these packages into one package and start unifying the interface as well
/// as the code behind it. We are in the middle of that transition, currently pulling in the packages
/// into one but not quite unifying all parts of the codebase and sharing things like database connections
/// etc. It is hoped that eventually we will be able to unify the DeepLynx package into one interface
/// so that we can share the underlying connections and memory spaces.
pub mod redis_graph;
pub mod shape_hasher;
mod snapshot;
mod timeseries;
