import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Event from '../../../../domain_objects/event_system/event';
import ExportRecord from '../../../../domain_objects/data_warehouse/export/export';
import EventRepository from '../../../repositories/event_system/event_repository';

const format = require('pg-format');
const resultClass = ExportRecord;

/*
    ExportMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class ExportMapper extends Mapper {
    public static tableName = 'exports';

    private static instance: ExportMapper;

    private eventRepo = new EventRepository();

    public static get Instance(): ExportMapper {
        if (!ExportMapper.instance) {
            ExportMapper.instance = new ExportMapper();
        }

        return ExportMapper.instance;
    }

    public async Create(userID: string, input: ExportRecord, transaction?: PoolClient): Promise<Result<ExportRecord>> {
        const r = await super.run(this.createStatement(userID, input), {
            resultClass,
            transaction,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, input: ExportRecord[], transaction?: PoolClient): Promise<Result<ExportRecord[]>> {
        return super.run(this.createStatement(userID, ...input), {
            resultClass,
            transaction,
        });
    }

    public async Update(userID: string, input: ExportRecord, transaction?: PoolClient): Promise<Result<ExportRecord>> {
        const r = await super.run(this.fullUpdateStatement(userID, input), {
            resultClass,
            transaction,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(userID: string, input: ExportRecord[], transaction?: PoolClient): Promise<Result<ExportRecord[]>> {
        return super.run(this.fullUpdateStatement(userID, ...input), {
            resultClass,
            transaction,
        });
    }

    public Retrieve(id: string): Promise<Result<ExportRecord>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass});
    }

    public Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    public async SetStatus(
        userID: string,
        id: string,
        status: 'created' | 'processing' | 'paused' | 'completed' | 'failed',
        message?: string,
    ): Promise<Result<boolean>> {
        if (status === 'completed') {
            const completeExport = await this.Retrieve(id);
            this.eventRepo.emit(
                new Event({
                    containerID: completeExport.value.container_id,
                    eventType: 'data_exported',
                    event: completeExport.value,
                }),
            );
        }

        return super.runStatement(this.setStatusStatement(userID, id, status, message));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...exports: ExportRecord[]): string {
        const text = `INSERT INTO exports(
            container_id,
            adapter,
            status,
            config,
            status_message,
            destination_type,
            created_by,
            modified_by) VALUES %L RETURNING *`;
        const values = exports.map((exp) => [
            exp.container_id,
            exp.adapter,
            exp.status,
            JSON.stringify(exp.config),
            exp.status_message,
            exp.destination_type,
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...exports: ExportRecord[]): string {
        const text = `UPDATE exports AS e SET
                    container_id = u.container_id::bigint,
                    adapter = u.adapter,
                    status = u.status,
                    config = u.config::jsonb,
                    status_message = u.status_message,
                    destination_type = u.destination_type,
                    modified_at = NOW(),
                    modified_by = u.modified_by
                      FROM(VALUES %L) AS u(
                          id,
                          container_id,
                          adapter,
                          status,
                          config,
                          status_message,
                          destination_type,
                          modified_by)
                      WHERE u.id::bigint= e.id RETURNING e.*`;
        const values = exports.map((exp) => [
            exp.id,
            exp.container_id,
            exp.adapter,
            exp.status,
            JSON.stringify(exp.config),
            exp.status_message,
            exp.destination_type,
            userID,
        ]);

        return format(text, values);
    }

    private retrieveStatement(exportID: string): QueryConfig {
        return {
            text: `SELECT * FROM exports WHERE id = $1`,
            values: [exportID],
        };
    }

    private deleteStatement(exportID: string): QueryConfig {
        return {
            text: `DELETE FROM exports WHERE id = $1`,
            values: [exportID],
        };
    }

    private setStatusStatement(
        userID: string,
        id: string,
        status: 'created' | 'processing' | 'paused' | 'completed' | 'failed',
        message?: string,
    ): QueryConfig {
        return {
            text: `UPDATE exports SET status = $1, status_message = $2, modified_by = $4, modified_at = NOW() WHERE id = $3`,
            values: [status, message, id, userID],
        };
    }

    private listByStatusStatement(status: string): QueryConfig {
        return {
            text: `SELECT * FROM exports WHERE status = $1`,
            values: [status],
        };
    }
}
