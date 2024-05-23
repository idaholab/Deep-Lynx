import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import DataTargetRecord from '../../../../domain_objects/data_warehouse/export/data_target';
import Event from '../../../../domain_objects/event_system/event';
import EventRepository from '../../../repositories/event_system/event_repository';

const format = require('pg-format');

/*
    DataTargetMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class DataTargetMapper extends Mapper {
    public resultClass = DataTargetRecord;
    public static tableName = 'data_targets';

    private static instance: DataTargetMapper;

    private eventRepo = new EventRepository();

    public static get Instance(): DataTargetMapper {
        if (!DataTargetMapper.instance) {
            DataTargetMapper.instance = new DataTargetMapper();
        }

        return DataTargetMapper.instance;
    }

    public async Create(userID: string, input: DataTargetRecord, transaction?: PoolClient): Promise<Result<DataTargetRecord>> {
        const r = await super.run(this.createStatement(userID, input), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) {
            return Promise.resolve(Result.Pass(r));
        }

        this.eventRepo.emit(
            new Event({
                containerID: r.value[0].container_id,
                eventType: 'data_target_created',
                event: {dataTargetID: r.value[0].id},
            }),
        );

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Update(userID: string, input: DataTargetRecord, transaction?: PoolClient): Promise<Result<DataTargetRecord>> {
        const r = await super.run(this.fullUpdateStatement(userID, input), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) {
            return Promise.resolve(Result.Pass(r));
        }

        this.eventRepo.emit(
            new Event({
                containerID: r.value[0].container_id,
                eventType: 'data_target_modified',
                event: {dataTargetID: r.value[0].id},
            }),
        );

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public Retrieve(id: string): Promise<Result<DataTargetRecord>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass: this.resultClass});
    }

    public async IsActive(dataTargetID: string): Promise<Result<boolean>> {
        const count = await super.count(this.isActive(dataTargetID));

        return new Promise((resolve) => {
            if (count.isError) {
                resolve(Result.Pass(count));
            }

            if (count.value <= 0) {
                resolve(Result.Success(false));
            }

            resolve(Result.Success(true));
        });
    }

    public SetActive(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.setActiveStatement(id, userID));
    }

    public SetInactive(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.setInactiveStatement(id, userID));
    }

    public SetLastRunAt(dataTargetID: string): Promise<Result<boolean>> {
        return super.runStatement(this.setLastRunAt(dataTargetID));
    }

    public Archive(dataTargetID: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.archiveStatement(dataTargetID, userID));
    }

    public Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    public async SetStatus(
        dataTargetID: string,
        userID: string,
        status: 'ready' | 'polling' | 'error',
        message?: string,
        transaction?: PoolClient,
    ): Promise<Result<boolean>> {
        return super.runStatement(this.setStatusStatement(dataTargetID, userID, status, message), {transaction});
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...targets: DataTargetRecord[]): string {
        const text = `INSERT INTO data_targets(
            container_id,
            adapter_type,
            config,
            active,
            data_format,
            name,
            created_by,
            modified_by) VALUES %L RETURNING *`;
        const values = targets.map((target) => [
            target.container_id,
            target.adapter_type,
            target.config,
            target.active,
            target.data_format,
            target.name,
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...targets: DataTargetRecord[]): string {
        const text = `UPDATE data_targets AS d SET
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
        const values = targets.map((target) => [
            target.id,
            target.container_id,
            target.adapter_type,
            target.config,
            target.active,
            target.name,
            target.data_format,
            userID,
        ]);

        return format(text, values);
    }

    private retrieveStatement(dataTargetID: string): QueryConfig {
        return {
            text: `SELECT * FROM data_targets WHERE id = $1`,
            values: [dataTargetID],
        };
    }

    private deleteStatement(dataTargetID: string): QueryConfig {
        return {
            text: `DELETE FROM data_targets WHERE id = $1`,
            values: [dataTargetID],
        };
    }

    private setActiveStatement(dataTargetID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE data_targets SET active = true, modified_at = NOW(), modified_by = $2 WHERE id = $1`,
            values: [dataTargetID, userID],
        };
    }

    private setInactiveStatement(dataTargetID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE data_targets SET active = false, modified_at = NOW(), modified_by = $2 WHERE id = $1`,
            values: [dataTargetID, userID],
        };
    }

    private isActive(dataTargetID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM data_targets WHERE active = TRUE AND id = $1`,
            values: [dataTargetID],
        };
    }

    private archiveStatement(dataTargetID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE data_targets SET archived = true, active = false, modified_by = $2, modified_at = NOW() WHERE id = $1`,
            values: [dataTargetID, userID],
        };
    }

    private setStatusStatement(id: string, userID: string, status: 'ready' | 'polling' | 'error', message?: string): QueryConfig {
        return {
            text: `UPDATE data_targets SET status = $2, status_message = $3, modified_at = NOW(), modified_by = $4 WHERE id = $1`,
            values: [id, status, message, userID],
        };
    }

    private setLastRunAt(dataTargetID: string): QueryConfig {
        return {
            text: `UPDATE data_targets SET last_run_at = NOW() WHERE id = $1`,
            values: [dataTargetID],
        };
    }

    // should only be used with a streaming query so as not to swamp memory
    public listAllActiveStatement(): string {
        return `SELECT * FROM data_targets WHERE active IS TRUE`;
    }
}
