import RepositoryInterface, {QueryOptions, Repository} from '../../../repository';
import Changelist from '../../../../../domain_objects/data_warehouse/ontology/versioning/changelist';
import Result from '../../../../../common_classes/result';
import ChangelistMapper from '../../../../mappers/data_warehouse/ontology/versioning/changelist_mapper';
import {User} from '../../../../../domain_objects/access_management/user';
import {PoolClient} from 'pg';

export default class ChangelistRepository extends Repository implements RepositoryInterface<Changelist> {
    #mapper: ChangelistMapper = ChangelistMapper.Instance;

    delete(t: Changelist): Promise<Result<boolean>> {
        if (t.id) return this.#mapper.Delete(t.id);

        return Promise.resolve(Result.Failure('record must have id'));
    }

    findByID(id: string): Promise<Result<Changelist>> {
        return this.#mapper.Retrieve(id);
    }

    async save(c: Changelist, user: User): Promise<Result<boolean>> {
        const errors = await c.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`changelist does not pass validation ${errors.join(',')}`));
        }

        // if we have an id, attempt to update the Changelist
        if (c.id) {
            const original = await this.findByID(c.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, c);

            const updated = await this.#mapper.Update(user.id!, original.value);
            if (updated.isError) return Promise.resolve(Result.Pass(updated));

            Object.assign(c, updated.value);
            return Promise.resolve(Result.Success(true));
        }

        const result = await this.#mapper.Create(user.id!, c);
        if (result.isError) return Promise.resolve(Result.Pass(result));

        Object.assign(c, result.value);
        return Promise.resolve(Result.Success(true));
    }

    setStatus(id: string, userID: string, status: 'pending' | 'approved' | 'rejected' | 'applied', transaction?: PoolClient): Promise<Result<boolean>> {
        return this.#mapper.SetStatus(id, userID, status, transaction);
    }

    constructor() {
        super(ChangelistMapper.tableName);
    }

    count(): Promise<Result<number>> {
        return super.count();
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<Changelist[]>> {
        return super.findAll(options, {
            transaction,
            resultClass: Changelist,
        });
    }
}
