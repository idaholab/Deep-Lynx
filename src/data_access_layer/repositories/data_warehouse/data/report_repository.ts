import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import Report from '../../../../domain_objects/data_warehouse/data/report';
import Result from '../../../../common_classes/result';
import ReportMapper from '../../../mappers/data_warehouse/data/report_mapper';
import {PoolClient} from 'pg';
import {User} from '../../../../domain_objects/access_management/user';
import MetatypeRepository from '../ontology/metatype_repository';
import Logger from '../../../../services/logger';
import FileMapper from '../../../mappers/data_warehouse/data/file_mapper';
import File from '../../../../domain_objects/data_warehouse/data/file';
import { nodeContext } from '../../../../http_server/middleware';

/*
    ReportRepository contains methods for persisting and retrieving reports
    to storage as well as managing things like validation. Users should
    interact with repositories when possible and not the mappers, as the
    repositories contain additional logic such as validation or transformation
    prior to storage or returning.
*/
export default class ReportRepository extends Repository implements RepositoryInterface<Report> {
    #mapper: ReportMapper = ReportMapper.Instance;

    constructor() {
        super(ReportMapper.tableName);
    }

    async findByID(id: string, transaction?: PoolClient): Promise<Result<Report>> {
        const report = await this.#mapper.Retrieve(id, transaction);
        
        return Promise.resolve(report);
    }

    async save(r: Report, user: User, transaction?: PoolClient): Promise<Result<boolean>> {
        const errors = await r.validationErrors();
        if (errors) {return Promise.resolve(Result.Failure(`report does not pass validation ${errors.join(',')}`));}

        if (r.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(r.id);
            if (original.isError) {return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));}

            Object.assign(original.value, r);

            const updated = await this.#mapper.Update(user.id!, original.value);
            if (updated.isError) {return Promise.resolve(Result.Pass(updated));}

            Object.assign(r, updated.value);
        } else {
            const created = await this.#mapper.Create(user.id!, r);
            if (created.isError) {return Promise.resolve(Result.Pass(created));}

            Object.assign(r, created.value);
        }

        return Promise.resolve(Result.Success(true));
    }

    delete(r: Report): Promise<Result<boolean>> {
        if (r.id) {
            return this.#mapper.Delete(r.id);
        }

        return Promise.resolve(Result.Failure(`file must have id`));
    }
}