import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import DataSourceRecord from '../../../../data_warehouse/import/data_source';
import uuid from 'uuid';
import {QueueProcessor} from '../../../../event_system/processor';
import Event from '../../../../event_system/event';

const format = require('pg-format');
const resultClass = DataSourceRecord;

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
    public static tableName = 'data_sources';

    private static instance: DataSourceMapper;

    public static get Instance(): DataSourceMapper {
        if (!DataSourceMapper.instance) {
            DataSourceMapper.instance = new DataSourceMapper();
        }

        return DataSourceMapper.instance;
    }

    public async Create(userID: string, input: DataSourceRecord, transaction?: PoolClient): Promise<Result<DataSourceRecord>> {
        const r = await super.run(this.createStatement(userID, input), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        QueueProcessor.Instance.emit(
            new Event({
                sourceID: r.value[0].container_id!,
                sourceType: 'container',
                type: 'data_source_created',
                data: r.value[0].id!,
            }),
        );

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Update(userID: string, input: DataSourceRecord, transaction?: PoolClient): Promise<Result<DataSourceRecord>> {
        const r = await super.run(this.fullUpdateStatement(userID, input), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        QueueProcessor.Instance.emit(
            new Event({
                sourceID: r.value[0].container_id!,
                sourceType: 'container',
                type: 'data_source_modified',
                data: r.value[0].id!,
            }),
        );

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public Retrieve(id: string): Promise<Result<DataSourceRecord>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass});
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
        return super.runStatement(this.deleteStatement(id));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...sources: DataSourceRecord[]): string {
        const text = `INSERT INTO data_sources(
            id,
            container_id ,
            adapter_type,
            config,
            active,
            data_format,
            name,
            created_by,
            modified_by) VALUES %L RETURNING *`;
        const values = sources.map((source) => [
            uuid.v4(),
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
                         container_id = u.container_id::uuid,
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
                      WHERE u.id::uuid = d.id RETURNING d.*`;
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

    private retrieveStatement(exportID: string): QueryConfig {
        return {
            text: `SELECT * FROM data_sources WHERE id = $1`,
            values: [exportID],
        };
    }

    private deleteStatement(exportID: string): QueryConfig {
        return {
            text: `DELETE FROM data_sources WHERE id = $1`,
            values: [exportID],
        };
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
            text: `UPDATE data_sources SET archived = true, active = false, modified_by = $2 WHERE id = $1`,
            values: [dataSourceID, userID],
        };
    }
}
