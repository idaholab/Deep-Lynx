import RepositoryInterface, {QueryOptions, Repository} from '../repository';
import EventActionStatus from '../../../domain_objects/event_system/event_action_status';
import EventActionStatusMapper from '../../mappers/event_system/event_action_status_mapper';
import Result from '../../../common_classes/result';
import {plainToClass} from 'class-transformer';
import {User} from '../../../domain_objects/access_management/user';

/*
    EventActionStatusRepository contains methods for persisting and retrieving an event registration
    to storage. Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning. This is not used to actually
    emit events, only manage registrations.
 */
export default class EventActionStatusRepository extends Repository implements RepositoryInterface<EventActionStatus> {
    #mapper: EventActionStatusMapper = EventActionStatusMapper.Instance;

    delete(): Promise<Result<boolean>> {
        return Promise.resolve(Result.Failure(`Method not implemented`));
    }

    findByID(id: string): Promise<Result<EventActionStatus>> {
        return this.#mapper.Retrieve(id);
    }

    async save(e: EventActionStatus, user: User): Promise<Result<boolean>> {
        const errors = await e.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`event status does not pass validation ${errors.join(',')}`));
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

    constructor() {
        super(EventActionStatusMapper.tableName);
    }

    eventID(operator: string, value: any) {
        super.query(`event ->> 'id'`, operator, value);
        return this;
    }

    eventActionID(operator: string, value: any) {
        super.query('event_action_id', operator, value);
        return this;
    }

    status(operator: string, value: any) {
        super.query('status', operator, value);
        return this;
    }

    count(): Promise<Result<number>> {
        return super.count();
    }

    async list(options?: QueryOptions): Promise<Result<EventActionStatus[]>> {
        const results = await super.findAll<object>(options);
        if (results.isError) return Promise.resolve(Result.Pass(results));

        return Promise.resolve(Result.Success(plainToClass(EventActionStatus, results.value)));
    }
}
