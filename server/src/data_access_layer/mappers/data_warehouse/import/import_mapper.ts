import Mapper from '../../mapper';
import Result from '../../../../common_classes/result';
import {PoolClient, QueryConfig} from 'pg';
import Event from '../../../../domain_objects/event_system/event';
import Import from '../../../../domain_objects/data_warehouse/import/import';
import EventRepository from '../../../repositories/event_system/event_repository';
import DataStagingMapper from './data_staging_mapper';
import DataSourceRepository from '../../../repositories/data_warehouse/import/data_source_repository';
import {Worker} from 'worker_threads';
import Config from '../../../../services/config';

const format = require('pg-format');

/*
    ImportMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class ImportMapper extends Mapper {
    public resultClass = Import;
    public static tableName = 'imports';
    private static instance: ImportMapper;

    private eventRepo = new EventRepository();

    public static get Instance(): ImportMapper {
        if (!ImportMapper.instance) {
            ImportMapper.instance = new ImportMapper();
        }

        return ImportMapper.instance;
    }

    public async CreateImport(userID: string, importRecord: Import, transaction?: PoolClient): Promise<Result<Import>> {
        const r = await super.run(this.createStatement(userID, importRecord), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        const dataSourceRepo = new DataSourceRepository();
        const datasource = await dataSourceRepo.findByID(importRecord.data_source_id!);

        this.eventRepo.emit(
            new Event({
                containerID: datasource.value.DataSourceRecord?.container_id,
                dataSourceID: importRecord.data_source_id,
                eventType: 'data_imported',
                event: {
                    imports: r.value,
                },
            }),
        );

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public Retrieve(id: string, transaction?: PoolClient): Promise<Result<Import>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass: this.resultClass, transaction});
    }

    // client is not optional here as the lock only applies if your call is in the
    // context of a transaction
    public RetrieveAndLock(id: string, transaction: PoolClient, wait?: boolean): Promise<Result<Import>> {
        return super.retrieve(this.retrieveLockStatement(id, wait), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    // client is not optional here as the lock only applies if your call is in the
    // context of a transaction
    public RetrieveLastAndLock(dataSourceID: string, transaction: PoolClient): Promise<Result<Import>> {
        return super.retrieve(this.retrieveLastAndLockStatement(dataSourceID), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public RetrieveLast(dataSourceID: string): Promise<Result<Import>> {
        return super.retrieve(this.retrieveLastStatement(dataSourceID), {
            resultClass: this.resultClass,
        });
    }

    public async SetStatus(
        importID: string,
        status: 'ready' | 'processing' | 'error' | 'stopped' | 'completed',
        message?: string,
        transaction?: PoolClient,
    ): Promise<Result<boolean>> {
        if (status === 'completed' || status === 'stopped') {
            const completeImport = await this.Retrieve(importID);

            this.eventRepo.emit(
                new Event({
                    dataSourceID: completeImport.value.data_source_id,
                    eventType: 'data_ingested',
                    event: {
                        import_id: importID,
                        status,
                    },
                }),
            );
        }
        return super.runStatement(this.setStatusStatement(importID, status, message), {transaction});
    }

    // list all imports which have data with an inserted status - while we used to check status of the import,
    // checking for inserted records is a far better method when attempting to gauge if an import still needs processed
    // note: this will always list in the order the imports were received - and grouped by container_id
    public async ListWithUninsertedData(transaction?: PoolClient, excludeContainers?: string[]): Promise<Result<Import[]>> {
        return super.rows(this.listWithUninsertedDataStatement(Config.max_import_retries, excludeContainers), {resultClass: this.resultClass, transaction});
    }

    public async ReleaseLock(containerID: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.unlockStatement(containerID), {resultClass: this.resultClass, transaction});
    }

    public async Count(): Promise<Result<number>> {
        return super.count(this.countStatement());
    }

    // returns true if any imports exist for supplied data source
    public async ExistForDataSource(datasourceID: string): Promise<Result<boolean>> {
        const result = await super.count(this.existForDataSourceStatement(datasourceID));
        if (result.isError) return Promise.resolve(Result.Pass(result));

        return Promise.resolve(Result.Success(result.value > 0));
    }

    public async Delete(importID: string, withData?: boolean): Promise<Result<boolean>> {
        if (withData) {
            return super.runAsTransaction(...this.deleteStatementWithData(importID));
        }
        return super.runStatement(this.deleteStatement(importID));
    }

    // Reprocess an import will take an importID and attempt to first clear all data processed
    // from it by setting the deleted_at tag of any nodes or edges that have been created. Then
    // it will start a new process worker with the provided import
    public async ReprocessImport(containerID: string, importID: string, first_process?: boolean): Promise<Result<boolean>> {
        const processType = first_process ? 'processing' : 'reprocessing'
        await this.SetStatus(importID, 'processing', `${processType} intiated`);
        await super.runAsTransaction(...this.deleteDataStatement(importID));
        await super.runStatement(this.setProcessedNull(importID));

        // now we start the import process job in the background
        const worker = new Worker(__dirname + '../../../../../jobs/process_worker.js', {
            workerData: {
                input: {
                    importIDs: [importID],
                    containerID,
                },
            },
        });

        worker.on('error', (e) => {
            this.setStatusStatement(importID, 'error', `error in ${processType} ${JSON.stringify(e)}`);
        });

        worker.on('exit', () => {
            void this.SetStatus(importID, 'completed', `${processType} completed`);
        });

        return Promise.resolve(Result.Success(true));
    }

    public async SetProcessStart(start: Date, ...importIDs: string[]): Promise<Result<boolean>> {
        return super.runStatement(this.setProcessStartStatement(importIDs));
    }

    public async SetProcessEnd(end: Date, ...importIDs: string[]): Promise<Result<boolean>> {
        return super.runStatement(this.setProcessEndStatement(importIDs));
    }

    public async IncrementAttempts(...importIDs: string[]): Promise<Result<boolean>> {
        return super.runStatement(this.incrementAttempts(importIDs));
    }

    private setProcessedNull(importID: string): QueryConfig {
        return {
            text: `UPDATE ${DataStagingMapper.tableName}
                   SET inserted_at        = NULL,
                       nodes_processed_at = NULL,
                       edges_processed_at = NULL
                   WHERE import_id = $1`,
            values: [importID],
        };
    }

    // can only allow deletes on unprocessed imports
    private deleteStatement(importID: string): QueryConfig {
        return {
            text: `DELETE
                   FROM imports
                   WHERE id = $1`,
            values: [importID],
        };
    }

    private deleteStatementWithData(importID: string): QueryConfig[] {
        // reminder that we don't actually delete nodes or edges, we just set the deleted_at fields accordingly
        return [
            {
                text: `DELETE
                       FROM nodes
                       WHERE import_data_id = $1`,
                values: [importID],
            },
            {
                text: `DELETE
                       FROM edges
                       WHERE import_data_id = $1`,
                values: [importID],
            },
            {
                text: `DELETE
                       FROM imports
                       WHERE id = $1`,
                values: [importID],
            },
        ];
    }

    private deleteDataStatement(importID: string): QueryConfig[] {
        // reminder that we don't actually delete nodes or edges, we just set the deleted_at fields accordingly
        // we also make sure we're only deleting nodes/edges from this import previous to this time so we don't
        // accidentally delete any records in process (in case this is from reprocessing an import)
        return [
            {
                text: `DELETE
                       FROM nodes
                       WHERE import_data_id = $1
                         AND created_at < NOW() `,
                values: [importID],
            },
            {
                text: `DELETE
                       FROM edges
                       WHERE import_data_id = $1
                         AND created_at < NOW()`,
                values: [importID],
            },
        ];
    }

    private createStatement(userID: string, ...imports: Import[]): string {
        const text = `INSERT INTO imports(data_source_id,
                                          reference,
                                          created_by,
                                          modified_by)
                      VALUES %L RETURNING *`;
        const values = imports.map((i) => [i.data_source_id, i.reference, userID, userID]);

        return format(text, values);
    }

    // we're only pulling the ID here because that's all we need for the re-queue process, we
    // don't want to read the data in needlessly
    private listStagingForImportStreaming(importID: string): string {
        return format(
            `SELECT data_staging.*, data_sources.container_id, data_sources.config as data_source_config
             FROM data_staging
                      LEFT JOIN type_mappings ON type_mappings.shape_hash = data_staging.shape_hash
                 AND type_mappings.data_source_id = data_staging.data_source_id
                      LEFT JOIN data_sources ON data_sources.id = data_staging.data_source_id
             WHERE import_id = %L`,
            importID,
        );
    }

    private retrieveStatement(logID: string): QueryConfig {
        return {
            text: `SELECT imports.*,
                          SUM(CASE
                                  WHEN (data_staging.inserted_at IS NOT NULL
                                      OR data_staging.nodes_processed_at IS NOT NULL
                                      OR data_staging.edges_processed_at IS NOT NULL)
                                      AND data_staging.import_id = imports.id
                                      THEN 1
                                  ELSE 0 END)                                                  AS records_inserted,
                          SUM(CASE WHEN data_staging.import_id = imports.id THEN 1 ELSE 0 END) as total_records
                   FROM imports
                            LEFT JOIN data_staging ON data_staging.import_id = imports.id
                   WHERE imports.id = $1
                   GROUP BY imports.id`,
            values: [logID],
        };
    }

    private retrieveLockStatement(logID: string, wait?: boolean): QueryConfig {
        if (wait) {
            return {
                text: `SELECT *
                       FROM imports
                       WHERE id = $1 FOR UPDATE`,
                values: [logID],
            };
        }

        return {
            text: `SELECT *
                   FROM imports
                   WHERE id = $1 FOR UPDATE NOWAIT`,
            values: [logID],
        };
    }

    private retrieveLastStatement(logID: string): QueryConfig {
        return {
            text: `SELECT *
                   FROM imports
                   WHERE data_source_id = $1
                   ORDER BY modified_at DESC NULLS LAST LIMIT 1`,
            values: [logID],
        };
    }

    private retrieveLastAndLockStatement(logID: string): QueryConfig {
        return {
            text: `SELECT *
                   FROM imports
                   WHERE data_source_id = $1
                   ORDER BY modified_at DESC NULLS LAST LIMIT 1 FOR NO KEY
            UPDATE NOWAIT `,
            values: [logID],
        };
    }

    private setStatusStatement(id: string, status: 'ready' | 'processing' | 'error' | 'stopped' | 'completed', message?: string): QueryConfig {
        return {
            text: `UPDATE imports
                   SET status         = $2,
                       status_message = $3,
                       modified_at    = NOW()
                   WHERE id = $1`,
            values: [id, status, message],
        };
    }

    public unlockStatement(containerID: string): QueryConfig {
        return {
            text: `SELECT pg_advisory_unlock(%1)`,
            values: [containerID],
        };
    }

    public listWithUninsertedDataStatement(maxAttempts: number, excludeContainers?: string[]): QueryConfig {
        // we have to use the advisory lock at the session level so that clustered deeplynx doesn't start multiple
        // process threads for the same container
        if (excludeContainers && excludeContainers.length > 0) {
            const text = `SELECT imports.*,
                                 data_sources.container_id,
                                 SUM(CASE
                                         WHEN (data_staging.inserted_at IS NOT NULL
                                             OR data_staging.nodes_processed_at IS NOT NULL
                                             OR data_staging.edges_processed_at IS NOT NULL)
                                             AND data_staging.import_id = imports.id
                                             THEN 1
                                         ELSE 0 END)                                                  AS records_inserted,
                                 SUM(CASE WHEN data_staging.import_id = imports.id THEN 1 ELSE 0 END) as total_records
                          FROM imports
                                   LEFT JOIN data_staging ON data_staging.import_id = imports.id
                                   LEFT JOIN data_sources ON data_sources.id = imports.data_source_id
                          WHERE EXISTS (SELECT *
                                        FROM data_staging
                                        WHERE data_staging.import_id = imports.id
                                          AND data_staging.inserted_at IS NULL
                                          AND data_staging.nodes_processed_at IS NULL
                                          AND data_staging.edges_processed_at IS NULL)
                            AND EXISTS(SELECT * FROM data_staging WHERE data_staging.import_id = imports.id)
                            AND data_sources.container_id NOT IN (%L)
                            AND imports.attempts < %L
                          GROUP BY imports.id, container_id
                          ORDER BY imports.created_at ASC
            `;

            const values = [excludeContainers, maxAttempts];

            return format(text, values);
        } else {
            const text = `SELECT imports.*,
                                 data_sources.container_id,
                                 SUM(CASE
                                         WHEN (data_staging.inserted_at IS NOT NULL
                                             OR data_staging.nodes_processed_at IS NOT NULL
                                             OR data_staging.edges_processed_at IS NOT NULL)
                                             AND data_staging.import_id = imports.id
                                             THEN 1
                                         ELSE 0 END)                                                  AS records_inserted,
                                 SUM(CASE WHEN data_staging.import_id = imports.id THEN 1 ELSE 0 END) as total_records
                          FROM imports
                                   LEFT JOIN data_staging ON data_staging.import_id = imports.id
                                   LEFT JOIN data_sources ON data_sources.id = imports.data_source_id
                          WHERE EXISTS (SELECT *
                                        FROM data_staging
                                        WHERE data_staging.import_id = imports.id
                                          AND data_staging.inserted_at IS NULL
                                          AND data_staging.nodes_processed_at IS NULL
                                          AND data_staging.edges_processed_at IS NULL)
                            AND EXISTS(SELECT * FROM data_staging WHERE data_staging.import_id = imports.id)
                            AND imports.attempts < %L
                          GROUP BY imports.id, container_id
                          ORDER BY imports.created_at ASC
            `;

            const values = [maxAttempts];

            return format(text, values);
        }
    }

    private countStatement(): QueryConfig {
        return {
            text: `SELECT COUNT(*)
                   FROM imports`,
        };
    }

    // this allows us to run a fast check to see if a data source has any imports
    // prior to deletion - users must force delete a data source if any imports
    // exist for it
    private existForDataSourceStatement(datasourceID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*)
                   FROM imports
                   WHERE data_source_id = $1 LIMIT 1`,
            values: [datasourceID],
        };
    }

    private setProcessStartStatement(importIDs: string[]): string {
        const text = `UPDATE imports
                      SET process_start = NOW()
                      WHERE id IN (%L)`;
        const values = [...importIDs];

        return format(text, values);
    }

    private setProcessEndStatement(importIDs: string[]): string {
        const text = `UPDATE imports
                      SET process_end= NOW()
                      WHERE id IN (%L)`;
        const values = [...importIDs];

        return format(text, values);
    }

    private incrementAttempts(importIDs: string[]): string {
        const text = `UPDATE imports
                      SET attempts = attempts + 1
                      WHERE id IN (%L)`;
        const values = [...importIDs];
        return format(text, values);
    }
}
