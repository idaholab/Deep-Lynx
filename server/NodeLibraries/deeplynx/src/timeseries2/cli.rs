use crate::logger::setup_logger;
use crate::request::Request;
use crate::response::Response;
use crate::temp_file::TempFile;
use clap::Parser;
use serde::{
    Deserialize,
    Serialize,
};
use serde_json::Value;

#[derive(Serialize, Deserialize, Parser)]
#[command(
author = "Idaho National Laboratory, Digital Engineering", version,
about = format!("{}", banner()),
long_about = format!("{}", banner()),
styles=get_styles(),
)]

pub struct Cli {
    /// queue for requests (DL to TS)
    // #[arg(env, long, default_value = "timeseries_emitter_queue")]
    #[arg(env, long, default_value = "datafusion_emitter")]
    pub emitter_queue: String,

    /// queue for responses (TS to DL)
    #[arg(env, long, default_value = "datafusion_listener")]
    pub response_queue: String,

    /// URL for RabbitMQ queue
    #[arg(env, long, default_value = "amqp://deeplynx:root@localhost:5672")]
    pub url_rabbitmq: String,

    /// URL for DeepLynx
    #[arg(env, long, default_value = "http://localhost:8090")]
    pub url_deep_lynx: String,

    /// print JSON templates
    #[clap(long, short = 't', action)]
    print_templates: bool,

    /// The JSON message to publish
    #[arg(default_value = "DESCRIBE <table>")]
    pub json_string: Option<String>,

    /// The logging level
    #[arg(env, long, short, default_value = "info")]
    pub log_level: String,
}
impl Cli {
    pub fn custom_parse() -> Cli {
        let parse = Cli::parse();
        setup_logger(parse.log_level.as_str());

        // remove any temporary files that may have been left
        // behind from previous runs
        _ = TempFile::remove_all();

        if parse.print_templates {
            print!("\x1b[92m"); // print yellow
            let request = Request::sample("42".to_string());

            if let Ok(request_as_json_string) = serde_json::to_string_pretty(&request) {
                println!("\nTimeseries 2.0 JSON request example:");
                println!("{}", request_as_json_string);

                println!("\nTimeseries 2.0 JSON request example (stringified):");
                println!("{}", stringify(request_as_json_string.as_str()));
            };

            let response = Response {
                report_id: "<report_id>".to_string(),
                is_error: false,
                value: Value::from("<error message goes here>"),
            };
            // let response = Response::from_tuple("<report_id>".to_string(), true, "<error message goes here>".to_string());

            if let Ok(response_as_json_string) = serde_json::to_string_pretty(&response) {
                println!("\nTimeseries 2.0 JSON response example:");
                println!("{}", response_as_json_string);
            };
            println!("\x1b[0m"); // print normal
            std::process::exit(42);
        }
        parse
    }
}

fn stringify(json: &str) -> String {
    str::replace(str::replace(json, "\"", "\\\"").as_str(), "\n", "")
}

#[allow(unused)]
pub fn banner() -> String {
    const VERSION: &str = env!("CARGO_PKG_VERSION");
    let line = "-".repeat(42 - 8 - 2);
    let banner_string = format!( "\n\n\x1b[93m{}\nIdaho National Laboratory\nDigital Engineering\nTimeseries 2.0: Temporal Threads\n{}\x1b[0m",
                                 line,
                                 // VERSION,
                                 line,
    );
    banner_string
}
/// set the color styles for the help display
pub fn get_styles() -> clap::builder::Styles {
    clap::builder::Styles::styled()
        .usage(
            anstyle::Style::new()
                .bold()
                .underline()
                .fg_color(Some(anstyle::Color::Ansi(anstyle::AnsiColor::Yellow))),
        )
        .header(
            anstyle::Style::new()
                .bold()
                .underline()
                .fg_color(Some(anstyle::Color::Ansi(anstyle::AnsiColor::Yellow))),
        )
        .literal(
            anstyle::Style::new().fg_color(Some(anstyle::Color::Ansi(anstyle::AnsiColor::Green))),
        )
        .invalid(
            anstyle::Style::new()
                .bold()
                .fg_color(Some(anstyle::Color::Ansi(anstyle::AnsiColor::Red))),
        )
        .error(
            anstyle::Style::new()
                .bold()
                .fg_color(Some(anstyle::Color::Ansi(anstyle::AnsiColor::Red))),
        )
        .valid(
            anstyle::Style::new()
                .bold()
                .underline()
                .fg_color(Some(anstyle::Color::Ansi(anstyle::AnsiColor::Green))),
        )
        .placeholder(
            anstyle::Style::new().fg_color(Some(anstyle::Color::Ansi(anstyle::AnsiColor::White))),
        )
}
