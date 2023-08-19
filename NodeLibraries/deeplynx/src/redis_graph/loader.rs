use crate::config::Configuration;
use futures_util::{StreamExt, TryStreamExt};
use indexmap::IndexMap;
use redis::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::PgPool;
use std::collections::HashMap;
use tokio_util::compat::FuturesAsyncReadCompatExt;
use crate::redis_graph::redis_errors::RedisLoaderError;

#[derive(Clone)]
pub struct RedisGraphLoader {
    db: PgPool,
    config: Configuration,
    redis_client: Client,
}

impl RedisGraphLoader {
    pub async fn new(config: Configuration) -> Result<Self, RedisLoaderError> {
        let db = PgPool::connect(config.db_connection_string.as_str()).await?;
        let redis_client = Client::open(config.redis_connection_string.as_str())?;

        Ok(RedisGraphLoader {
            db,
            config,
            redis_client,
        })
    }

    /// `generate_redis_graph` takes a container id and timestamp and generates a RedisGraph for it. We
    /// return the RedisGraph key for querying against it. Under the hood we use the COPY function in Postgres
    /// to quickly load the data from Postgres into RedisGraph. Due to how we have to format the RedisGraph
    /// bulkloader, we do tend to max out memory with how we read records into it and the fact we have
    /// to keep track of all the new ids for the nodes
    // TODO: right now generate only does current graph, need to actually make it work with timestamps
    pub async fn generate_redis_graph(
        &self,
        container_id: u64,
        timestamp: Option<String>,
    ) -> Result<(), RedisLoaderError> {
        let mut connection = self.db.acquire().await?;
        let stream = connection
            .copy_out_raw(
                format!(
                    r#"
 COPY (SELECT q.*,  ROW_NUMBER () OVER(ORDER BY metatype_id) as new_id FROM (SELECT DISTINCT ON (nodes.id) nodes.id,
    nodes.container_id,
    nodes.metatype_id,
    nodes.data_source_id,
    nodes.import_data_id,
    nodes.data_staging_id,
    nodes.type_mapping_transformation_id,
    nodes.original_data_id,
    nodes.properties,
    nodes.metadata_properties,
    nodes.metadata,
    nodes.created_at,
    nodes.modified_at,
    nodes.deleted_at,
    nodes.created_by,
    nodes.modified_by,
    metatypes.name AS metatype_name,
    metatypes.uuid AS metatype_uuid
   FROM (nodes
     LEFT JOIN metatypes ON ((metatypes.id = nodes.metatype_id)))
  WHERE (nodes.deleted_at IS NULL) AND (nodes.container_id = {container_id}::bigint)
  ORDER BY nodes.id, nodes.created_at) q ORDER BY q.metatype_id)
TO STDOUT WITH (FORMAT csv, HEADER true) ;
    "#
                )
                    .as_str(),
            )
            .await?;

        let async_reader = stream
            // we have to convert the error so that we can turn it into an AsyncReader
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
            .into_async_read();

        // convert into the CSV deserialize reader so that we can simply cast to Node without having to
        // handle things ourselves
        let mut async_reader = csv_async::AsyncDeserializer::from_reader(async_reader.compat());
        let mut records = async_reader.deserialize::<Node>();

        // map is the metatype name and index of properties so order is preserved
        let mut metatype_name_header: IndexMap<String, Vec<String>> = IndexMap::default();
        // map for the new redis id to the deeplynx id so that we can map the edges correctly
        let mut node_ids: HashMap<u64, u64> = HashMap::default();
        // buffer for sending to redis
        let mut current_buffer: Vec<Vec<u8>> = vec![];
        let mut current_size = 0;
        let mut node_count = 0;
        let mut current_label_index = 0;
        let mut has_txed = false;
        while let Some(record) = records.next().await {
            let node = record?;
            node_ids.insert(node.id, node.new_id);

            if !metatype_name_header.contains_key(&node.metatype_name) {
                let (header, index) = node.to_redis_header_bytes();
                // save the index so we maintain property order across the import
                // TODO: handle cases in which we have the same metatype name but a different set of properties
                metatype_name_header.insert(node.metatype_name.clone(), index);

                current_size += header.len();
                current_buffer.push(header);
                current_label_index += 1;
            }

            // while this shouldn't error it's good practice to handle
            let index = metatype_name_header
                .get(&node.metatype_name)
                .ok_or(RedisLoaderError::General(
                    "unable to fetch node property index".to_string(),
                ))?;

            let properties = node.to_redis_properties_bytes(index);

            // prior to doing anything we need to check the buffer size and send off to Redis if we're over
            // 512mb. Technically we could go to a total of 1gb, but the nodes for a single label can't go
            // over 512mb as it's a single binary string. Much easier to just send every 512 than attempt
            // to manage the buffer size of each individual label.
            if (current_size + properties.as_slice().len()) > 496 * 1_000_000 {
                self
                    .transmit_to_redis(
                        &current_buffer,
                        container_id,
                        timestamp.clone().unwrap_or("default".to_string()),
                        (node_count, metatype_name_header.len() as u64),
                        (0, 0),
                        has_txed,
                    )
                    .await?;

                current_buffer = vec![];
                node_count = 0;
                metatype_name_header = IndexMap::default();
                current_size = 0;
                has_txed = true;
            }

            // now that we know we have the header, and because the db call ensures we're ordered by
            // metatype name correctly, we can simply add this node's properties to the current buffer
            current_size += properties.as_slice().len();
            current_buffer[current_label_index - 1].extend(properties);

            node_count += 1;
        }

        // now we send the last request out to Redis - if we've sent something before now we need to tell
        // the function that, so we keep track of whether or not we've transmitted - we could also wrap
        // the edges in this request but honestly this is easier to follow and I don't have to keep
        // track of multiple buffers. TODO: benchmark additional requests against potentially just one
        self
            .transmit_to_redis(
                &current_buffer,
                container_id,
                timestamp.clone().unwrap_or("default".to_string()),
                (node_count, metatype_name_header.len() as u64),
                (0, 0),
                has_txed,
            )
            .await?;
        has_txed = true;

        let mut connection = self.db.acquire().await?;

        // now let's handle the edges TODO: move this into its own functions
        let stream = connection
            .copy_out_raw(
                format!(
                    r#"
  COPY (SELECT q.* FROM (SELECT DISTINCT ON (edges.origin_id, edges.destination_id, edges.data_source_id, edges.relationship_pair_id) edges.id,
    edges.container_id,
    edges.relationship_pair_id,
    edges.data_source_id,
    edges.import_data_id,
    edges.data_staging_id,
    edges.type_mapping_transformation_id,
    edges.origin_id,
    edges.origin_original_id,
    edges.origin_data_source_id,
    edges.origin_metatype_id,
    origin.uuid AS origin_metatype_uuid,
    edges.destination_id,
    edges.destination_original_id,
    edges.destination_data_source_id,
    edges.destination_metatype_id,
    destination.uuid AS destination_metatype_uuid,
    edges.properties,
    edges.metadata_properties,
    edges.metadata,
    edges.created_at,
    edges.modified_at,
    edges.deleted_at,
    edges.created_by,
    edges.modified_by,
    metatype_relationship_pairs.relationship_id,
    metatype_relationships.name AS metatype_relationship_name,
    metatype_relationships.uuid AS metatype_relationship_uuid,
    metatype_relationship_pairs.uuid AS metatype_relationship_pair_uuid
   FROM ((((edges
     LEFT JOIN metatype_relationship_pairs ON ((edges.relationship_pair_id = metatype_relationship_pairs.id)))
     LEFT JOIN metatype_relationships ON ((metatype_relationship_pairs.relationship_id = metatype_relationships.id)))
     LEFT JOIN metatypes origin ON ((edges.origin_metatype_id = origin.id)))
     LEFT JOIN metatypes destination ON ((edges.destination_metatype_id = destination.id)))
  WHERE (edges.deleted_at IS NULL) AND (edges.container_id = {container_id}::bigint)
  ORDER BY edges.origin_id, edges.destination_id, edges.data_source_id, edges.relationship_pair_id, edges.id, edges.created_at DESC) as q ORDER BY metatype_relationship_name)
TO STDOUT WITH (FORMAT csv, HEADER true);"#
                )
                    .as_str(),
            )
            .await?;

        let async_reader = stream
            // we have to convert the error so that we can turn it into an AsyncReader
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
            .into_async_read();

        // convert into the CSV deserialize reader so that we can simply cast to Edge without having to
        // handle things ourselves
        let mut async_reader = csv_async::AsyncDeserializer::from_reader(async_reader.compat());
        let mut records = async_reader.deserialize::<Edge>();

        // map is the metatype relationship name and index of properties so order is preserved
        let mut relationship_name_header: IndexMap<String, Vec<String>> = IndexMap::default();
        // buffer for sending to redis
        let mut current_buffer: Vec<Vec<u8>> = vec![];
        let mut edge_count = 0;
        let mut relationship_index = 0;
        current_size = 0;
        while let Some(record) = records.next().await {
            let edge = record?;

            if !relationship_name_header.contains_key(&edge.metatype_relationship_name) {
                let (header, index) = edge.to_redis_header_bytes();
                // save the index so we maintain property order across the import
                // TODO: handle cases in which we have the same metatype name but a different set of properties
                relationship_name_header.insert(edge.metatype_relationship_name.clone(), index);

                current_size += header.len();
                current_buffer.push(header);
                relationship_index += 1;
            }

            // while this shouldn't error it's good practice to handle
            let index = relationship_name_header
                .get(&edge.metatype_relationship_name)
                .ok_or(RedisLoaderError::General(
                    "unable to fetch edge property index".to_string(),
                ))?;

            let properties = edge.to_redis_properties_bytes(index);

            // prior to doing anything we need to check the buffer size and send off to Redis if we're over
            // 512mb. Technically we could go to a total of 1gb, but the nodes for a single label can't go
            // over 512mb as it's a single binary string. Much easier to just send every 512 then attempt
            // to manage the buffer size of each individual label.
            if (current_size + properties.as_slice().len() + 16) > 496 * 1_000_000 {
                self
                    .transmit_to_redis(
                        &current_buffer,
                        container_id,
                        timestamp.clone().unwrap_or("default".to_string()),
                        (0, 0),
                        (edge_count, relationship_name_header.len() as u64),
                        has_txed,
                    )
                    .await?;

                current_buffer = vec![];
                edge_count = 0;
                relationship_name_header = IndexMap::default();
                current_size = 0;
                has_txed = true;
            }

            // now that we know we have the header, and because the db call ensures we're ordered by
            // metatype name correctly, we can simply add this edge's properties to the current buffer
            // along with the correct ids
            let origin_id = match node_ids.get(&edge.origin_id) {
                // if we don't have the id, we can't add this edge
                None => continue,
                Some(i) => i,
            };

            let destination_id = match node_ids.get(&edge.destination_id) {
                // if we don't have the id, we can't add this edge
                None => continue,
                Some(i) => i,
            };

            current_size += 16 + properties.as_slice().len();
            current_buffer[relationship_index - 1].extend(origin_id.to_ne_bytes());
            current_buffer[relationship_index - 1].extend(destination_id.to_ne_bytes());
            current_buffer[relationship_index - 1].extend(properties);

            edge_count += 1;
        }

        // now we send the last request out to Redis - if we've sent something before now we need to tell
        // the function that, so we keep track of whether or not we've transmitted - we could also wrap
        // the edges in this request but honestly this is easier to follow and I don't have to keep
        // track of multiple buffers. TODO: benchmark additional requests against potentially just one
        self
            .transmit_to_redis(
                &current_buffer,
                container_id,
                timestamp.clone().unwrap_or("default".to_string()),
                (0, 0),
                (edge_count, relationship_name_header.len() as u64),
                has_txed,
            )
            .await?;
        has_txed = true;

        Ok(())
    }

