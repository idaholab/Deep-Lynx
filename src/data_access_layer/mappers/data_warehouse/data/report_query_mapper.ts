import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import ReportQuery from '../../../../domain_objects/data_warehouse/data/report_query';

const format = require('pg-format');
const resultClass = ReportQuery;

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
    public static tableName = 'report_queries';
    
    private static instance: ReportQueryMapper;

    public static get Instance(): ReportQueryMapper {
        if (!ReportQueryMapper.instance) {
            ReportQueryMapper.instance = new ReportQueryMapper();
        }

        return ReportQueryMapper.instance;
    }

    public async Create(query: ReportQuery, transaction?: PoolClient): Promise<Result<ReportQuery>> {
        const r = await super.run(this.createStatement(query), {
            transaction,
            resultClass,
        });
        if (r.isError) {return Promise.resolve(Result.Pass(r));}

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Update(query: ReportQuery, transaction?: PoolClient): Promise<Result<ReportQuery>> {
        const r = await super.run(this.updateStatement(query), {
            transaction,
            resultClass,
        });
        if (r.isError) {return Promise.resolve(Result.Pass(r));}

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Retrieve(id: string, transaction?: PoolClient): Promise<Result<ReportQuery>> {
        return super.retrieve<ReportQuery>(this.retrieveStatement(id), {
            transaction,
            resultClass,
        });
    }

    public async Delete(id: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id), {transaction});
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres driver can understand.
    // The hope is that this method will allow us to be more flexible and create
    // more complicated queries more easily.
    private createStatement(...queries: ReportQuery[]): string {
        const text = `INSERT INTO report_queries(
                        report_id,
                        query,
                        status,
                        status_message) VALUES %L RETURNING *`;
        const values = queries.map((q) => [
            q.report_id,
            q.query,
            q.status,
            q.status_message,
        ]);

        return format(text, values);
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
        const values = queries.map((q) => [
            q.id,
            q.report_id,
            q.query,
            q.status,
            q.status_message,
        ]);

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
}