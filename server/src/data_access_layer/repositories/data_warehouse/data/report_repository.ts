import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import Report from '../../../../domain_objects/data_warehouse/data/report';
import Result from '../../../../common_classes/result';
import ReportMapper from '../../../mappers/data_warehouse/data/report_mapper';
import {PoolClient} from 'pg';
import {User} from '../../../../domain_objects/access_management/user';
import FileMapper from '../../../mappers/data_warehouse/data/file_mapper';
import File from '../../../../domain_objects/data_warehouse/data/file';
import Authorization from '../../../../domain_objects/access_management/authorization/authorization';
import Cache from '../../../../services/cache/cache';
import Config from '../../../../services/config';
import Logger from '../../../../services/logger';
import { plainToClass, serialize } from 'class-transformer';

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
        // check for cached version of the given report
        const cached = await this.getCached(id);
        if (cached) return Promise.resolve(Result.Success(cached));

        // if no cached version found, get the report from the db
        const report = await this.#mapper.Retrieve(id, transaction);

        // cache the report for future requests
        if (!report.isError) {
            await this.setCache(report.value);
        }

        return Promise.resolve(report);
    }

    async setStatus(
        reportID: string,
        status: 'ready' | 'processing' | 'error' | 'completed',
        message?: string,
        transaction?: PoolClient,
    ): Promise<Result<boolean>> {
        const set = await this.#mapper.SetStatus(reportID, status, message, transaction);
        if (!set.isError) {
            // delete the currently cached report
            const deleted = await this.deleteCached(reportID);
            if (deleted) Logger.error(`unable to clear cache for report ${reportID}`);

            // run findByID to cache the updated report
            const cached = await this.findByID(reportID);
            if (cached.isError) Logger.error(`unable to cache report ${reportID}`);
        }
        return set;
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

    async addUserToReport(r: Report, user: User): Promise<Result<boolean>> {
        const e = await Authorization.enforcer();
        const userAdded = await e.addPolicy(user.id!, r.container_id!, `reports_${r.id!}`, 'read');
        if (!userAdded) {return Promise.resolve(Result.Failure(`error: could not add user to report ${r.id}`))};
        return Promise.resolve(Result.Success(true));
    }

    async removeUserFromReport(r: Report, user: User): Promise<Result<boolean>> {
        const e = await Authorization.enforcer();
        const userRemoved = await e.removePolicy(user.id!, r.container_id!, `reports_${r.id!}`, 'read');
        if (!userRemoved) {return Promise.resolve(Result.Failure(`error: could not remove user from report ${r.id}`))};
        return Promise.resolve(Result.Success(true));
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

    // caching for reports
    private async setCache(r: Report): Promise<boolean> {
        const set = await Cache.set(
            `${ReportMapper.tableName}:reportID:${r.id}`,
            serialize(r),
            Config.cache_default_ttl,
        );
        if (!set) Logger.error(`unable to set cache for report ${r.id}`);

        return Promise.resolve(set);
    }

    private async getCached(id: string): Promise<Report | undefined> {
        const cached = await Cache.get<object>(`${ReportMapper.tableName}:reportID:${id}`);
        if (cached) {
            const report = plainToClass(Report, cached);
            return Promise.resolve(report);
        }

        return Promise.resolve(undefined);
    }

    private async deleteCached(id: string): Promise<boolean> {
        const deleted = await Cache.del(`${ReportMapper.tableName}:reportID:${id}`);
        if (!deleted) Logger.error(`unable to remove report ${id} from cache`);

        return Promise.resolve(deleted);
    }
}