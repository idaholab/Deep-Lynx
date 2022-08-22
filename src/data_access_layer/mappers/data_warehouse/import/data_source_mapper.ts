import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import DataSourceRecord, {TimeseriesDataSourceConfig} from '../../../../domain_objects/data_warehouse/import/data_source';
import Event from '../../../../domain_objects/event_system/event';
import EventRepository from '../../../repositories/event_system/event_repository';
import {QueueFactory} from '../../../../services/queue/queue';
import PostgresAdapter from '../../db_adapters/postgres/postgres';
import QueryStream from 'pg-query-stream';
import {plainToClass} from 'class-transformer';
import {DataStaging} from '../../../../domain_objects/data_warehouse/import/import';
import Config from '../../../../services/config';

const format = require('pg-format');
const devnull = require('dev-null');

/*
    DataSourceMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class DataSourceMapper extends Mapper {
    public resultClass = DataSourceRecord;
    public static tableName = 'data_sources';

    private static instance: DataSourceMapper;

    private eventRepo = new EventRepository();

    public static get Instance(): DataSourceMapper {
        if (!DataSourceMapper.instance) {
            DataSourceMapper.instance = new DataSourceMapper();
        }

        return DataSourceMapper.instance;
    }

    public async Create(userID: string, input: DataSourceRecord, transaction?: PoolClient): Promise<Result<DataSourceRecord>> {
        const r = await super.run(this.createStatement(userID, input), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        this.eventRepo.emit(
            new Event({
                containerID: r.value[0].container_id,
                eventType: 'data_source_created',
                event: {dataSourceID: r.value[0].id},
            }),
        );

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Update(userID: string, input: DataSourceRecord, transaction?: PoolClient): Promise<Result<DataSourceRecord>> {
        const r = await super.run(this.fullUpdateStatement(userID, input), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        this.eventRepo.emit(
            new Event({
                containerID: r.value[0].container_id,
                eventType: 'data_source_modified',
                event: {dataSourceID: r.value[0].id},
            }),
        );

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public Retrieve(id: string): Promise<Result<DataSourceRecord>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass: this.resultClass});
    }

    public async IsActive(dataSourceID: string): Promise<Result<boolean>> {
        const count = await super.count(this.isActive(dataSourceID));

        return new Promise((resolve) => {
            if (count.isError) resolve(Result.Pass(count));

            if (count.value <= 0) resolve(Result.Success(false));

            resolve(Result.Success(true));
        });
    }

    public SetActive(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.setActiveStatement(id, userID));
    }

    public SetInactive(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.setInactiveStatement(id, userID));
    }

    public Archive(dataSourceID: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.archiveStatement(dataSourceID, userID));
    }

    public Delete(id: string): Promise<Result<boolean>> {
        void super.runStatement(this.deleteHypertableStatement(id));

        return super.runStatement(this.deleteStatement(id));
    }

    public DeleteWithData(id: string): Promise<Result<boolean>> {
        void super.runStatement(this.deleteHypertableStatement(id));

        return super.runAsTransaction(...this.deleteWithDataStatement(id));
    }

    public CreateHypertable(source: DataSourceRecord): Promise<Result<boolean>> {
        return super.runAsTransaction(...this.createHypertableStatement(source));
    }

    // InsertIntoHypertable takes an array of objects and inserts them into the supplied data source's hypertable if
    // the data source is a timeseries source. Records are parsed as JSON so that we can avoid having to use node
    // to make the connection between table name and property name included in the data source config
    public InsertIntoHypertable(source: DataSourceRecord, records: any[]): Promise<Result<boolean>> {
        return super.runStatement(this.insertIntoHypertableStatement(source, records));
    }

    // Reprocess takes a data source and will remove all previous data ingested by it, then attempt
    // to queue up all data it's received in the past for reprocessing. Generally used by someone who
    // has made changes to the ontology and mappings, this insures the data they have in the system
    // is the latest
    public async ReprocessDataSource(dataSourceID: string): Promise<Result<boolean>> {
        // first we delete the old nodes/edges - don't wait though, the sql handles not deleting
        // any records created after the time you start this statement
        void super.runAsTransaction(...this.deleteDataStatement(dataSourceID));

        // now we stream process this part because a data source might have a large number of
        // records and we really don't want to read that into memory - we also don't wait
        // for this to complete as it could take a night and a day
        const queue = await QueueFactory();
        void PostgresAdapter.Instance.Pool.connect((err, client, done) => {
            const stream = client.query(new QueryStream(this.listStagingForSourceStreaming(dataSourceID)));

            stream.on('data', (data) => {
                void queue.Put(Config.process_queue, plainToClass(DataStaging, data as object));
            });

            stream.on('end', () => done());

            // we pipe to devnull because we need to trigger the stream and don't
            // care where the data ultimately ends up
            stream.pipe(devnull({objectMode: true}));
        });

        return Promise.resolve(Result.Success(true));
    }

    public async SetStatus(
        dataSourceID: string,
        userID: string,
        status: 'ready' | 'polling' | 'error',
        message?: string,
        transaction?: PoolClient,
    ): Promise<Result<boolean>> {
        return super.runStatement(this.setStatusStatement(dataSourceID, userID, status, message), {transaction});
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...sources: DataSourceRecord[]): string {
        const text = `INSERT INTO data_sources(
            container_id ,
            adapter_type,
            config,
            active,
            data_format,
            name,
            created_by,
            modified_by) VALUES %L RETURNING *`;
        const values = sources.map((source) => [
            source.container_id,
            source.adapter_type,
            source.config,
            source.active,
            source.data_format,
            source.name,
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...sources: DataSourceRecord[]): string {
        const text = `UPDATE data_sources AS d SET
                         container_id = u.container_id::bigint,
                         adapter_type = u.adapter_type,
                         config = u.config::jsonb,
                         active = u.active::boolean,
                         name = u.name,
                         data_format = u.data_format,
                         modified_by = u.modified_by,
                         modified_at = NOW()
                      FROM(VALUES %L) as u(
                          id,
                          container_id,
                          adapter_type,
                          config,
                          active,
                          name,
                          data_format,
                          modified_by)
                      WHERE u.id::bigint = d.id RETURNING d.*`;
        const values = sources.map((source) => [
            source.id,
            source.container_id,
            source.adapter_type,
            source.config,
            source.active,
            source.name,
            source.data_format,
            userID,
        ]);

        return format(text, values);
    }

    private retrieveStatement(dataSourceID: string): QueryConfig {
        return {
            text: `SELECT * FROM data_sources WHERE id = $1`,
            values: [dataSourceID],
        };
    }

    private deleteStatement(dataSourceID: string): QueryConfig {
        return {
            text: `DELETE FROM data_sources WHERE id = $1`,
            values: [dataSourceID],
        };
    }

    // allows us to delete all the data associated with this DataSource prior to
    // removing it. This only applies to nodes and edges which do not cascade
    // delete when source is removed
    private deleteWithDataStatement(dataSourceID: string): QueryConfig[] {
        return [
            {
                text: `DELETE FROM nodes WHERE data_source_id = $1`,
                values: [dataSourceID],
            },
            {
                text: `DELETE FROM edges WHERE data_source_id = $1`,
                values: [dataSourceID],
            },
            {
                text: `DELETE FROM data_sources WHERE id = $1`,
                values: [dataSourceID],
            },
        ];
    }

    private deleteDataStatement(dataSourceID: string): QueryConfig[] {
        // reminder that we don't actually delete nodes or edges, we just set the deleted_at fields accordingly
        // we also make sure we're only deleting nodes/edges from this import previous to this time so we don't
        // accidentally delete any records in process (in case this is from reprocessing an import)
        return [
            {
                text: `UPDATE nodes SET deleted_at = NOW() WHERE deleted_at IS NULL AND data_source_id = $1 AND created_at < NOW() `,
                values: [dataSourceID],
            },
            {
                text: `UPDATE edges SET deleted_at = NOW() WHERE deleted_at IS NULL AND data_source_id = $1 AND created_at < NOW()`,
                values: [dataSourceID],
            },
        ];
    }

    private setActiveStatement(dataSourceID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE data_sources SET active = true, modified_at = NOW(), modified_by = $2 WHERE id = $1`,
            values: [dataSourceID, userID],
        };
    }

    private setInactiveStatement(dataSourceID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE data_sources SET active = false, modified_at = NOW(), modified_by = $2 WHERE id = $1`,
            values: [dataSourceID, userID],
        };
    }

    private isActive(dataSourceID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM data_sources WHERE active = TRUE AND id = $1`,
            values: [dataSourceID],
        };
    }

    private archiveStatement(dataSourceID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE data_sources SET archived = true, active = false, modified_by = $2, modified_at = NOW() WHERE id = $1`,
            values: [dataSourceID, userID],
        };
    }

    private setStatusStatement(id: string, userID: string, status: 'ready' | 'polling' | 'error', message?: string): QueryConfig {
        return {
            text: `UPDATE data_sources SET status = $2, status_message = $3, modified_at = NOW(), modified_by = $4 WHERE id = $1`,
            values: [id, status, message, userID],
        };
    }

    // should only be used with a streaming query so as not to swamp memory
    public listAllActiveStatement(): string {
        return `SELECT * FROM data_sources WHERE active IS TRUE`;
    }

    // we're only pulling the ID here because that's all we need for the re-queue process, we
    // don't want to read the data in needlessly
    private listStagingForSourceStreaming(dataSourceID: string): string {
        return format(`SELECT data_staging.* FROM data_staging WHERE data_source_id = %L`, dataSourceID);
    }

    private createHypertableStatement(source: DataSourceRecord): QueryConfig[] {
        let primaryTimestampColumnName = '';
        const columns = (source.config as TimeseriesDataSourceConfig).columns;
        const columnStatements: string[] = columns.map((column) => {
            if (column.is_primary_timestamp) {
                primaryTimestampColumnName = column.column_name!;
            }
            // this determines the data type of the column to be created
            let type = 'text';

            switch (column.type) {
                case undefined: {
                    type = 'text';
                    break;
                }

                case 'number': {
                    // must be a bigint if primary timestamp
                    if (column.is_primary_timestamp) {
                        type = 'bigint';
                    } else {
                        type = 'integer';
                    }
                    break;
                }

                case 'number64': {
                    type = 'bigint';
                    break;
                }

                case 'float': {
                    type = 'numeric';
                    break;
                }
                case 'float64': {
                    type = 'numeric';
                    break;
                }

                case 'date': {
                    type = 'timestamp';
                    break;
                }

                case 'boolean': {
                    type = 'boolean';
                    break;
                }
            }

            return format('%I %I DEFAULT NULL', column.column_name, type);
        });

        const createStatement = format(
            `CREATE TABLE IF NOT EXISTS %I (
                ${columnStatements.join(',')},
                _nodes bigint[] DEFAULT NULL,
                _metadata jsonb DEFAULT NULL
                )`,
            'y_' + source.id!,
        );

        const statements: QueryConfig[] = [
            {
                text: format(`DROP TABLE IF EXISTS %s`, 'y_' + source.id!),
            },
            {
                text: createStatement,
            },
        ];

        if ((source.config as TimeseriesDataSourceConfig).chunk_interval) {
            statements.push({
                text: format(
                    `SELECT create_hypertable(%L, %L, chunk_time_interval => %L::integer)`,
                    'y_' + source.id!,
                    primaryTimestampColumnName,
                    (source.config as TimeseriesDataSourceConfig).chunk_interval,
                ),
            });
        } else {
            statements.push({
                text: format(`SELECT create_hypertable(%L, %L)`, 'y_' + source.id!, primaryTimestampColumnName),
            });
        }

        if (columns.filter((c) => c.unique).length > 0) {
            const unique_names = columns.filter((c) => c.unique).map((c) => c.column_name) as string[];
            statements.push({
                text: format(
                    `CREATE UNIQUE INDEX idx_${source.id!}_${unique_names.join('_')} ON y_${source.id!}(${
                        columns.find((c) => c.is_primary_timestamp)?.column_name
                    },${unique_names.join(',')});`,
                ),
            });
        }

        return statements;
    }

    private deleteHypertableStatement(sourceID: string): string {
        const text = `DROP TABLE IF EXISTS %s`;
        const values = ['y_' + sourceID];

        return format(text, values);
    }

    // this will break an array of objects into a json string and insert it into the statement
    // this builds a recordset based on the json, doing an INSERT INTO...SELECT into the proper
    // hypertable, making the connection between the property name and column name which may be different
    private insertIntoHypertableStatement(source: DataSourceRecord, records: any[]): string {
        const config = source.config as TimeseriesDataSourceConfig;

        const statements: string[] = [`INSERT INTO y_${source.id}(${config.columns.map((c) => c.column_name).join(',')})`, `SELECT `];

        const columns: string[] = [];
        config.columns.forEach((c) => {
            if (c.type === 'date') {
                if (!c.date_conversion_format_string) c.date_conversion_format_string = 'YYYY-MM-DD HH24:MI:SS.US';
                columns.push(format(`to_timestamp(i."%s", %L) as %I`, c.property_name, c.date_conversion_format_string, c.column_name));
            } else {
                columns.push(format(`i."%s" as %I`, c.property_name, c.column_name));
            }
        });

        statements.push(columns.join(','));

        statements.push(`FROM json_to_recordset(%L) AS i(`);

        const recordColumns: string[] = [];
        config.columns.forEach((c) => {
            let typeCast = 'text';

            switch (c.type) {
                case undefined: {
                    typeCast = 'text';
                    break;
                }

                case 'number': {
                    typeCast = 'integer';
                    break;
                }

                case 'number64': {
                    typeCast = 'bigint';
                    break;
                }

                case 'float': {
                    typeCast = 'numeric';
                    break;
                }
                case 'float64': {
                    typeCast = 'numeric';
                    break;
                }

                case 'date': {
                    typeCast = 'text'; // must be text, so we can format the timestamp for postgres correctly
                    break;
                }

                case 'boolean': {
                    typeCast = 'boolean';
                    break;
                }

                case 'json': {
                    typeCast = 'json';
                    break;
                }
            }

            recordColumns.push(format(`"%s" %I`, c.property_name, typeCast));
        });

        statements.push(recordColumns.join(','));
        statements.push(')');

        const values = JSON.stringify(records, (key, value) => {
            if (value !== null && value !== '') return value; // handles null values and empty strings from csv
        });

        // if this array contains more than the primary timestampe, include the ON CONFLICT clause
        const uniqueConstraints = config.columns.filter((c) => c.is_primary_timestamp || c.unique).map((c) => c.column_name);
        if (uniqueConstraints.length > 1) {
            statements.push(format(`ON CONFLICT (%s) DO NOTHING`, uniqueConstraints));
        }

        statements.push(';');
        return format(statements.join(' '), values);
    }
}
