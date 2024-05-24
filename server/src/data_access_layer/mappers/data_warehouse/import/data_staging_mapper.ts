import Mapper from '../../mapper';
import Result from '../../../../common_classes/result';
import {PoolClient, QueryConfig} from 'pg';
import {DataStaging} from '../../../../domain_objects/data_warehouse/import/import';
import {QueueFactory} from '../../../../services/queue/queue';
import PostgresAdapter from '../../db_adapters/postgres/postgres';
import QueryStream from 'pg-query-stream';
import {plainToClass} from 'class-transformer';
import Config from '../../../../services/config';
import Logger from '../../../../services/logger';
import {Transform, TransformCallback} from 'stream';
const devnull = require('dev-null');

const format = require('pg-format');

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
    public resultClass = DataStaging;
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
            resultClass: this.resultClass,
            transaction,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(record: DataStaging[], transaction?: PoolClient): Promise<Result<DataStaging[]>> {
        return super.run(this.createStatement(...record), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async Update(record: DataStaging, transaction?: PoolClient): Promise<Result<DataStaging>> {
        const r = await super.run(this.fullUpdateStatement(record), {
            resultClass: this.resultClass,
            transaction,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(record: DataStaging[], transaction?: PoolClient): Promise<Result<DataStaging[]>> {
        return super.run(this.fullUpdateStatement(...record), {
            transaction,
            resultClass: this.resultClass,
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
            resultClass: this.resultClass,
        });
    }

    // list uninserted records which also have an active type mapping record along with transformations
    public async ListUninsertedActiveMapping(importID: string, offset: number, limit: number, transaction?: PoolClient): Promise<Result<DataStaging[]>> {
        return super.rows<DataStaging>(this.listUninsertedActiveMappingStatement(importID, offset, limit), {resultClass: this.resultClass, transaction});
    }

    public async ListIDOnly(importID: string): Promise<Result<DataStaging[]>> {
        return super.rows<DataStaging>(this.listIDOnly(importID), {resultClass: this.resultClass});
    }

    public async SetInserted(id: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.setInsertedStatement(id), {
            transaction,
        });
    }

    public async SetInsertedMultiple(ids: string[], transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.setInsertedMultipleStatement(ids), {
            transaction,
        });
    }

    public AddFile(stagingID: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.addFile(stagingID, fileID));
    }

    public AddFileWithImport(importID: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.addFileWithImport(importID, fileID));
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

    public SetErrorsMultiple(ids: string[], errors: string[], transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.setMultipleErrorsStatement(ids, errors), {
            transaction,
        });
    }

    public MarkNodesProcessed(importIDs: string[]): Promise<Result<boolean>> {
        return super.runStatement(this.markNodesProcessed(importIDs));
    } // add an error to an existing error set

    public MarkEdgesProcessed(importIDs: string[]): Promise<Result<boolean>> {
        return super.runStatement(this.markEdgesProcessed(importIDs));
    } // add an error to an existing error set

    public AddError(id: string, errors: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.addErrorsStatement(id, errors), {
            transaction,
        });
    }

    // this runs a prepared statement which removes all data staging records who's created_at date is older than its
    // attached data source's data retention policy.
    public DeleteOlderThanRetention(): Promise<Result<boolean>> {
        return super.runAsTransaction(this.deleteDataOlderThanRetention());
    }

    // this sends all data staging records for a given data source and potentially a type mapping shape hashe to the queue to be
    // processed - this is mainly used in the reactive type mapping process
    public async SendToQueue(dataSourceID: string, shapehash?: string): Promise<Result<boolean>> {
        // now we stream process this part because we might have a large number of
        // records, and we really don't want to read that into memory - we also don't wait
        // for this to complete as it could take a night and a day
        const queue = await QueueFactory();
        void PostgresAdapter.Instance.Pool.connect((err, client, done) => {
            const stream = client.query(new QueryStream(this.listForQueue(dataSourceID, shapehash)));
            let putPromises: Promise<boolean>[] = [];

            class transform extends Transform {
                constructor() {
                    super({
                        objectMode: true,
                        transform(data: any, encoding: BufferEncoding, callback: TransformCallback) {
                            const staging = plainToClass(DataStaging, data as object);

                            putPromises.push(queue.Put(Config.process_queue, staging));

                            // check the buffer, await if needed
                            if (putPromises.length > 500) {
                                const buffer = [...putPromises];
                                putPromises = [];
                                void Promise.all(buffer)
                                    .catch((e) => {
                                        Logger.error(`error while awaiting put promises ${JSON.stringify(e)}`);
                                        callback(e, null);
                                    })
                                    .finally(() => {
                                        callback(null, staging);
                                    });
                            } else {
                                callback(null, staging);
                            }
                        },
                    });
                }
            }

            const emitterStream = new transform();

            emitterStream.on('end', () => {
                done();
            });

            emitterStream.on('error', (e: Error) => {
                Logger.error(`unexpected error in emitting records to processing thread ${JSON.stringify(e)}`);
            });

            stream.on('error', (e: Error) => {
                Logger.error(`unexpected error in emitting records to processing thread ${JSON.stringify(e)}`);
            });

            // we pipe to devnull because we need to trigger the stream and don't
            // care where the data ultimately ends up
            stream.pipe(emitterStream).pipe(devnull({objectMode: true}));
        });

        return Promise.resolve(Result.Success(true));
    }

    // we must also vacuum as part of the data retention delete, but you can't run vacuum as part of a transaction
    // so we pull it out into its own statement
    public Vacuum(): Promise<Result<boolean>> {
        return super.runStatement(this.vacuum());
    }

    private createStatement(...data: DataStaging[]): string {
        const text = `WITH results AS (INSERT INTO data_staging(
                         data_source_id,
                         import_id,
                         data,
                         shape_hash,
                         file_attached) VALUES %L RETURNING *) 
                    SELECT results.*, data_sources.container_id, data_sources.config as data_source_config
                    FROM results
                    LEFT JOIN data_sources ON results.data_source_id = data_sources.id`;
        const values = data.map((d) => [d.data_source_id, d.import_id, JSON.stringify(d.data), d.shape_hash, d.file_attached]);

        return format(text, values);
    }

    private fullUpdateStatement(...data: DataStaging[]): string {
        const text = `WITH results AS (UPDATE data_staging AS s SET
                         data_source_id = u.data_source_id::bigint,
                         import_id = u.import_id::bigint,
                         data = u.data::jsonb,
                         shape_hash = u.shape_hash::text
                        FROM(VALUES %L) AS u(id,data_source_id, import_id, data, shape_hash)
                        WHERE u.id::uuid = s.id RETURNING s.*)
                      SELECT results.*, data_sources.container_id, data_sources.config as data_source_config
                      FROM results
                               LEFT JOIN data_sources ON results.data_source_id = data_sources.id `;
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
            text: `SELECT data_staging.*, data_sources.container_id, data_sources.config as data_source_config
                   FROM data_staging
                   LEFT JOIN type_mappings ON type_mappings.shape_hash = data_staging.shape_hash
                                                AND type_mappings.data_source_id = data_staging.data_source_id
                   LEFT JOIN data_sources ON data_sources.id = data_staging.data_source_id
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

    private listForQueue(dataSourceID: string, shapehash?: string): string {
        if (!shapehash) {
            const text = `SELECT data_staging.*, data_sources.container_id, data_sources.config as data_source_config
                FROM data_staging
                    LEFT JOIN data_sources ON data_sources.id = data_staging.data_source_id
                WHERE data_staging.inserted_at IS NULL
                    AND data_staging.nodes_processed_at IS NULL
                    AND data_staging.edges_processed_at IS NULL
                    AND data_staging.data_source_id = $1 `;
            const values = [dataSourceID];

            return format(text, values);
        }

        const text = `SELECT data_staging.*, data_sources.container_id, data_sources.config as data_source_config
                FROM data_staging
                    LEFT JOIN data_sources ON data_sources.id = data_staging.data_source_id
                WHERE data_staging.inserted_at IS NULL
                    AND data_staging.nodes_processed_at IS NULL
                    AND data_staging.edges_processed_at IS NULL
                    AND data_staging.data_source_id = $1 
                    AND data_staging.shape_hash = $2 `;
        const values = [dataSourceID, shapehash];

        return format(text, values);
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

    private setInsertedMultipleStatement(ids: string[]): QueryConfig {
        return {
            text: format(`UPDATE data_staging SET inserted_at = NOW() WHERE id IN (%L)`, ids),
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

    private setMultipleErrorsStatement(ids: string[], errors: string[]): QueryConfig {
        return {
            text: format(`UPDATE data_staging SET errors = $1 WHERE id IN (%L)`, ids),
            values: [errors],
        };
    }

    private addErrorsStatement(id: string, error: string): QueryConfig {
        return {
            text: `UPDATE data_staging SET errors = array_append(errors, $1) WHERE id = $2`,
            values: [error, id],
        };
    }

    private addFile(stagingID: string, fileID: string): QueryConfig {
        return {
            text: `INSERT INTO data_staging_files(data_staging_id, file_id) VALUES ($1, $2)`,
            values: [stagingID, fileID],
        };
    }

    private addFileWithImport(importID: string, fileID: string): QueryConfig {
        return {
            text: `INSERT INTO data_staging_files(data_staging_id, file_id)
                    SELECT id, $1 FROM data_staging WHERE import_id = $2`,
            values: [fileID, importID],
        };
    }

    private removeFile(id: string, fileID: string): QueryConfig {
        return {
            text: `DELETE FROM data_staging_files WHERE data_staging_id = $1 AND file_id = $2`,
            values: [id, fileID],
        };
    }

    public listImportActiveMappingStatementNodes(importIDs: string[]): string {
        const text = `SELECT data_staging.*, data_sources.container_id, data_sources.config as data_source_config,
                (SELECT COUNT(*) FROM data_staging_files WHERE data_staging.id = data_staging_files.data_staging_id) as files_count
                FROM data_staging
                         LEFT JOIN type_mappings ON type_mappings.shape_hash = data_staging.shape_hash
                    AND type_mappings.data_source_id = data_staging.data_source_id
                         LEFT JOIN data_sources ON data_sources.id = data_staging.data_source_id
                WHERE (data_staging.import_id IN(%L)
                    AND data_staging.nodes_processed_at IS NULL 
                    AND data_staging.inserted_at IS NULL
                    AND (type_mappings.active IS TRUE
                        AND EXISTS
                             (SELECT * from type_mapping_transformations
                              WHERE type_mapping_transformations.type_mapping_id = type_mappings.id))) 
                              OR type_mappings.id IS NULL 
                              AND data_sources.container_id IS NOT NULL
                    ORDER BY data_staging.created_at ASC;`;

        const values = [...importIDs];

        return format(text, values);
    }

    public listImportActiveMappingStatementEdges(importIDs: string[]): string {
        const text = `SELECT data_staging.*, data_sources.container_id, data_sources.config as data_source_config,
                (SELECT COUNT(*) FROM data_staging_files WHERE data_staging.id = data_staging_files.data_staging_id) as files_count
                FROM data_staging
                         LEFT JOIN type_mappings ON type_mappings.shape_hash = data_staging.shape_hash
                    AND type_mappings.data_source_id = data_staging.data_source_id
                         LEFT JOIN data_sources ON data_sources.id = data_staging.data_source_id
                WHERE (data_staging.import_id IN(%L)
                    AND data_staging.edges_processed_at IS NULL
                    AND data_staging.inserted_at IS NULL
                    AND (type_mappings.active IS TRUE
                        AND EXISTS
                             (SELECT * from type_mapping_transformations
                              WHERE type_mapping_transformations.type_mapping_id = type_mappings.id))) 
                              OR type_mappings.id IS NULL 
                              AND data_sources.container_id IS NOT NULL
                    ORDER BY data_staging.created_at ASC;`;

        const values = [...importIDs];

        return format(text, values);
    }

    // this deletes all data staging records older than the attached data sources data retention period, this will
    // need to be updated with drop_chunks once we switch to timescale db - records without a data retention policy
    // config are treated as if they had choosen indefinite
    public deleteDataOlderThanRetention(): string {
        return `DELETE FROM data_staging 
                    WHERE id IN(
                        SELECT data_staging.id FROM data_staging 
                            LEFT JOIN data_sources ds ON ds.id = data_staging.data_source_id 
                        WHERE data_staging.created_at < NOW() - ((ds.config->>'data_retention_days') || ' days')::interval 
                        AND (ds.config->>'data_retention_days')::int > 0 
                        AND (ds.config->>'data_retention_days')::int IS NOT NULL)`;
    }

    private markNodesProcessed(importIDs: string[]): string {
        const text = `UPDATE data_staging SET nodes_processed_at = NOW() 
                      WHERE data_staging.id IN(SELECT data_staging_id FROM nodes WHERE nodes.import_data_id IN(%L) )`;
        const values = [...importIDs];

        return format(text, values);
    }

    private markEdgesProcessed(importIDs: string[]): string {
        const text = `UPDATE data_staging SET edges_processed_at = NOW() 
                      WHERE data_staging.id IN(SELECT data_staging_id FROM edges WHERE edges.import_data_id IN(%L) )`;
        const values = [...importIDs];

        return format(text, values);
    }

    // we have to vacuum manually if we're cleaning in order to free up space taken by dead tuples
    public vacuum(): string {
        return `VACUUM ${DataStagingMapper.tableName}`;
    }
}