    async fn transmit_to_redis(
        &self,
        payload: &Vec<Vec<u8>>,
        container_id: u64,
        timestamp: String,
        // we're doing tuples to stress the relationship between the labels and nodes (it also looks cool)
        nodes_labels: (u64, u64),
        edges_types: (u64, u64),
        has_txed: bool,
    ) -> Result<(), RedisLoaderError> {
        let mut async_conn = self.redis_client.get_async_connection().await?;

        // BEGIN starts a new graph if the key doesn't exist, if it does - then we ignore this and add
        if !has_txed {
            redis::cmd("GRAPH.BULK")
                .arg(format!("{}-{}", container_id, timestamp))
                .arg("BEGIN")
                .arg(nodes_labels.0)
                .arg(edges_types.0)
                .arg(nodes_labels.1)
                .arg(edges_types.1)
                .arg(payload)
                .query_async(&mut async_conn)
                .await?;
        } else {
            redis::cmd("GRAPH.BULK")
                .arg(format!("{}-{}", container_id, timestamp))
                .arg(nodes_labels.0)
                .arg(edges_types.0)
                .arg(nodes_labels.1)
                .arg(edges_types.1)
                .arg(payload)
                .query_async(&mut async_conn)
                .await?;
        }

        Ok(())
    }
}

