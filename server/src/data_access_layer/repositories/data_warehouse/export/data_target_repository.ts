import RepositoryInterface, {DeleteOptions, QueryOptions, Repository} from '../../repository';
import DataTargetRecord from '../../../../domain_objects/data_warehouse/export/data_target';
import DataTargetMapper from '../../../mappers/data_warehouse/export/data_target_mapper';
import HttpDataTargetImpl from '../../../../interfaces_and_impl/data_warehouse/export/http_data_target_impl';
import Result from '../../../../common_classes/result';
import {User} from '../../../../domain_objects/access_management/user';
import {PoolClient} from 'pg';
import {DataTarget} from '../../../../interfaces_and_impl/data_warehouse/export/data_target';

/*
    DataTargetRepository contains methods for persisting and retrieving data targets
    to storage as well as managing things like validation and the starting/stopping
    of said data target's process loops.Users should interact with repositories
    when possible and not the mappers as the repositories contain additional logic
    such as validation or transformation prior to storage or returning. This
    repository especially returns an interface vs. concrete class and exposes
    more operations than exist if you just use the mapper.
 */
export default class DataTargetRepository extends Repository implements RepositoryInterface<DataTarget> {
    #mapper = DataTargetMapper.Instance;
    #factory = new DataTargetFactory();

    async delete(t: DataTarget, options?: DeleteOptions): Promise<Result<boolean>> {
        if (!t.DataTargetRecord || !t.DataTargetRecord.id) {
            return Promise.resolve(Result.Failure(`cannot delete data target: no data target record or record lacking id`));
        }

        return this.#mapper.Delete(t.DataTargetRecord.id);
    }

    async archive(u: User, t: DataTarget): Promise<Result<boolean>> {
        if (!t.DataTargetRecord || !t.DataTargetRecord.id) {
            return Promise.resolve(Result.Failure(`cannot archive data target: no data target record or record lacking id`));
        }

        return this.#mapper.Archive(t.DataTargetRecord.id, u.id!);
    }

    async findByID(id: string): Promise<Result<DataTarget>> {
        const dataTargetRecord = await this.#mapper.Retrieve(id);
        if (dataTargetRecord.isError) {
            return Promise.resolve(Result.Pass(dataTargetRecord));}

        const dataTarget = this.#factory.fromDataTargetRecord(dataTargetRecord.value);
        if (!dataTarget) {
            return Promise.resolve(Result.Failure(`unable to create data target from data target record`));}
        
        return Promise.resolve(Result.Success(dataTarget));
    }

    async save(t: DataTarget, user: User): Promise<Result<boolean>> {
        if (!t.DataTargetRecord) {return Promise.resolve(Result.Failure(`data target must have a data target record instantiated`));}

        const errors = await t.DataTargetRecord.validationErrors();
        if (errors) {return Promise.resolve(Result.Failure(`attached data target record does not pass validation ${errors.join(',')}`));}

        // the data target might need to run encryption of configurations or cleanup
        // operations prior to saving the record - always call the interfaces ToSave
        // method
        const toSave = await t.ToSave();
        let savedRecord: DataTargetRecord;

        if (toSave.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(toSave.id);
            if (original.isError) {return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));}

            const originalToSave = await original.value.ToSave();

            Object.assign(originalToSave, toSave);

            const updated = await this.#mapper.Update(user.id!, originalToSave);
            if (updated.isError) {return Promise.resolve(Result.Pass(updated));}

            savedRecord = updated.value;
        } else {
            const created = await this.#mapper.Create(user.id!, toSave);
            if (created.isError) {return Promise.resolve(Result.Pass(created));}

            savedRecord = created.value;
        }

        const newDataTarget = this.#factory.fromDataTargetRecord(savedRecord);
        if (!newDataTarget) {return Promise.resolve(Result.Failure(`unable to instantiate new data target from saved data target record`));}

        Object.assign(t, newDataTarget);

        return Promise.resolve(Result.Success(true));
    }

    // setting a data target to inactive will automatically stop the process loop
    async setInactive(t: DataTarget, user: User): Promise<Result<boolean>> {
        if (t.DataTargetRecord && t.DataTargetRecord.id) {
            return this.#mapper.SetInactive(t.DataTargetRecord.id, user.id!);
        } 
        else {
            return Promise.resolve(Result.Failure(`data target's record must be instantiated and have an id`));
        }
    }

    // do not start the process loop when setting to active, the worker will pick up the change automatically
    async setActive(t: DataTarget, user: User): Promise<Result<boolean>> {
        if (t.DataTargetRecord && t.DataTargetRecord.id) {
            const set = await this.#mapper.SetActive(t.DataTargetRecord.id, user.id!);
            if (set.isError) {return Promise.resolve(Result.Pass(set));}

            return Promise.resolve(Result.Success(true));
        } else {return Promise.resolve(Result.Failure(`data target's record must be instantiated and have an id`));}
    }

    async setStatus(
        t: DataTarget,
        user: User,
        status: 'ready' | 'polling' | 'error',
        status_message?: string,
        transaction?: PoolClient,
    ): Promise<Result<boolean>> {
        if (t.DataTargetRecord && t.DataTargetRecord.id) {
            return this.#mapper.SetStatus(t.DataTargetRecord.id, user.id!, status, status_message, transaction);
        } else {return Promise.resolve(Result.Failure(`data target's record must be instantiated and have an id`));}
    }

    constructor() {
        super(DataTargetMapper.tableName);
    }

    // filter specific functions
    id(operator: string, value: any) {
        super.query('id', operator, value);
        return this;
    }

    containerID(operator: string, value: any) {
        super.query('container_id', operator, value);
        return this;
    }

    active() {
        super.query('active', 'eq', true);
        return this;
    }

    archived(value: boolean) {
        super.query('archived', 'eq', value);
        return this;
    }

    inactive() {
        super.query('active', 'eq', false);
        return this;
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<(DataTarget | undefined)[]>> {
        const results = await super.findAll<DataTargetRecord>(options, {
            transaction,
            resultClass: DataTargetRecord,
        });
        if (results.isError) {return Promise.resolve(Result.Pass(results));}

        return Promise.resolve(Result.Success(results.value.map((record) => this.#factory.fromDataTargetRecord(record))));
    }
}

// as part of the data target repository we also include the data target factory, used
// to take data target records and generate data target interfaces from them. Currently
// the only implementations are the Http data targets.
export class DataTargetFactory {
    fromDataTargetRecord(dataTargetRecord: DataTargetRecord): HttpDataTargetImpl | undefined {
        switch (dataTargetRecord.adapter_type) {
            case 'http': {
                return new HttpDataTargetImpl(dataTargetRecord);
            }

            default: {
                return undefined;
            }
        }
    }
}
