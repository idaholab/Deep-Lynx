import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import ReportQuery from '../../../../domain_objects/data_warehouse/data/report_query';
import Result from '../../../../common_classes/result';
import ReportQueryMapper from '../../../mappers/data_warehouse/data/report_query_mapper';
import {PoolClient} from 'pg';
import FileMapper from '../../../mappers/data_warehouse/data/file_mapper';
import File from '../../../../domain_objects/data_warehouse/data/file';

/*
    ReportQueryRepository contains methods for persisting and retrieving report
    queries to storage as well as managing things like validation. Users should
    interact with repositories when possible and not the mappers, as the repositories
    contain additional logic such as validation or transformation prior to storage
    or returning.
*/
export default class ReportQueryRepository extends Repository implements RepositoryInterface<ReportQuery> {
    #mapper: ReportQueryMapper = ReportQueryMapper.Instance;
    #fileMapper: FileMapper = FileMapper.Instance;

    constructor() {
        super(ReportQueryMapper.tableName);
    }

    async findByID(id: string, transaction?: PoolClient): Promise<Result<ReportQuery>> {
        const reportQ = await this.#mapper.Retrieve(id, transaction);

        return Promise.resolve(reportQ);
    }

    setStatus(
        queryID: string,
        status: 'ready' | 'processing' | 'error' | 'completed',
        message?: string,
        transaction?: PoolClient,
    ): Promise<Result<boolean>> {
        return this.#mapper.SetStatus(queryID, status, message, transaction);
    }

    async save(rq: ReportQuery): Promise<Result<boolean>> {
        const errors = await rq.validationErrors();
        if (errors) {return Promise.resolve(Result.Failure(`query does not pass validation ${errors.join(',')}`));}

        if (rq.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(rq.id);
            if (original.isError) {return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));}

            Object.assign(original.value, rq);

            const updated = await this.#mapper.Update(original.value);
            if (updated.isError) {return Promise.resolve(Result.Pass(updated));}

            Object.assign(rq, updated.value);
        } else {
            const created = await this.#mapper.Create(rq);
            if (created.isError) {return Promise.resolve(Result.Pass(created));}

            Object.assign(rq, created.value);
        }

        return Promise.resolve(Result.Success(true));
    }

    addFile(query: ReportQuery, fileID: string): Promise<Result<boolean>> {
        if (!query.id) {
            return Promise.resolve(Result.Failure('report query must have id'));
        }

        return this.#mapper.AddFile(query.report_id!, query.id, fileID);
    }

    removeFile(query: ReportQuery, fileID: string): Promise<Result<boolean>> {
        if (!query.id) {
            return Promise.resolve(Result.Failure('report query must have id'));
        }

        return this.#mapper.RemoveFile(query.id, fileID);
    }

    listFiles(query: ReportQuery): Promise<Result<File[]>> {
        if (!query.id) {
            return Promise.resolve(Result.Failure('report query must have id'));
        }

        return this.#fileMapper.ListForReportQuery(query.id)
    }

    delete(rq: ReportQuery): Promise<Result<boolean>> {
        if (rq.id) {
            return this.#mapper.Delete(rq.id);
        }

        return Promise.resolve(Result.Failure(`file must have id`));
    }

    id(operator: string, value: any) {
        super.query('id', operator, value);
        return this;
    }

    reportID(operator: string, value: any) {
        super.query('report_id', operator, value);
        return this;
    }

    status(operator: string, value: any) {
        super.query('status', operator, value);
        return this;
    }

    statusMessage(operator: string, value: any) {
        super.query('status_message', operator, value);
        return this;
    }

    async count(transaction?: PoolClient, queryOptions?: QueryOptions): Promise<Result<number>> {
        const results = await super.count(transaction, queryOptions);

        if (results.isError) {return Promise.resolve(Result.Pass(results));}
        return Promise.resolve(Result.Success(results.value));
    }

    async list(queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<ReportQuery[]>> {
        const results = await super.findAll<ReportQuery>(queryOptions, {
            transaction,
            resultClass: ReportQuery
        });

        if (results.isError) { return Promise.resolve(Result.Pass(results)); }

        return Promise.resolve(Result.Success(results.value));
    }
}