#[derive(Deserialize, Serialize, Debug)]
/// Node represents the structure contained in the DeepLynx table.
struct Node {
    id: u64,
    new_id: u64, // this is basically the index row, needed to keep track of the new id in redis
    metatype_id: u64,
    data_source_id: u64,
    container_id: u64,
    original_data_id: String,
    // this is JSONB but the csv reader can't handle that and we get so much speed from doing the COPY
    // command that having to handle serialization ourselves is totally worth it
    properties: String,
    metadata_properties: String,
    created_at: String,
    deleted_at: String,
    created_by: String,
    modified_by: String,
    modified_at: String,
    metatype_name: String,
}

impl Node {
    // returns parsed header and an index of property names to make sure order stays the same
    pub fn to_redis_header_bytes(&self) -> (Vec<u8>, Vec<String>) {
        let properties: Value = serde_json::from_str(self.properties.as_str()).unwrap();

        let properties = match properties {
            Value::Object(o) => o,
            _ => {
                // TODO: Handle non-object properties if ever needed
                panic!("properties of node not an object")
            }
        };

        let property_len: u32 = properties.len() as u32 + 9;
        let mut property_names: Vec<u8> = vec![];
        let mut property_names_raw: Vec<String> = vec![];

        property_names.extend("_deeplynx_id\0".as_bytes());
        property_names.extend("_data_source_id\0".as_bytes());
        property_names.extend("_container_id\0".as_bytes());
        property_names.extend("_original_data_id\0".as_bytes());
        property_names.extend("_metadata_properties\0".as_bytes());
        property_names.extend("_created_at\0".as_bytes());
        property_names.extend("_created_by\0".as_bytes());
        property_names.extend("_modified_at\0".as_bytes());
        property_names.extend("_modified_by\0".as_bytes());

        for (key, _) in properties.iter() {
            let name = key.as_bytes();
            property_names_raw.push(key.clone());
            property_names.extend(name);
            property_names.extend("\0".as_bytes());
        }

        let mut parsed: Vec<u8> = vec![];
        parsed.extend(self.metatype_name.as_bytes());
        parsed.extend("\0".as_bytes());
        parsed.extend(property_len.to_ne_bytes());
        parsed.extend(property_names);

        (parsed, property_names_raw)
    }

