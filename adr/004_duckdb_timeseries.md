# 4. Timeseries Querying Through DuckDB

Date: 2024-12-14

## Status

Accepted

# Requirement
- The application shall allow users to store timeseries data

## Context
DeepLynx 1.x.x had the newish ability to let users query CSV and Parquet files with SQL. This process was Node.js and the query process was CPU consuming and had to be done in Rust. The original setup was async and relied on storing the results in the same storage layer the file was in. We used DataFusion for this first attempt, and while it functioned - it has a lot of restrictions and once a file reaches a certain size, anything greater than available system memory, the system would crash. 

In order to facilite larger file sizes, and now that we are in an ecosystem which enables us to more easily push CPU intensive tasks into non-blocking tasks, we decided it was time for a change.

Instead of DataFusion and porting our Rust library over, or wrapping the raw DataFusion Rust lib, we decided to utilize [DuckDB](https://duckdb.org/). This will allow us to immediately enable more file types, file locations, and solves our OOM issues by enabling a paging to disk operation for large tables. We can also now load multiple files into the same, or different tables in the same instance, something we couldn't do before. We also enabled JSON alongside CSV and Parquet files - as well as allowing S3, GCP, Azure Storage, Cloudflare R2, and file system storage systems.

## Decision(s)
- Timeseries querying will be handled by a GenServer wrapping DuckDB - an in-process OLAP database
- We will enable querying multiple JSON, CSV, Parquet files
- We will enable querying from S3, GCP, Azure Storage, Cloudflare R2, and LakeFS (or other S3 compliant systems)

## Consequences
The original timeseries library will stay in 1.x.x and instead we will utilize DuckDB for future querying. 
