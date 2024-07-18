use chrono::Utc;
use env_logger::Builder;
use log::Level::{
    Debug,
    Error,
    Info,
    Trace,
    Warn,
};
pub use log::LevelFilter;
use std::io::Write;

// const VERSION: &str = env!("CARGO_PKG_VERSION");
// const PROGRAM_NAME: &str = env!("CARGO_PKG_NAME");

pub fn setup_logger(level_string: &str) {
    fn colorize(level: log::Level) -> &'static str {
        match level {
            Error => "\x1b[91merror\x1b[0m", // bright red
            Warn => "\x1b[31mwarn\x1b[0m",   // red
            Info => "\x1b[32minfo\x1b[0m",   // green
            Debug => "\x1b[34mdebug\x1b[0m", // blue
            Trace => "\x1b[33mtrace\x1b[0m", // yellow
        }
    }
    fn from_string(level_string: String) -> LevelFilter {
        match level_string.to_lowercase().as_str() {
            "error" => LevelFilter::Error,
            "warn" => LevelFilter::Warn,
            "info" => LevelFilter::Info,
            "debug" => LevelFilter::Debug,
            "trace" => LevelFilter::Trace,
            _ => LevelFilter::Info,
        }
    }
    Builder::new()
        .format(|buf, record| {
            writeln!(
                buf,
                "{:?} [{}]: {}",
                Utc::now(),
                colorize(record.level()),
                record.args()
            )
        })
        .filter(None, from_string(String::from(level_string)))
        .init();
}

#[allow(dead_code)]
fn main() {
    setup_logger("Trace");
    log::error!("This is an error");
    log::warn!("This is an warning");
    log::info!("This is information");
    log::debug!("This is a debugging message");
    log::trace!("This is as trace message");
}