    pub fn to_redis_properties_bytes(&self, index_names: &Vec<String>) -> Vec<u8> {
        let properties: Value = serde_json::from_str(self.properties.as_str()).unwrap();

        let properties = match properties {
            Value::Object(o) => o,
            _ => panic!("properties of node not an object"),
        };

        let mut property_final: Vec<u8> = vec![];

        property_final.extend(4_i8.to_ne_bytes());
        property_final.extend(self.id.to_ne_bytes());

        property_final.extend(4_i8.to_ne_bytes());
        property_final.extend(self.data_source_id.to_ne_bytes());

        property_final.extend(4_i8.to_ne_bytes());
        property_final.extend(self.container_id.to_ne_bytes());

        property_final.extend(3_i8.to_ne_bytes());
        property_final.extend(self.original_data_id.as_bytes());
        property_final.extend("\0".as_bytes());

        property_final.extend(3_i8.to_ne_bytes());
        property_final.extend(self.metadata_properties.as_bytes());
        property_final.extend("\0".as_bytes());

        property_final.extend(3_i8.to_ne_bytes());
        property_final.extend(self.created_at.as_bytes());
        property_final.extend("\0".as_bytes());

        property_final.extend(3_i8.to_ne_bytes());
        property_final.extend(self.created_by.as_bytes());
        property_final.extend("\0".as_bytes());

        property_final.extend(3_i8.to_ne_bytes());
        property_final.extend(self.modified_at.as_bytes());
        property_final.extend("\0".as_bytes());

        property_final.extend(3_i8.to_ne_bytes());
        property_final.extend(self.modified_by.as_bytes());
        property_final.extend("\0".as_bytes());

        for property_name in index_names {
            match properties.get(property_name.as_str()) {
                None => property_final.extend(0_i8.to_ne_bytes()),
                Some(value) => {
                    match value {
                        Value::Null => property_final.extend(0_i8.to_ne_bytes()),
                        Value::Bool(b) => {
                            property_final.extend(1_i8.to_ne_bytes());
                            if *b {
                                property_final.push(0x01);
                            } else {
                                property_final.push(0x00);
                            }
                        }
                        Value::Number(n) => {
                            if n.is_u64() {
                                property_final.extend(4_i8.to_ne_bytes());
                                let n: u64 = n.as_u64().unwrap();
                                property_final.extend(n.to_ne_bytes());
                            }

                            if n.is_i64() {
                                property_final.extend(4_i8.to_ne_bytes());
                                let n: i64 = n.as_i64().unwrap();
                                property_final.extend(n.to_ne_bytes())
                            }

                            if n.is_f64() {
                                property_final.extend(2_i8.to_ne_bytes());
                                let n: f64 = n.as_f64().unwrap();
                                property_final.extend(n.to_ne_bytes());
                            }
                        }
                        Value::String(s) => {
                            property_final.extend(3_i8.to_ne_bytes());
                            let formatted = s.as_bytes();
                            property_final.extend(formatted);
                            property_final.extend("\0".as_bytes());
                        }
                        Value::Array(_) => {
                            //TODO: handles arrays
                        }
                        Value::Object(_) => panic!("can't handle nested objects yet"),
                    }
                }
            }
        }

        property_final
    }
}

