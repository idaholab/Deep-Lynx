import RepositoryInterface, {QueryOptions, Repository} from '../../../repository';
import OntologyVersion from '../../../../../domain_objects/data_warehouse/ontology/versioning/ontology_version';
import OntologyVersionMapper from '../../../../mappers/data_warehouse/ontology/versioning/ontology_version_mapper';
import Result from '../../../../../common_classes/result';
import {User} from '../../../../../domain_objects/access_management/user';
import {PoolClient} from 'pg';
import UserRepository from '../../../access_management/user_repository';

export default class OntologyVersionRepository extends Repository implements RepositoryInterface<OntologyVersion> {
    #mapper: OntologyVersionMapper = OntologyVersionMapper.Instance;

    delete(t: OntologyVersion): Promise<Result<boolean>> {
        return this.#mapper.Delete(t.id!);
    }

    findByID(id: string): Promise<Result<OntologyVersion>> {
        return this.#mapper.Retrieve(id);
    }

    async save(v: OntologyVersion, user: User): Promise<Result<boolean>> {
        const errors = await v.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`ontology version does not pass validation ${errors.join(',')}`));
        }

        // if we have an id, attempt to update the Changelist
        if (v.id) {
            const original = await this.findByID(v.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, v);

            const updated = await this.#mapper.Update(user.id!, original.value);
            if (updated.isError) return Promise.resolve(Result.Pass(updated));

            Object.assign(v, updated.value);
            return Promise.resolve(Result.Success(true));
        }

        const result = await this.#mapper.Create(user.id!, v);
        if (result.isError) return Promise.resolve(Result.Pass(result));

        Object.assign(v, result.value);
        return Promise.resolve(Result.Success(true));
    }

    setStatus(
        id: string,
        status: 'pending' | 'approved' | 'rejected' | 'published' | 'deprecated' | 'ready' | 'error',
        statusMessage?: string,
    ): Promise<Result<boolean>> {
        return this.#mapper.SetStatus(id, status, statusMessage);
    }

    async approve(id: string, user: User, containerID: string): Promise<Result<boolean>> {
        const authed = await new UserRepository().isAdminForContainer(user, containerID);
        if (!authed) return Promise.resolve(Result.Failure('user cannot approve ontology version, user is not an admin of the container'));

        return this.#mapper.Approve(id, user.id!);
    }

    revokeApproval(id: string, statusMessage?: string): Promise<Result<boolean>> {
        return this.#mapper.RevokeApproval(id, statusMessage);
    }

    constructor() {
        super(OntologyVersionMapper.tableName);
    }

    containerID(operator: string, value: any) {
        super.query('container_id', operator, value);
        return this;
    }

    count(): Promise<Result<number>> {
        return super.count();
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<OntologyVersion[]>> {
        return super.findAll(options, {
            transaction,
            resultClass: OntologyVersion,
        });
    }
}
