use crate::config::Configuration;
use crate::timeseries::data_types::LegacyDataTypes;
use crate::timeseries::ingestion;
use crate::timeseries::timeseries_errors::TimeseriesError;
use sqlx::postgres::PgPool;
use std::io::Read;
use std::sync::Arc;
use tokio::sync::mpsc::error::TryRecvError;

#[derive(Clone, Debug)]
#[napi(object)]
pub struct LegacyTimeseriesColumn {
  #[napi(js_name = "column_name")]
  pub column_name: String,
  #[napi(js_name = "property_name")]
  pub property_name: String,
  #[napi(js_name = "is_primary_timestamp")]
  pub is_primary_timestamp: bool,
  #[napi(js_name = "type")]
  pub data_type: String,
  #[napi(js_name = "date_conversion_format_string")]
  pub date_conversion_format_string: Option<String>,
}

#[derive(Clone)]
pub struct BucketRepository {
  db: PgPool,
  // this is the channel that we pass data into once the data pipeline has been initiated
  stream_reader_channel: Option<Arc<tokio::sync::mpsc::UnboundedSender<StreamMessage>>>,
  // this is how we receive status updates from the reader
  reader_status_channel:
    Option<Arc<tokio::sync::RwLock<tokio::sync::mpsc::Receiver<StreamStatusMessage>>>>,
}

/// BucketRepository contains all interactions with Buckets and the database layer of the application.
impl BucketRepository {
  /// Create a new BucketRepository, the base for all functions related to Buckets and their
  /// manipulation or data ingestion in the database
  pub async fn new(config: Configuration) -> Result<Self, TimeseriesError> {
    let connection_string = config
      .db_connection_string
      .clone()
      .ok_or(TimeseriesError::MissingConnectionString)?;
    let db = PgPool::connect(connection_string.as_str()).await?;

    Ok(BucketRepository {
      db,
      stream_reader_channel: None,
      reader_status_channel: None,
    })
  }

  pub fn infer_legacy_schema<T: Read>(
    reader: T,
  ) -> Result<Vec<LegacyTimeseriesColumn>, TimeseriesError> {
    let mut csv_reader = csv::ReaderBuilder::new().from_reader(reader);

    let mut results: Vec<LegacyTimeseriesColumn> = csv_reader
      .headers()?
      .iter()
      .map(|h| LegacyTimeseriesColumn {
        column_name: h.to_string(),
        property_name: "".to_string(),
        is_primary_timestamp: false,
        data_type: "".to_string(),
        date_conversion_format_string: None,
      })
      .collect();

    while let Some(record) = csv_reader.records().next() {
      let record = record?;

      for (i, column) in results.iter_mut().enumerate() {
        let value = match record.get(i) {
          None => continue,
          Some(v) => v,
        };

        if value.is_empty() {
          continue;
        }

        if value.to_lowercase() == "true" || value.to_lowercase() == "false" {
          column.data_type = LegacyDataTypes::Boolean.into();
          continue;
        }

        if value.starts_with('{') && value.ends_with('}') {
          column.data_type = LegacyDataTypes::Json.into();
          continue;
        }

        if value.replace(',', "").parse::<i32>().is_ok() {
          column.data_type = LegacyDataTypes::Number.into();
          continue;
        }

        if value.replace(',', "").parse::<i64>().is_ok() {
          column.data_type = LegacyDataTypes::Number64.into();
          continue;
        }

        // we can't do the same stripping on floats because of european number notation with commas
        if value.parse::<f64>().is_ok() {
          column.data_type = LegacyDataTypes::Float64.into();
          continue;
        }

        column.data_type = LegacyDataTypes::String.into();
      }
    }

    Ok(results)
  }

  /// `begin_legacy_csv_ingestion` intializes a data pipeline and prepares it to receive csv data from a node.js
  /// readable stream. We have to do things this way because there is no stream interopt between Rust
  /// and node.js - so we basically spin up a thread to handle ingestion and then stream the data from
  /// node.js to it
  pub fn begin_legacy_csv_ingestion(
    &mut self,
    data_source_id: String,
    columns: Vec<LegacyTimeseriesColumn>,
  ) -> Result<(), TimeseriesError> {
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel::<StreamMessage>();
    let (status_tx, status_rx) = tokio::sync::mpsc::channel::<StreamStatusMessage>(4096);
    let db_connection = self.db.clone();

    tokio::spawn(async move {
      let stream_reader = NodeStreamReader::new(rx);

      match ingestion::ingest_csv_legacy(db_connection, stream_reader, data_source_id, columns)
        .await
      {
        Ok(_) => match status_tx.send(StreamStatusMessage::Complete).await {
          Ok(_) => Ok(()),
          Err(e) => Err(TimeseriesError::Thread(e.to_string())),
        },
        Err(e) => match status_tx.send(StreamStatusMessage::Error(e)).await {
          Ok(_) => Ok(()),
          Err(e) => Err(TimeseriesError::Thread(format!(
            "ingest csv problem: {}",
            e
          ))),
        },
      }
    });

    // set that status message receiver so that the complete ingestion can wait on it
    self.stream_reader_channel = Some(Arc::new(tx));
    self.reader_status_channel = Some(Arc::new(tokio::sync::RwLock::new(status_rx)));
    Ok(())
  }