#[derive(Deserialize, Serialize)]
struct Edge {
    id: u64,
    data_source_id: u64,
    relationship_pair_id: u64,
    container_id: u64,
    origin_id: u64,
    destination_id: u64,
    new_origin_id: Option<u64>,
    new_destination_id: Option<u64>,
    properties: String,
    metatype_relationship_name: String,
    metadata_properties: String,
    created_at: String,
    deleted_at: String,
    created_by: String,
    modified_by: String,
    modified_at: String,
}

impl Edge {
    // returns parsed header and an index of property names to make sure order stays the same
    pub fn to_redis_header_bytes(&self) -> (Vec<u8>, Vec<String>) {
        let properties: Value = serde_json::from_str(self.properties.as_str()).unwrap();

        let properties = match properties {
            Value::Object(o) => o,
            _ => {
                // TODO: Handle non-object properties if ever needed
                panic!("properties of node not an object")
            }
        };

        let property_len: u32 = properties.len() as u32 + 8;
        let mut property_names: Vec<u8> = vec![];
        let mut property_names_raw: Vec<String> = vec![];

        property_names.extend("_deeplynx_id\0".as_bytes());
        property_names.extend("_data_source_id\0".as_bytes());
        property_names.extend("_container_id\0".as_bytes());
        property_names.extend("_metadata_properties\0".as_bytes());
        property_names.extend("_created_at\0".as_bytes());
        property_names.extend("_created_by\0".as_bytes());
        property_names.extend("_modified_at\0".as_bytes());
        property_names.extend("_modified_by\0".as_bytes());

        for (key, _) in properties.iter() {
            let name = key.as_bytes();
            property_names_raw.push(key.clone());
            property_names.extend(name);
            property_names.extend("\0".as_bytes());
        }

        let mut parsed: Vec<u8> = vec![];
        parsed.extend(self.metatype_relationship_name.as_bytes());
        parsed.extend("\0".as_bytes());
        parsed.extend(property_len.to_ne_bytes());
        parsed.extend(property_names);

        (parsed, property_names_raw)
    }

