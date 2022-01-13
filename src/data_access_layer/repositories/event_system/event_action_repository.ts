import RepositoryInterface, {QueryOptions, Repository} from '../repository';
import EventAction from '../../../domain_objects/event_system/event_action';
import EventActionMapper from '../../mappers/event_system/event_action_mapper';
import Result from '../../../common_classes/result';
import {plainToClass} from 'class-transformer';
import {User} from '../../../domain_objects/access_management/user';

/*
    EventActionRepository contains methods for persisting and retrieving an event registration
    to storage. Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning. This is not used to actually
    emit events, only manage registrations.
 */
export default class EventActionRepository extends Repository implements RepositoryInterface<EventAction> {
    #mapper: EventActionMapper = EventActionMapper.Instance;

    delete(e: EventAction): Promise<Result<boolean>> {
        if (e.id) {
            return this.#mapper.Delete(e.id);
        }

        return Promise.resolve(Result.Failure(`event action has no id`));
    }

    findByID(id: string): Promise<Result<EventAction>> {
        return this.#mapper.Retrieve(id);
    }

    async save(e: EventAction, user: User): Promise<Result<boolean>> {
        const errors = await e.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`event action does not pass validation ${errors.join(',')}`));
        }

        if (e.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(e.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, e);

            const updated = await this.#mapper.Update(user.id!, original.value);
            if (updated.isError) return Promise.resolve(Result.Pass(updated));

            Object.assign(e, updated.value);
        } else {
            const created = await this.#mapper.Create(user.id!, e);
            if (created.isError) return Promise.resolve(Result.Pass(created));

            Object.assign(e, created.value);
        }
        return Promise.resolve(Result.Success(true));
    }

    setActive(user: User, e: EventAction): Promise<Result<boolean>> {
        return this.#mapper.SetActive(e.id!, user.id!);
    }

    setInactive(user: User, e: EventAction): Promise<Result<boolean>> {
        return this.#mapper.SetInActive(e.id!, user.id!);
    }

    constructor() {
        super(EventActionMapper.tableName);
    }

    containerID(operator: string, value: any) {
        super.query('container_id', operator, value);
        return this;
    }

    dataSourceID(operator: string, value: any) {
        super.query('data_source_id', operator, value);
        return this;
    }

    eventType(operator: string, value: any) {
        super.query('event_type', operator, value);
        return this;
    }

    active(operator: string, value: any) {
        super.query('active', operator, value);
        return this;
    }

    destinationDataSourceID(operator: string, value: any) {
        super.query('destination_data_source_id', operator, value);
        return this;
    }

    count(): Promise<Result<number>> {
        return super.count();
    }

    async list(options?: QueryOptions): Promise<Result<EventAction[]>> {
        const results = await super.findAll<object>(options);
        if (results.isError) return Promise.resolve(Result.Pass(results));

        return Promise.resolve(Result.Success(plainToClass(EventAction, results.value)));
    }
}
