import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import { PoolClient, QueryConfig } from 'pg';
import ReportQuery, { CompletedQueryMatch } from '../../../../domain_objects/data_warehouse/data/report_query';

const format = require('pg-format');

/*
    ReportQueryMapper extends the Postgres database Mapper class and allows the
    user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and shouldn't contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also try
    to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class ReportQueryMapper extends Mapper {
    public resultClass = ReportQuery;
    public static tableName = 'report_queries';

    private static instance: ReportQueryMapper;

    public static get Instance(): ReportQueryMapper {
        if (!ReportQueryMapper.instance) {
            ReportQueryMapper.instance = new ReportQueryMapper();
        }

        return ReportQueryMapper.instance;
    }

    public async Create(userID: string, query: ReportQuery, transaction?: PoolClient): Promise<Result<ReportQuery>> {
        const r = await super.run(this.createStatement(userID, query), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) {
            return Promise.resolve(Result.Pass(r));
        }

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async SetStatus(
        queryID: string,
        status: 'ready' | 'processing' | 'error' | 'completed',
        message?: string,
        transaction?: PoolClient,
    ): Promise<Result<boolean>> {
        return super.runStatement(this.setStatusStatement(queryID, status, message), { transaction });
    }

    public async SetResultFile(queryID: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.setResultFileStatement(queryID, fileID));
    }

    public async Update(query: ReportQuery, transaction?: PoolClient): Promise<Result<ReportQuery>> {
        const r = await super.run(this.updateStatement(query), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) {
            return Promise.resolve(Result.Pass(r));
        }

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Retrieve(id: string, transaction?: PoolClient): Promise<Result<ReportQuery>> {
        return super.retrieve<ReportQuery>(this.retrieveStatement(id), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public AddFile(id: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.addFileStatement(id, fileID));
    }

    public BulkAddFiles(id: string, fileIDs: string[]): Promise<Result<boolean>> {
        return super.runStatement(this.bulkAddFilesStatement(id, fileIDs));
    }

    public RemoveFile(id: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.removeFileStatement(id, fileID));
    }

    public async Delete(id: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id), { transaction });
    }

    CheckQueryExists(query: string): Promise<Result<CompletedQueryMatch>> {
        return super.retrieve<CompletedQueryMatch>(this.checkQueryExistsStatement(query), {
            resultClass: CompletedQueryMatch
        });
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres driver can understand.
    // The hope is that this method will allow us to be more flexible and create
    // more complicated queries more easily.

    // Not inserting result file reference yet, as there aren't results right when a query is created
    private createStatement(userID: string, ...queries: ReportQuery[]): string {
        const text = `INSERT INTO report_queries(
                        report_id,
                        query,
                        status,
                        status_message,
                        created_by) VALUES %L RETURNING *`;
        const values = queries.map((q) => [q.report_id, q.query, q.status, q.status_message, userID]);

        return format(text, values);
    }

    private setStatusStatement(id: string, status: 'ready' | 'processing' | 'error' | 'completed', message?: string): QueryConfig {
        return {
            text: `UPDATE report_queries SET status = $2, status_message = $3 WHERE id = $1`,
            values: [id, status, message],
        };
    }

    private setResultFileStatement(id: string, fileID: string): QueryConfig {
        return {
            text: `WITH recent_files AS (
                        SELECT id AS file_id, MAX(created_at) AS created_at
                        FROM files GROUP BY id
                    ) UPDATE report_queries rq
                    SET result_file_id = rf.file_id,
                        result_file_created_at = rf.created_at
                    FROM recent_files rf
                    WHERE rq.id = $1 AND rf.file_id = $2`,
            values: [id, fileID],
        }
    }

    private updateStatement(...queries: ReportQuery[]): string {
        const text = `UPDATE report_queries as q SET
                    report_id = u.report_id::bigint,
                    query = u.query,
                    status = u.status,
                    status_message = u.status_message
                    FROM(VALUES %L) AS u(
                    id,
                    report_id,
                    query,
                    status,
                    status_message)
                    WHERE u.id::bigint = q.id RETURNING q.*`;
        const values = queries.map((q) => [q.id, q.report_id, q.query, q.status, q.status_message]);

        return format(text, values);
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM report_queries WHERE id = $1`,
            values: [id],
        };
    }

    private deleteStatement(id: string): QueryConfig {
        return {
            text: `DELETE FROM report_queries WHERE id = $1`,
            values: [id],
        };
    }

    private addFileStatement(queryID: string, fileID: string): QueryConfig {
        return {
            text: `INSERT INTO report_query_files
                    (query_id, file_id)
                    VALUES ($1, $2)`,
            values: [queryID, fileID],
        };
    }

    private bulkAddFilesStatement(queryID: string, fileIDs: string[]): QueryConfig {
        const values = fileIDs.map((fileID) => [queryID, fileID]);
        return {
            text: `INSERT INTO report_query_files
                    (query_id, file_id)
                    VALUES (%L)
                    ON CONFLICT DO NOTHING`,
            values
        }
    }

    private removeFileStatement(queryID: string, fileID: string): QueryConfig {
        return {
            text: `DELETE FROM report_query_files
                    WHERE file_id = $1
                    AND query_id = $2`,
            values: [queryID, fileID],
        };
    }

    private checkQueryExistsStatement(query: string): QueryConfig {
        // compare a query with those in the database, sanitizing queries
        // of extraneous whitespace and casing before comparison
        // return {
            const text = `SELECT rq.id, r.status_message
            FROM report_queries rq JOIN reports r ON rq.report_id = r.id
            WHERE r.status = 'completed'
            AND LOWER(REGEXP_REPLACE(TRIM(rq.query), '\\s+', ' ', 'g')) = LOWER(REGEXP_REPLACE(TRIM($1), '\\s+', ' ', 'g'))
            ORDER BY rq.created_at DESC LIMIT 1`;
            const values = [query];
        // }
        return {text, values}
    }
}
