extern crate core;

mod errors;

use std::env;
use chrono::{DateTime, Duration, NaiveDateTime};
use sqlx::{Pool, Postgres, Row};
use tokio::time::{Instant, sleep};
use futures_util::TryStreamExt;
use redis::{Client, JsonCommands};
use serde::{Deserialize, Serialize};
use crate::errors::LoaderError;

#[derive(sqlx::FromRow, Serialize, Deserialize)]
pub struct Node {
    id: i64,
    container_id: i64,
    metatype_id: i64,
    metatype_name: String,
    properties: serde_json::Value,
    original_data_id: String,
    import_data_id: i64,
    data_staging_id: String,
    data_source_id: i64,
    type_mapping_transformation_id: i64,
    metadata: serde_json::Value,
    metatype_uuid: String
}

#[tokio::main]
async fn main() {
    let connection_string = match env::var("POSTGRES_CONNECTION_STRING") {
        Ok(c) => {c}
        Err(_) => {
            panic!("POSTGRES_CONNECTION_STRING environment variable not set")
        }
    };

    let redis_connection_string = match env::var("REDIS_CONNECTION_STRING") {
        Ok(c) => {c}
        Err(_) => {
            panic!("REDIS_CONNECTION_STRING environment variable not set")
        }
    };

    // create connection pool
    let pool = match sqlx::PgPool::connect(connection_string.as_str()).await {
        Ok(p) => {p}
        Err(e) => {
            panic!("unable to connect to postgres server {:?}", e);
        }
    };


    // create redis client, but don't open connection until we actually put things in, we don't
    // have a pool like postgres
    let redis_client = match Client::open(redis_connection_string) {
        Ok(c) => {c}
        Err(e) => {
            panic!("unable to create redis client: {:?}", e);
        }
    };

    let start = Instant::now();
    match initial_load(&pool, &redis_client).await {
        Ok(_) => {
            println!("initial load completed successfully");
        }
        Err(e) => {
            println!("error while attempting initial load, skipping to maintenance loop: {:?}", e);
        }
    }
    let duration = start.elapsed();
    println!("time for initial load to complete {:?}", duration);


    println!("entering maintenance mode");
    match maintenance_loop(&pool, &redis_client).await {
        Ok(_) => {
            println!("maintenance loop has exited");
        }
        Err(e) => {
            println!("error while attempting maintenance loop{:?}", e);
        }
    }

    println!("exiting program");
}


// initial_load loads all nodes from the current nodes view into redis initially, this could take
// a while
async fn initial_load(pool: &Pool<Postgres>, redis_client: &Client) -> Result<(), LoaderError> {
    // now we open a redis connection
    let mut redis_conn = redis_client.get_connection()?;


    let limit = 10000;
    let mut offset = 0;
    loop {
        let mut i = 0;
        let mut stream = sqlx::query_as::<_, Node>(INITIAL_QUERY)
            .bind(limit)
            .bind(offset)
            .fetch(pool);


        while let Some(node) = stream.try_next().await? {
            i+= 1;
            redis_conn.json_set(format!("node:{}", node.id), "$", &node)?;
        }

        // if we have less than the limit then we're done loading the nodes
        if i < 10000 {
            break;
        }

        offset += 10000;
    }

    return Ok(());
}

