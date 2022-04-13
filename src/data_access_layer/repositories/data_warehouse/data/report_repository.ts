import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import Report from '../../../../domain_objects/data_warehouse/data/report';
import Result from '../../../../common_classes/result';
import ReportMapper from '../../../mappers/data_warehouse/data/report_mapper';
import {PoolClient} from 'pg';
import {User} from '../../../../domain_objects/access_management/user';
import FileMapper from '../../../mappers/data_warehouse/data/file_mapper';
import File from '../../../../domain_objects/data_warehouse/data/file';

/*
    ReportRepository contains methods for persisting and retrieving reports
    to storage as well as managing things like validation. Users should
    interact with repositories when possible and not the mappers, as the
    repositories contain additional logic such as validation or transformation
    prior to storage or returning.
*/
export default class ReportRepository extends Repository implements RepositoryInterface<Report> {
    #mapper: ReportMapper = ReportMapper.Instance;
    #fileMapper: FileMapper = FileMapper.Instance;

    constructor() {
        super(ReportMapper.tableName);
    }

    async findByID(id: string, transaction?: PoolClient): Promise<Result<Report>> {
        const report = await this.#mapper.Retrieve(id, transaction);
        return Promise.resolve(report);
    }

    setStatus(
        reportID: string,
        status: 'ready' | 'processing' | 'error' | 'completed',
        message?: string,
        transaction?: PoolClient,
    ): Promise<Result<boolean>> {
        return this.#mapper.SetStatus(reportID, status, message, transaction);
    }

    async save(r: Report, user: User): Promise<Result<boolean>> {
        const errors = await r.validationErrors();
        if (errors) {return Promise.resolve(Result.Failure(`report does not pass validation ${errors.join(',')}`));}

        if (r.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(r.id);
            if (original.isError) {return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));}

            Object.assign(original.value, r);

            const updated = await this.#mapper.Update(original.value);
            if (updated.isError) {return Promise.resolve(Result.Pass(updated));}

            Object.assign(r, updated.value);
        } else {
            const created = await this.#mapper.Create(user.id!, r);
            if (created.isError) {return Promise.resolve(Result.Pass(created));}

            Object.assign(r, created.value);
        }

        return Promise.resolve(Result.Success(true));
    }

    addFile(report: Report, fileID: string): Promise<Result<boolean>> {
        if (!report.id) {
            return Promise.resolve(Result.Failure('report must have id'));
        }

        return this.#mapper.AddFile(report.id, fileID);
    }

    removeFile(report: Report, fileID: string): Promise<Result<boolean>> {
        if (!report.id) {
            return Promise.resolve(Result.Failure('report must have id'));
        }

        return this.#mapper.RemoveFile(report.id, fileID);
    }

    listFiles(report: Report): Promise<Result<File[]>> {
        if (!report.id) {
            return Promise.resolve(Result.Failure('report must have id'));
        }

        return this.#fileMapper.ListForReport(report.id);
    }

    delete(r: Report): Promise<Result<boolean>> {
        if (r.id) {
            return this.#mapper.Delete(r.id);
        }

        return Promise.resolve(Result.Failure(`file must have id`));
    }

    id(operator: string, value: any) {
        super.query('id', operator, value);
        return this;
    }

    containerID(operator: string, value: any) {
        super.query('container_id', operator, value);
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

    notifyUsers(operator: string, value: any) {
        super.query('notify_users', operator, value);
        return this;
    }

    async count(transaction?: PoolClient, queryOptions?: QueryOptions): Promise<Result<number>> {
        const results = await super.count(transaction, queryOptions);

        if (results.isError) {return Promise.resolve(Result.Pass(results));}
        return Promise.resolve(Result.Success(results.value));
    }

    async list(queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<Report[]>> {
        const results = await super.findAll<Report>(queryOptions, {
            transaction,
            resultClass: Report
        });

        if (results.isError) { return Promise.resolve(Result.Pass(results)); }

        return Promise.resolve(Result.Success(results.value));
    }
}