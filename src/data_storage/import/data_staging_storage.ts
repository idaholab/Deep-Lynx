/*
* DataStagingStorage encompasses all logic dealing with the manipulation of the
* data_staging table in storage. Note that records should be inserted manually
* with caution. There are database triggers and other automated processes in place
* for taking data from the imports table and parsing it into the data_staging table.
 */
import PostgresStorage from "../postgresStorage";
import {DataStagingT} from "../../types/import/dataStagingT";
import Result from "../../result";
import {Query, QueryConfig} from "pg";
import {TypeMappingT} from "../../types/import/typeMappingT";

export default class DataStagingStorage extends PostgresStorage {
    public static tableName = "data_staging";

    private static instance: DataStagingStorage;

    public static get Instance(): DataStagingStorage {
        if(!DataStagingStorage.instance) {
            DataStagingStorage.instance = new DataStagingStorage()
        }

        return DataStagingStorage.instance
    }

    private constructor() {
        super();
    }

    public async ListForTypeMapping(typeMapping: TypeMappingT): Promise<Result<DataStagingT[]>> {
        return super.rows<DataStagingT>(DataStagingStorage.ListMatchedForTypeMappingStatement(typeMapping))
    }

    public async CountUnmappedData(importID: string): Promise<Result<number>> {
        return super.count(DataStagingStorage.CountUnmappedForImportStatement(importID))
    }

    public async Count(importID: string): Promise<Result<number>> {
        return super.count(DataStagingStorage.CountImportStatement(importID))
    }

    public async ListUnprocessed(importID: string, offset:number, limit:number): Promise<Result<DataStagingT[]>>{
        return super.rows<DataStagingT>(DataStagingStorage.listUnprocessedStatement(importID, offset, limit))
    }

    public async ListUnprocessedByDataSource(dataSourceID: string, offset:number, limit:number): Promise<Result<DataStagingT[]>>{
        return super.rows<DataStagingT>(DataStagingStorage.listUnprocessedByDataSourceStatement(dataSourceID, offset, limit))
    }

    public async CountUnprocessedByDataSource(dataSourceID: string): Promise<Result<number>>{
        return super.count(DataStagingStorage.countUnprocessedByDataSourceStatement(dataSourceID))
    }

    public async SetProcessed(importID: string): Promise<Result<boolean>> {
        return super.runAsTransaction(DataStagingStorage.SetProcessedStatement(importID))
    }

    private static ListMatchedForTypeMappingStatement(tm: TypeMappingT): QueryConfig {
        if (tm.metatype_relationship_pair_id) {
            return {
                text: `SELECT * FROM data_staging
                    WHERE data_source_id = $1
                    AND data_staging.data::jsonb->> '${tm.relationship_type_key}' = $2
                    AND data_staging.data::jsonb ? '${tm.unique_identifier_key}'
                    AND data_staging.data::jsonb ? '${tm.origin_key}'
                    AND data_staging.data::jsonb ? '${tm.destination_key}'`,
                values: [tm.data_source_id, tm.relationship_type_value]
            }
        }

        return {
            text: `SELECT * FROM data_staging
                    WHERE data_source_id = $1
                    AND data_staging.data::jsonb->> '${tm.type_key}' = $2
                    AND data_staging.data::jsonb ? '${tm.unique_identifier_key}'`,
            values: [tm.data_source_id, tm.type_value]
        }

    }

    private static listUnprocessedStatement(importID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT * FROM data_staging WHERE import_id = $1 AND inserted_at IS NULL OFFSET $2 LIMIT $3`,
            values: [importID, offset, limit]
        }
    }

    private static listUnprocessedByDataSourceStatement(dataSourceID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT * FROM data_staging WHERE data_source_id = $1 AND inserted_at IS NULL OFFSET $2 LIMIT $3`,
            values: [dataSourceID, offset, limit]
        }
    }

    private static countUnprocessedByDataSourceStatement(dataSourceID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM data_staging WHERE data_source_id = $1 AND inserted_at IS NULL AND mapping_id IS NULL`,
            values: [dataSourceID]
        }
    }

    private static CountUnmappedForImportStatement(importID: string): QueryConfig {
       return {
           text: `SELECT COUNT(*) FROM data_staging WHERE mapping_id IS NULL AND import_id = $1`,
           values: [importID]
       }
    }

    private static CountImportStatement(importID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM data_staging WHERE import_id = $1`,
            values: [importID]
        }
    }

    private static SetProcessedStatement(importID: string): QueryConfig {
        return {
            text: `UPDATE data_staging SET inserted_At = NOW() WHERE import_id = $1`,
            values: [importID]
        }
    }
}
