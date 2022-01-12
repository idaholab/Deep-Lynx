import RepositoryInterface, {QueryOptions, Repository} from '../repository';
import Event from '../../../domain_objects/event_system/event';
import EventMapper from '../../mappers/event_system/event_mapper';
import Result from '../../../common_classes/result';
import {SuperUser, User} from '../../../domain_objects/access_management/user';
import { PoolClient } from 'pg';
import EventAction from '../../../domain_objects/event_system/event_action';
import axios from 'axios';
import EventActionStatus from '../../../domain_objects/event_system/event_action_status';
import EventActionStatusRepository from './event_action_status_repository';
import Logger from '../../../services/logger';

/*
    EventRepository contains methods for persisting and retrieving an event registration
    to storage. Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning. This is not used to actually
    emit events, only manage registrations.
 */
export default class EventRepository extends Repository implements RepositoryInterface<Event> {
    #mapper: EventMapper = EventMapper.Instance;

    delete(e: Event): Promise<Result<boolean>> {
        if (e.id) {
            return this.#mapper.Delete(e.id);
        }

        return Promise.resolve(Result.Failure(`event has no id`));
    }

    findByID(id: string): Promise<Result<Event>> {
        return this.#mapper.Retrieve(id);
    }

    async save(e: Event, user: User): Promise<Result<boolean>> {
        const errors = await e.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`event does not pass validation ${errors.join(',')}`));
        }

        // events do not support updates, only creates
        const created = await this.#mapper.Create(user.id!, e);
        if (created.isError) return Promise.resolve(Result.Pass(created));

        Object.assign(e, created.value);

        return Promise.resolve(Result.Success(true));
    }

    // wrapper function for save() which is used internally for sending events
    emitEvent(e: Event, user?: User): void {
        if (!user) user = SuperUser;

        void this.save(e, user);
    }

    markProcessed(id: string): Promise<Result<boolean>> {
        return this.#mapper.SetProcessed(id);
    }

    constructor() {
        super(EventMapper.tableName);
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

    processed(operator: string, value?: any) {
        super.query('processed', operator, value)
        return this;
    }

    count(): Promise<Result<number>> {
        return super.count();
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<Event[]>> {
        const results = await super.findAll<Event>(options, {
            transaction,
            resultClass: Event,
        });
        if (results.isError) return Promise.resolve(Result.Pass(results));

        return Promise.resolve(Result.Pass(results));
    }

    // function used for sending out events based on the event and action supplied
    async sendEvent(payload: any, event: Event, action: EventAction, sourceType: string, sourceID: string): Promise<void> {
        const statusRepo = new EventActionStatusRepository();

        await axios
            .post(action.destination!, payload)
            .then(() => {
                Logger.debug(`event: ${event.event_type} on ${sourceType} ${sourceID} sent to 
            event action ${action.id} of type ${action.action_type} at ${action.destination}`);

                statusRepo.save(new EventActionStatus({eventID: event.id!, eventActionID: action.id!}), SuperUser)
                    .then((result) => {
                        if (result.isError) {
                            Logger.error(`unable to create event action status ${result.error?.error}`);
                            return;
                        }
                    })
                    .catch((e) => Logger.error(`unable to create event action status ${e}`));
            })
            .catch((e) => {
            // Note: this event system will not retry to send failed events
                const error = `event: ${event.event_type} on ${sourceType} ${sourceID} failed to 
            send to action ${action.id} of type ${action.action_type} at ${action.destination} ${e}`;
                Logger.error(error);

                statusRepo.save(new EventActionStatus({
                    eventID: event.id!,
                    eventActionID: action.id!,
                    status: 'error',
                    statusMessage: error
                }), SuperUser)
                    .then((result) => {
                        if (result.isError) {
                            Logger.error(`unable to create event action status ${result.error?.error}`);
                            return;
                        }
                    })
                    .catch((e) => Logger.error(`unable to create event action status ${e}`));
            });
    }
}
