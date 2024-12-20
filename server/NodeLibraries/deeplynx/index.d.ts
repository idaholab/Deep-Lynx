/* tslint:disable */
/* eslint-disable */

/* auto-generated by NAPI-RS */

export interface Configuration {
  dbConnectionString?: string
  redisConnectionString?: string
  maxColumns?: number
}
export interface Options {
  stopNodes?: Array<string>
  valueNodes?: Array<string>
}
export declare function hash(a: string, options: Options): string
export interface FileMetadata {
  id: string
  file_name: string
  access_path: string
}
/**
 * For processing file uploads
 * Returns the results of a SQL `DESCRIBE` of the file as stringified JSON.
 */
export declare function processUpload(reportId: string, query: string, storageConnection: string, files: Array<FileMetadata>): Promise<string>
/**
 * For processing a query against a set of files.
 * Uploads results to a location specified in the request object.
 * Returns the metadata of the query results as stringified JSON.
 */
export declare function processQuery(reportId: string, query: string, storageConnection: string, files: Array<FileMetadata>): Promise<string>
export interface LegacyTimeseriesColumn {
  column_name: string
  property_name: string
  is_primary_timestamp: boolean
  type: string
  date_conversion_format_string?: string
}
export type JsRedisGraphLoader = RedisGraphLoader
export declare class RedisGraphLoader {
  constructor()
  /**
   * # Safety
   *
   * This function should be called before any work done on the object
   */
  init(config: Configuration): Promise<void>
  generateRedisGraph(containerId: string, timestamp?: string | undefined | null, ttl?: number | undefined | null): Promise<string>
}
export type JsSnapshotGenerator = SnapshotGenerator
export declare class SnapshotGenerator {
  constructor()
  /**
   * # Safety
   *
   * This function should be called before any work done on the object
   * This generates the node snapshot dataframe and stores it on the SnapshotGenerator instance. This
   * MUST be run before you attempt to find any nodes.
   */
  init(config: Configuration, containerId: string, timestamp?: string | undefined | null): Promise<void>
  /**
   * Find all the nodes that match a given set of parameters. Parameters must be EdgeParameters passed
   * in as JSON in order to handle the fact that the value could be any valid JSON data-type. This function
   * returns only the _database_ ids of the matching nodes - this is in order to avoid expensive serialization
   * across the border.
   */
  findNodes(parametersJson: string): Promise<Array<string>>
}
export type JsBucketRepository = BucketRepository
export declare class BucketRepository {
  constructor()
  /**
   * # Safety
   *
   * This function should be called before any work done on the object
   */
  init(config: Configuration): Promise<void>
  /**
   * # Safety
   *
   * This spawns multithreaded operations so be wary. The beginCsvIngestion function initializes the
   * repository to receive CSV data from a node.js source
   */
  beginLegacyCsvIngestion(dataSourceId: string, columns: Array<LegacyTimeseriesColumn>): void
  /**
   * # Safety
   *
   * A "begin_x_ingestion" must have been called successfully before you attempt to read.
   * This is how data is passed into our internal pipeline
   */
  readData(bytes: Buffer): void
  /**
   * # Safety
   *
   * This terminates multithreaded operations so be wary. This is called when you've completed the
   * ingestion and can also be used to check for errors during the operation
   */
  completeIngestion(): Promise<void>
}
