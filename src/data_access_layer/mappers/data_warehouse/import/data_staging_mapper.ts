/*
* DataStagingStorage encompasses all logic dealing with the manipulation of the
* data_staging table in storage. Note that records should be inserted manually
* with caution. There are database triggers and other automated processes in place
* for taking data from the imports table and parsing it into the data_staging table.
 */
import Mapper from "../../mapper";
import Result from "../../../../common_classes/result";
import {PoolClient, QueryConfig} from "pg";
import {DataStaging} from "../../../../data_warehouse/import/import";

const format = require('pg-format')
const resultClass = DataStaging

export default class DataStagingMapper extends Mapper {
    public static tableName = "data_staging";

    private static instance: DataStagingMapper;

    public static get Instance(): DataStagingMapper {
        if(!DataStagingMapper.instance) {
            DataStagingMapper.instance = new DataStagingMapper()
        }

        return DataStagingMapper.instance
    }

    private constructor() {
        super();
    }

    public async Create(record: DataStaging, transaction?: PoolClient): Promise<Result<DataStaging>> {
        const r = await super.run(this.createStatement(record), {resultClass, transaction})
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public async BulkCreate(record: DataStaging[], transaction?: PoolClient): Promise<Result<DataStaging[]>> {
        return super.run(this.createStatement(...record), {transaction, resultClass})
    }

    public async Update(record: DataStaging, transaction?: PoolClient): Promise<Result<DataStaging>> {
        const r = await super.run(this.fullUpdateStatement(record), {resultClass, transaction})
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public async BulkUpdate(record: DataStaging[], transaction?: PoolClient): Promise<Result<DataStaging[]>> {
        return super.run(this.fullUpdateStatement(...record), {transaction, resultClass})
    }

    public async Count(importID: string, transaction?: PoolClient): Promise<Result<number>> {
        return super.count(this.countImportStatement(importID), transaction)
    }

    public async CountUninsertedForImport(importID: string, transaction?: PoolClient): Promise<Result<number>> {
        return super.count(this.countUninsertedByImportStatement(importID), transaction)
    }

    // returns the count of records in an import that also contain an active type mapping
    // which contains transformations - used in the process loop
    public async CountUninsertedActiveMapping(importID: string, transaction?: PoolClient): Promise<Result<number>> {
        return super.count(this.countImportUninsertedActiveMappingStatement(importID), transaction)
    }

    public async Retrieve(id: number, transaction?: PoolClient): Promise<Result<DataStaging>> {
        return super.retrieve(this.retrieveStatement(id), {transaction, resultClass})
    }

    // list uninserted records which also have an active type mapping record along with transformations
    public async ListUninsertedActiveMapping(importID: string, offset:number, limit:number, transaction?: PoolClient): Promise<Result<DataStaging[]>>{
        return super.rows<DataStaging>(this.listUninsertedActiveMappingStatement(importID, offset, limit), {resultClass, transaction})
    }

    public async SetInserted(id: number, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.setInsertedStatement(id), {transaction})
    }

    public async PermanentlyDelete(id: number): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id))
    }

    // completely overwrite the existing error set
    public SetErrors(id:number, errors: string[], transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.setErrorsStatement(id, errors), {transaction})
    }

    // add an error to an existing error set
    public AddError(id:number, errors: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.addErrorsStatement(id, errors), {transaction})
    }

    private createStatement(...data: DataStaging[]): string {
            const text = `INSERT INTO data_staging(
                         data_source_id,
                         import_id,
                         data,
                         mapping_id) VALUES %L RETURNING *`
            const values = data.map(d => [
                d.data_source_id,
                d.import_id,
                JSON.stringify(d.data),
                d.mapping_id
            ])

            return format(text, values)
    }

    private fullUpdateStatement(...data: DataStaging[]): string {
        const text = `UPDATE data_staging AS s SET
                         data_source_id = u.data_source_id::uuid,
                         import_id = u.import_id::uuid,
                         data = u.data::jsonb,
                         mapping_id = u.mapping_id::uuid
                        FROM(VALUES %L) AS u(data_source_id, import_id, data, mapping_id)
                        WHERE u.id::int4 = s.id RETURNING s.*`
        const values = data.map(d => [
            d.id,
            d.data_source_id,
            d.import_id,
            JSON.stringify(d.data),
            d.mapping_id
        ])

        return format(text, values)
    }

    private retrieveStatement(id: number): QueryConfig {
        return {
            text:`SELECT * FROM data_staging WHERE id = $1`,
            values: [id]
        }
    }

    private listStatement(importID: string, offset: number, limit: number, sortBy?: string, sortDesc?:boolean): QueryConfig {
        if(sortDesc) {
            return {
                text: `SELECT * FROM data_staging WHERE import_id = $1 ORDER BY "${sortBy}" DESC OFFSET $2 LIMIT $3`,
                values: [importID, offset, limit]
            }
        } else if(sortBy) {
            return {
                text: `SELECT * FROM data_staging WHERE import_id = $1 ORDER BY "${sortBy}" ASC OFFSET $2 LIMIT $3`,
                values: [importID, offset, limit]
            }
        } else {
            return {
                text: `SELECT * FROM data_staging WHERE import_id = $1 OFFSET $2 LIMIT $3`,
                values: [importID, offset, limit]
            }
        }
    }

    private listAllStatement(importID: string): QueryConfig {
        return {
            text: `SELECT * FROM data_staging WHERE import_id = $1`,
            values: [importID]
        }
    }

    private listUninsertedActiveMappingStatement(importID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT data_staging.*
                   FROM data_staging
                   LEFT JOIN data_type_mappings ON data_type_mappings.id = data_staging.mapping_id
                   WHERE import_id = $1
                   AND inserted_at IS NULL
                   AND data_type_mappings.active IS TRUE
                   AND EXISTS (SELECT * from data_type_mapping_transformations WHERE data_type_mapping_transformations.type_mapping_id = data_staging.mapping_id)
                   OFFSET $2 LIMIT $3`,
            values: [importID, offset, limit]
        }
    }

    private countImportStatement(importID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM data_staging WHERE import_id = $1`,
            values: [importID]
        }
    }

    private countUninsertedByImportStatement(importID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM data_staging WHERE inserted_at IS NULL AND import_id = $1`,
            values: [importID]
        }
    }

    private countImportUninsertedActiveMappingStatement(importID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*)
                   FROM data_staging
                   LEFT JOIN data_type_mappings ON data_type_mappings.id = data_staging.mapping_id
                   WHERE data_staging.import_id = $1
                   AND data_staging.inserted_at IS NULL
                   AND data_type_mappings.active IS TRUE
                   AND EXISTS (SELECT * from data_type_mapping_transformations WHERE data_type_mapping_transformations.type_mapping_id = data_staging.mapping_id)
            `,
            values: [importID]
        }
    }

    private setInsertedStatement(id: number): QueryConfig {
        return {
            text: `UPDATE data_staging SET inserted_At = NOW() WHERE id = $1`,
            values: [id]
        }
    }

    private deleteStatement(id: number): QueryConfig {
        return {
            text:`DELETE FROM data_staging WHERE id = $1`,
            values: [id]
        }
    }

    private setErrorsStatement(id: number, errors: string[]): QueryConfig {
        return {
            text: `UPDATE data_staging SET errors = $1 WHERE id = $2`,
            values: [errors, id]
        }
    }

    private addErrorsStatement(id: number, error: string): QueryConfig {
        return {
            text: `UPDATE data_staging SET errors = array_append(errors, $1) WHERE id = $2`,
            values: [error, id]
        }
    }
}