  /// `read_data` is called by the stream to pass data into the previously configured multithreaded
  /// reader. Call this function regardless of what starting method you called to ingest the data
  pub fn read_data(&mut self, bytes: Vec<u8>) -> Result<(), TimeseriesError> {
    let channel = self
      .reader_status_channel
      .as_mut()
      .ok_or(TimeseriesError::Unwrap(
        "no stream status channel".to_string(),
      ))?;

    let mut channel = futures::executor::block_on(channel.write());

    match channel.try_recv() {
      Ok(m) => match m {
        StreamStatusMessage::Error(e) => return Err(e),
        StreamStatusMessage::Complete => return Ok(()),
      },
      Err(e) => match e {
        tokio::sync::mpsc::error::TryRecvError::Empty => {}
        tokio::sync::mpsc::error::TryRecvError::Disconnected => {
          return Err(TimeseriesError::Thread(
            "status thread disconnected".to_string(),
          ))
        }
      },
    }

    let channel = self
      .stream_reader_channel
      .clone()
      .ok_or(TimeseriesError::Unwrap("no reader channel".to_string()))?;

    match channel.send(StreamMessage::Write(bytes)) {
      Ok(_) => Ok(()),
      Err(e) => {
        if channel.send(StreamMessage::Close).is_err() {
          eprintln!("cannot send close message on stream message channel")
        }
        Err(TimeseriesError::Thread(e.to_string()))
      }
    }
  }

  /// `complete ingestion` waits for either the first error message or complete status from the
  /// stream thread - this is how we can let users wait for the ingestion to be completed and how
  /// we can eventually send data back - this is called regardless of what starting method you called
  /// to ingest data
  pub async fn complete_ingestion(&mut self) -> Result<(), TimeseriesError> {
    let reader_channel = self
      .stream_reader_channel
      .as_mut()
      .ok_or(TimeseriesError::Unwrap(
        "no stream status channel".to_string(),
      ))?;

    {
      match reader_channel.send(StreamMessage::Close) {
        Ok(_) => {}
        Err(e) => {
          return Err(TimeseriesError::Thread(format!(
            "unable to send close message to reader {}",
            e
          )))
        }
      }
    }

    let channel = self
      .reader_status_channel
      .as_mut()
      .ok_or(TimeseriesError::Unwrap(
        "no stream status channel".to_string(),
      ))?;

    let mut channel = channel.write().await;

    match channel.recv().await {
      None => Err(TimeseriesError::Thread(
        "channel closed before message could be received".to_string(),
      )),
      Some(m) => match m {
        StreamStatusMessage::Error(e) => Err(e),
        StreamStatusMessage::Complete => Ok(()),
      },
    }
  }
}

/*
This entire section is our async reader for pulling in from node.js streams. This allows us to
setup an async reader to pass into things like the CSV parser and allows us to async ingest data
 */
#[derive(Debug, Clone)]
enum StreamMessage {
  Write(Vec<u8>),
  Close,
}

enum StreamStatusMessage {
  Error(TimeseriesError),
  Complete,
}

pub struct NodeStreamReader {
  rx: tokio::sync::mpsc::UnboundedReceiver<StreamMessage>,
  buffer: Vec<u8>,
  is_closed: bool,
}

impl NodeStreamReader {
  fn new(rx: tokio::sync::mpsc::UnboundedReceiver<StreamMessage>) -> Self {
    NodeStreamReader {
      rx,
      buffer: vec![],
      is_closed: false,
    }
  }
}

impl Read for NodeStreamReader {
  fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
    if self.is_closed {
      return Ok(0);
    }

    if self.buffer.len() >= buf.len() {
      let send = self.buffer.clone();
      self.buffer = vec![];

      return if send.len() > buf.len() {
        let (dest, overflow) = send.split_at(buf.len());

        buf.copy_from_slice(dest);
        self.buffer.extend_from_slice(overflow);

        Ok(dest.len())
      } else {
        buf.copy_from_slice(send.as_slice());
        Ok(buf.len())
      };
    }

    loop {
      let message = match self.rx.try_recv() {
        Ok(m) => m,
        Err(e) => match e {
          TryRecvError::Empty => continue,
          TryRecvError::Disconnected => break,
        },
      };

      match message {
        StreamMessage::Write(bytes) => self.buffer.extend_from_slice(bytes.as_slice()),
        StreamMessage::Close => {
          self.is_closed = true;
          buf[..self.buffer.len()].copy_from_slice(self.buffer.as_slice());
          let len = self.buffer.len();
          self.buffer = vec![];

          return Ok(len);
        }
      }

      if self.buffer.len() >= buf.len() {
        break;
      }
    }

    let send = self.buffer.clone();
    self.buffer = vec![];

    if send.len() > buf.len() {
      let (dest, overflow) = send.split_at(buf.len());

      buf.copy_from_slice(dest);
      self.buffer.extend_from_slice(overflow);

      Ok(dest.len())
    } else {
      buf.copy_from_slice(send.as_slice());
      Ok(buf.len())
    }
  }
}
