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
import PostgresAdapter from "../adapters/postgres/postgres";
import {QueueProcessor} from "../../services/event_system/events";
import {EventT} from "../../types/events/eventT";

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

    public async Create(dataSourceID: string, importID:string, data: any ): Promise<Result<boolean>> {
        return new Promise((resolve) => {
            PostgresAdapter.Instance.Pool.query(DataStagingStorage.createStatement(dataSourceID, importID, data))
                .then(() => {
                    QueueProcessor.Instance.emit([{
                        source_id: dataSourceID,
                        source_type: "data_source",
                        type: "data_imported"
                    }])

                    resolve(Result.Success(true))
                })
                .catch((e:Error) => resolve(Result.Failure(e.message)))
        })
    }

    public async ListForTypeMapping(typeMapping: TypeMappingT): Promise<Result<DataStagingT[]>> {
        return super.rows<DataStagingT>(DataStagingStorage.ListMatchedForTypeMappingStatement(typeMapping))
    }

    public async CountUnmappedData(importID: string): Promise<Result<number>> {
        return super.count(DataStagingStorage.countUnmappedForImportStatement(importID))
    }

    public async Count(importID: string): Promise<Result<number>> {
        return super.count(DataStagingStorage.countImportStatement(importID))
    }

    public async Retrieve(id: string): Promise<Result<DataStagingT>> {
        return super.retrieve<DataStagingT>(DataStagingStorage.retrieveStatement(id))
    }

    public async List(importID: string, offset:number, limit:number): Promise<Result<DataStagingT[]>>{
        return super.rows<DataStagingT>(DataStagingStorage.listStatement(importID, offset, limit))
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
        return super.runAsTransaction(DataStagingStorage.setProcessedStatement(importID))
    }

    public async PartialUpdate(id: string, userID:string, updatedField: {[key:string]: any}): Promise<Result<boolean>> {
        const toUpdate = await this.Retrieve(id);

        if(toUpdate.isError) {
            return new Promise(resolve => resolve(Result.Failure(toUpdate.error!.error)))
        }

        const updateStatement:string[] = [];
        const values:string[] = [];
        let i = 1;

        Object.keys(updatedField).map(k => {
            updateStatement.push(`${k} = $${i}`);
            values.push(updatedField[k]);
            i++
        });

        return new Promise(resolve => {
            PostgresAdapter.Instance.Pool.query({
                text: `UPDATE data_statging SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    public async PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(DataStagingStorage.deleteStatement(id))
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

    public SetErrors(id:number, errors: string[]): Promise<Result<boolean>> {
        return super.runAsTransaction(DataStagingStorage.setErrorsStatement(id, errors))
    }

    private static createStatement(dataSourceID: string, importID:string, data: any): QueryConfig {
        return {
            text: `INSERT INTO data_staging(data_source_id,import_id,data) VALUES($1,$2,$3)`,
            values: [dataSourceID, importID, data]
        }
    }

    private static retrieveStatement(metatypeID:string): QueryConfig {
        return {
            text:`SELECT * FROM data_staging WHERE id = $1`,
            values: [metatypeID]
        }
    }

    private static listStatement(importID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT * FROM data_staging WHERE import_id = $1 OFFSET $2 LIMIT $3`,
            values: [importID, offset, limit]
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
            text: `SELECT * FROM data_staging WHERE data_source_id = $1 AND inserted_at IS NULL AND mapping_id IS NULL OFFSET $2 LIMIT $3`,
            values: [dataSourceID, offset, limit]
        }
    }

    private static countUnprocessedByDataSourceStatement(dataSourceID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM data_staging WHERE data_source_id = $1 AND inserted_at IS NULL AND mapping_id IS NULL`,
            values: [dataSourceID]
        }
    }

    private static countUnmappedForImportStatement(importID: string): QueryConfig {
       return {
           text: `SELECT COUNT(*) FROM data_staging WHERE mapping_id IS NULL AND import_id = $1`,
           values: [importID]
       }
    }

    private static countImportStatement(importID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM data_staging WHERE import_id = $1`,
            values: [importID]
        }
    }

    private static setProcessedStatement(importID: string): QueryConfig {
        return {
            text: `UPDATE data_staging SET inserted_At = NOW() WHERE import_id = $1`,
            values: [importID]
        }
    }

    private static deleteStatement(id: string): QueryConfig {
        return {
            text:`DELETE FROM data_staging WHERE id = $1`,
            values: [id]
        }
    }

    private static setErrorsStatement(id: number, errors: string[]): QueryConfig {
        return {
            text: `UPDATE data_staging SET errors = $1 WHERE id = $2`,
            values: [errors, id]
        }
    }
}
