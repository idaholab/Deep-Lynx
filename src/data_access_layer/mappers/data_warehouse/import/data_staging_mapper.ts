import Mapper from '../../mapper';
import Result from '../../../../common_classes/result';
import {PoolClient, QueryConfig} from 'pg';
import {DataStaging} from '../../../../domain_objects/data_warehouse/import/import';

const format = require('pg-format');
const resultClass = DataStaging;

/*
    DataStagingMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class DataStagingMapper extends Mapper {
    public static tableName = 'data_staging';

    private static instance: DataStagingMapper;

    public static get Instance(): DataStagingMapper {
        if (!DataStagingMapper.instance) {
            DataStagingMapper.instance = new DataStagingMapper();
        }

        return DataStagingMapper.instance;
    }

    private constructor() {
        super();
    }

    public async Create(record: DataStaging, transaction?: PoolClient): Promise<Result<DataStaging>> {
        const r = await super.run(this.createStatement(record), {
            resultClass,
            transaction,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(record: DataStaging[], transaction?: PoolClient): Promise<Result<DataStaging[]>> {
        return super.run(this.createStatement(...record), {
            transaction,
            resultClass,
        });
    }

    public async Update(record: DataStaging, transaction?: PoolClient): Promise<Result<DataStaging>> {
        const r = await super.run(this.fullUpdateStatement(record), {
            resultClass,
            transaction,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(record: DataStaging[], transaction?: PoolClient): Promise<Result<DataStaging[]>> {
        return super.run(this.fullUpdateStatement(...record), {
            transaction,
            resultClass,
        });
    }

    public async Count(importID: string, transaction?: PoolClient): Promise<Result<number>> {
        return super.count(this.countImportStatement(importID), transaction);
    }

    public async CountUninsertedForImport(importID: string, transaction?: PoolClient): Promise<Result<number>> {
        return super.count(this.countUninsertedByImportStatement(importID), transaction);
    }

    // returns the count of records in an import that also contain an active type mapping
    // which contains transformations - used in the process loop
    public async CountUninsertedActiveMapping(importID: string, transaction?: PoolClient): Promise<Result<number>> {
        return super.count(this.countImportUninsertedActiveMappingStatement(importID), transaction);
    }

    public async Retrieve(id: string, transaction?: PoolClient): Promise<Result<DataStaging>> {
        return super.retrieve(this.retrieveStatement(id), {
            transaction,
            resultClass,
        });
    }

    // list uninserted records which also have an active type mapping record along with transformations
    public async ListUninsertedActiveMapping(importID: string, offset: number, limit: number, transaction?: PoolClient): Promise<Result<DataStaging[]>> {
        return super.rows<DataStaging>(this.listUninsertedActiveMappingStatement(importID, offset, limit), {resultClass, transaction});
    }

    public async ListIDOnly(importID: string): Promise<Result<DataStaging[]>> {
        return super.rows<DataStaging>(this.listIDOnly(importID), {resultClass});
    }

    public async SetInserted(id: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.setInsertedStatement(id), {
            transaction,
        });
    }

    public AddFile(id: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.addFile(id, fileID));
    }

    public RemoveFile(id: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.removeFile(id, fileID));
    }

    public async Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    // completely overwrite the existing error set
    public SetErrors(id: string, errors: string[], transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.setErrorsStatement(id, errors), {
            transaction,
        });
    }

    // add an error to an existing error set
    public AddError(id: string, errors: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.addErrorsStatement(id, errors), {
            transaction,
        });
    }

    private createStatement(...data: DataStaging[]): string {
        const text = `INSERT INTO data_staging(
                         data_source_id,
                         import_id,
                         data,
                         shape_hash) VALUES %L RETURNING *`;
        const values = data.map((d) => [d.data_source_id, d.import_id, JSON.stringify(d.data), d.shape_hash]);

        return format(text, values);
    }

    private fullUpdateStatement(...data: DataStaging[]): string {
        const text = `UPDATE data_staging AS s SET
                         data_source_id = u.data_source_id::bigint,
                         import_id = u.import_id::bigint,
                         data = u.data::jsonb,
                         shape_hash = u.shape_hash::text
                        FROM(VALUES %L) AS u(id,data_source_id, import_id, data, shape_hash)
                        WHERE u.id::bigint = s.id RETURNING s.*`;
        const values = data.map((d) => [d.id, d.data_source_id, d.import_id, JSON.stringify(d.data), d.shape_hash]);

        return format(text, values);
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT data_staging.*, data_sources.container_id, data_sources.config AS data_source_config 
                    FROM data_staging 
                    LEFT JOIN data_sources ON data_sources.id = data_staging.data_source_id
                    WHERE data_staging.id = $1`,
            values: [id],
        };
    }

    private listUninsertedActiveMappingStatement(importID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT data_staging.*
                   FROM data_staging
                   LEFT JOIN type_mappings ON type_mappings.shape_hash = data_staging.shape_hash
                                                AND type_mappings.data_source_id = data_staging.data_source_id    
                   WHERE import_id = $1
                   AND inserted_at IS NULL
                   AND type_mappings.active IS TRUE
                   AND EXISTS 
                       (SELECT * from type_mapping_transformations 
                        WHERE type_mapping_transformations.type_mapping_id = type_mappings.id)
                   OFFSET $2 LIMIT $3`,
            values: [importID, offset, limit],
        };
    }

    private listIDOnly(importID: string): QueryConfig {
        return {
            text: `SELECT data_staging.id FROM data_staging WHERE import_id = $1`,
            values: [importID],
        };
    }

    private countImportStatement(importID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM data_staging WHERE import_id = $1`,
            values: [importID],
        };
    }

    private countUninsertedByImportStatement(importID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM data_staging WHERE inserted_at IS NULL AND import_id = $1`,
            values: [importID],
        };
    }

    private countImportUninsertedActiveMappingStatement(importID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*)
                   FROM data_staging
                            LEFT JOIN type_mappings ON type_mappings.shape_hash = data_staging.shape_hash
                                                         AND type_mappings.data_source_id = data_staging.data_source_id
                   WHERE data_staging.import_id = $1
                   AND data_staging.inserted_at IS NULL
                   AND type_mappings.active IS TRUE
                   AND EXISTS 
                        (SELECT * from type_mapping_transformations 
                            WHERE type_mapping_transformations.type_mapping_id = type_mappings.id)
            `,
            values: [importID],
        };
    }

    private setInsertedStatement(id: string): QueryConfig {
        return {
            text: `UPDATE data_staging SET inserted_at = NOW() WHERE id = $1`,
            values: [id],
        };
    }

    private deleteStatement(id: string): QueryConfig {
        return {
            text: `DELETE FROM data_staging WHERE id = $1`,
            values: [id],
        };
    }

    private setErrorsStatement(id: string, errors: string[]): QueryConfig {
        return {
            text: `UPDATE data_staging SET errors = $1 WHERE id = $2`,
            values: [errors, id],
        };
    }

    private addErrorsStatement(id: string, error: string): QueryConfig {
        return {
            text: `UPDATE data_staging SET errors = array_append(errors, $1) WHERE id = $2`,
            values: [error, id],
        };
    }

    private addFile(id: string, fileID: string): QueryConfig {
        return {
            text: `INSERT INTO data_staging_files(data_staging_id, file_id) VALUES ($1, $2)`,
            values: [id, fileID],
        };
    }

    private removeFile(id: string, fileID: string): QueryConfig {
        return {
            text: `DELETE FROM data_staging_files WHERE data_staging_id = $1 AND file_id = $2`,
            values: [id, fileID],
        };
    }

    public listImportUninsertedActiveMappingStatement(): string {
        return `SELECT data_staging.*
                   FROM data_staging
                            LEFT JOIN type_mappings ON type_mappings.shape_hash = data_staging.shape_hash
                                                         AND type_mappings.data_source_id = data_staging.data_source_id
                   WHERE (data_staging.inserted_at IS NULL
                   AND type_mappings.active IS TRUE
                   AND EXISTS 
                        (SELECT * from type_mapping_transformations 
                            WHERE type_mapping_transformations.type_mapping_id = type_mappings.id))
                   OR data_staging.shape_hash IS NULL`;
    }
}
