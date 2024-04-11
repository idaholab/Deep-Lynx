import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Report from '../../../../domain_objects/data_warehouse/data/report';

const format = require('pg-format');

/*
    ReportMapper extends the Postgres database Mapper class and allows the user
    to map a data structure to and from the attached database. The mappers are
    designed to be as simple as possible and shouldn't contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also try
    to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class ReportMapper extends Mapper {
    public resultClass = Report;
    public static tableName = 'reports';

    private static instance: ReportMapper;

    public static get Instance(): ReportMapper {
        if (!ReportMapper.instance) {
            ReportMapper.instance = new ReportMapper();
        }

        return ReportMapper.instance;
    }

    public async Create(userID: string, report: Report, transaction?: PoolClient): Promise<Result<Report>> {
        const r = await super.run(this.createStatement(userID, report), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) {
            return Promise.resolve(Result.Pass(r));
        }

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async SetStatus(
        reportID: string,
        status: 'ready' | 'processing' | 'error' | 'completed',
        message?: string,
        transaction?: PoolClient,
    ): Promise<Result<boolean>> {
        return super.runStatement(this.setStatusStatement(reportID, status, message), {transaction});
    }

    public async Update(report: Report, transaction?: PoolClient): Promise<Result<Report>> {
        const r = await super.run(this.updateStatement(report), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) {
            return Promise.resolve(Result.Pass(r));
        }

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Retrieve(id: string, transaction?: PoolClient): Promise<Result<Report>> {
        return super.retrieve<Report>(this.retrieveStatement(id), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public AddFile(id: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.addFile(id, fileID));
    }

    public RemoveFile(id: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.removeFile(id, fileID));
    }

    public async Delete(id: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id), {transaction});
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres driver can understand.
    // The hope is that this method will allow us to be more flexible and create
    // more complicated queries more easily.
    private createStatement(userID: string, ...reports: Report[]): string {
        const text = `INSERT INTO reports(
                        container_id,
                        status,
                        status_message,
                        notify_users,
                        created_by) VALUES %L RETURNING *`;
        const values = reports.map((r) => [r.container_id, r.status, r.status_message, r.notify_users, userID]);

        return format(text, values);
    }

    private setStatusStatement(id: string, status: 'ready' | 'processing' | 'error' | 'completed', message?: string): QueryConfig {
        return {
            text: `UPDATE reports SET status = $2, status_message = $3 WHERE id = $1`,
            values: [id, status, message],
        };
    }

    private updateStatement(...reports: Report[]): string {
        const text = `UPDATE reports as r SET
                    container_id = u.container_id::bigint,
                    status = u.status,
                    status_message = u.status_message,
                    notify_users = u.notify_users::boolean
                    FROM(VALUES %L) AS u(
                    id,
                    container_id,
                    status,
                    status_message,
                    notify_users)
                    WHERE u.id::bigint = r.id RETURNING r.*`;
        const values = reports.map((r) => [r.id, r.container_id, r.status, r.status_message, r.notify_users]);

        return format(text, values);
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM reports WHERE id = $1`,
            values: [id],
        };
    }

    private deleteStatement(id: string): QueryConfig {
        return {
            text: `DELETE FROM reports WHERE id = $1`,
            values: [id],
        };
    }

    private addFile(reportID: string, fileID: string): QueryConfig {
        return {
            text: `INSERT INTO report_query_files
                    (report_id, query_id, file_id)
                    VALUES ($1, NULL, $2)`,
            values: [reportID, fileID],
        };
    }

    private removeFile(reportID: string, fileID: string): QueryConfig {
        return {
            text: `DELETE FROM report_query_files
                    WHERE report_id = $1
                    AND file_id = $2`,
            values: [reportID, fileID],
        };
    }
}