    pub fn to_redis_properties_bytes(&self, index_names: &Vec<String>) -> Vec<u8> {
        let properties: Value = serde_json::from_str(self.properties.as_str()).unwrap();

        let properties = match properties {
            Value::Object(o) => o,
            _ => panic!("properties of node not an object"),
        };

        let mut property_final: Vec<u8> = vec![];

        property_final.extend(4_i8.to_ne_bytes());
        property_final.extend(self.id.to_ne_bytes());

        property_final.extend(4_i8.to_ne_bytes());
        property_final.extend(self.data_source_id.to_ne_bytes());

        property_final.extend(4_i8.to_ne_bytes());
        property_final.extend(self.container_id.to_ne_bytes());

        property_final.extend(3_i8.to_ne_bytes());
        property_final.extend(self.metadata_properties.as_bytes());
        property_final.extend("\0".as_bytes());

        property_final.extend(3_i8.to_ne_bytes());
        property_final.extend(self.created_at.as_bytes());
        property_final.extend("\0".as_bytes());

        property_final.extend(3_i8.to_ne_bytes());
        property_final.extend(self.created_by.as_bytes());
        property_final.extend("\0".as_bytes());

        property_final.extend(3_i8.to_ne_bytes());
        property_final.extend(self.modified_at.as_bytes());
        property_final.extend("\0".as_bytes());

        property_final.extend(3_i8.to_ne_bytes());
        property_final.extend(self.modified_by.as_bytes());
        property_final.extend("\0".as_bytes());

        for property_name in index_names {
            match properties.get(property_name.as_str()) {
                None => property_final.extend(0_i8.to_ne_bytes()),
                Some(value) => {
                    match value {
                        Value::Null => property_final.extend(0_i8.to_ne_bytes()),
                        Value::Bool(b) => {
                            property_final.extend(1_i8.to_ne_bytes());
                            if *b {
                                property_final.push(0x01);
                            } else {
                                property_final.push(0x00);
                            }
                        }
                        Value::Number(n) => {
                            if n.is_u64() {
                                property_final.extend(4_i8.to_ne_bytes());
                                let n: u64 = n.as_u64().unwrap();
                                property_final.extend(n.to_ne_bytes());
                            }

                            if n.is_i64() {
                                property_final.extend(4_i8.to_ne_bytes());
                                let n: i64 = n.as_i64().unwrap();
                                property_final.extend(n.to_ne_bytes())
                            }

                            if n.is_f64() {
                                property_final.extend(2_i8.to_ne_bytes());
                                let n: f64 = n.as_f64().unwrap();
                                property_final.extend(n.to_ne_bytes());
                            }
                        }
                        Value::String(s) => {
                            property_final.extend(3_i8.to_ne_bytes());
                            let formatted = s.as_bytes();
                            property_final.extend(formatted);
                            property_final.extend("\0".as_bytes());
                        }
                        Value::Array(_) => {
                            //TODO: handles arrays
                        }
                        Value::Object(_) => panic!("can't handle nested objects yet"),
                    }
                }
            }
        }

        property_final
    }
}