async fn maintenance_loop(pool: &Pool<Postgres>, redis_client: &Client) -> Result<(), LoaderError> {
    // now we open a redis connection
    let mut redis_conn = redis_client.get_connection()?;
    let result = match sqlx::query(SELECT_NOW)
        .fetch_one(pool).await {
        Ok(r) => {r}
        Err(e) => {
            panic!("unable to select current time from postgres {:?}", e);
        }
    };

    let time: &str = result.try_get("now")?;
    let mut time = NaiveDateTime::parse_from_str(time, "%Y-%m-%d %H:%M:%S")? - Duration::seconds(1);

    loop {
        sleep(core::time::Duration::from_secs(10)).await;
        let limit = 10000;
        let mut offset = 0;
        loop {
            let mut i = 0;
            let mut stream = sqlx::query_as::<_, Node>(LOOP_QUERY)
                .bind(time.format("%Y-%m-%d %H:%m%f%#z").to_string())
                .bind(limit)
                .bind(offset)
                .fetch(pool);


            while let Some(node) = stream.try_next().await? {
                i+= 1;
                let json = serde_json::to_string(&node)?;
                redis_conn.json_set(format!("node:{}", node.id), "$", &node)?;
            }

            // if we have less than the limit then we're done loading the nodes
            if i < 10000 {
                break;
            }

            offset += 10000;
        }

        let limit = 10000;
        let mut offset = 0;
        loop {
            let mut i = 0;
            let mut stream = sqlx::query_as::<_, Node>(DELETED_AT_QUERY)
                .bind(time.format("%Y-%m-%d %H:%m%f%#z").to_string())
                .bind(limit)
                .bind(offset)
                .fetch(pool);


            while let Some(node) = stream.try_next().await? {
                i+= 1;
                redis_conn.json_del(format!("node:{}", node.id), "$")?;
            }

            // if we have less than the limit then we're done loading the nodes
            if i < 10000 {
                break;
            }

            offset += 10000;
        }
        time = time + Duration::seconds(10);
    }
}


const INITIAL_QUERY: &str = "SELECT DISTINCT ON (nodes.id) nodes.id,
    nodes.container_id,
    nodes.metatype_id,
    nodes.data_source_id,
    nodes.import_data_id,
    nodes.data_staging_id::text,
    nodes.type_mapping_transformation_id,
    nodes.original_data_id,
    nodes.properties,
    nodes.metadata,
    nodes.created_at,
    nodes.modified_at,
    nodes.deleted_at,
    nodes.created_by,
    nodes.modified_by,
    metatypes.name AS metatype_name,
    metatypes.uuid::text AS metatype_uuid
   FROM (nodes
     LEFT JOIN metatypes ON ((metatypes.id = nodes.metatype_id)))
  WHERE (nodes.deleted_at IS NULL)
  ORDER BY nodes.id, nodes.created_at DESC
  LIMIT $1 OFFSET $2;";

const DELETED_AT_QUERY: &str = "SELECT DISTINCT ON (nodes.id) nodes.id,
    nodes.container_id,
    nodes.metatype_id,
    nodes.data_source_id,
    nodes.import_data_id,
    nodes.data_staging_id::text,
    nodes.type_mapping_transformation_id,
    nodes.original_data_id,
    nodes.properties,
    nodes.metadata,
    nodes.created_at,
    nodes.modified_at,
    nodes.deleted_at,
    nodes.created_by,
    nodes.modified_by,
    metatypes.name AS metatype_name,
    metatypes.uuid::text AS metatype_uuid
   FROM (nodes
     LEFT JOIN metatypes ON ((metatypes.id = nodes.metatype_id)))
  WHERE (nodes.deleted_at IS NOT NULL AND nodes.deleted_at > $1::timestamp)
  ORDER BY nodes.id, nodes.created_at DESC
  LIMIT $2 OFFSET $3;";

const LOOP_QUERY: &str = "SELECT DISTINCT ON (nodes.id) nodes.id,
    nodes.container_id,
    nodes.metatype_id,
    nodes.data_source_id,
    nodes.import_data_id,
    nodes.data_staging_id::text,
    nodes.type_mapping_transformation_id,
    nodes.original_data_id,
    nodes.properties,
    nodes.metadata,
    nodes.created_at,
    nodes.modified_at,
    nodes.deleted_at,
    nodes.created_by,
    nodes.modified_by,
    metatypes.name AS metatype_name,
    metatypes.uuid::text AS metatype_uuid
   FROM (nodes
     LEFT JOIN metatypes ON ((metatypes.id = nodes.metatype_id)))
  WHERE (nodes.deleted_at IS NULL AND nodes.created_at > $1::timestamp) OR (nodes.deleted_at IS NULL AND nodes.modified_at > $1::timestamp)
  ORDER BY nodes.id, nodes.created_at DESC
  LIMIT $2 OFFSET $3;";

const SELECT_NOW: &str = "SELECT to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS') as now";