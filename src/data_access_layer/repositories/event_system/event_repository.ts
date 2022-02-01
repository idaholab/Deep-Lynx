import {Repository} from '../repository';
import Event from '../../../domain_objects/event_system/event';
import Result from '../../../common_classes/result';
import {SuperUser, User} from '../../../domain_objects/access_management/user';
import EventAction from '../../../domain_objects/event_system/event_action';
import axios from 'axios';
import EventActionStatus from '../../../domain_objects/event_system/event_action_status';
import EventActionStatusRepository from './event_action_status_repository';
import Logger from '../../../services/logger';
import Config from '../../../services/config';
import {v4 as uuidv4} from 'uuid';
import {QueueFactory} from '../../../services/queue/queue';

/*
    EventRepository is a simple class for emitting events to the events queue
    and contains some logic for acting on events
 */
export default class EventRepository extends Repository {
    async save(e: Event, user: User): Promise<Result<boolean>> {
        if (!Config.emit_events) return Promise.resolve(Result.Success(true));

        const errors = await e.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`event does not pass validation ${errors.join(',')}`));
        }

        e.id = uuidv4();
        e.created_at = new Date();
        e.created_by = user.id;

        const queue = await QueueFactory();
        const sent = await queue.Put(Config.events_queue, e);

        if (!sent) {
            return Promise.resolve(Result.Failure('unable to put event on queue'));
        }

        return Promise.resolve(Result.Success(true));
    }

    // wrapper function for save() which is used internally for sending events
    // just makes the interface cleaner when sending events internally
    emit(e: Event, user?: User): void {
        if (!user) user = SuperUser;

        void this.save(e, user);
    }

    // function used for sending out events based on the event and action supplied
    async sendEvent(payload: any, event: Event, action: EventAction, sourceType: string, sourceID: string): Promise<void> {
        const statusRepo = new EventActionStatusRepository();

        await axios
            .post(action.destination!, payload)
            .then(() => {
                Logger.debug(`event: ${event.event_type} on ${sourceType} ${sourceID} sent to 
            event action ${action.id} of type ${action.action_type} at ${action.destination}`);

                statusRepo
                    .save(new EventActionStatus({event, eventActionID: action.id!}), SuperUser)
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

                statusRepo
                    .save(
                        new EventActionStatus({
                            event,
                            eventActionID: action.id!,
                            status: 'error',
                            statusMessage: error,
                        }),
                        SuperUser,
                    )
                    .then((result) => {
                        if (result.isError) {
                            Logger.error(`unable to create event action status ${result.error?.error}`);
                            return;
                        }
                    })
                    .catch((e) => Logger.error(`unable to create event action status ${e}`));
            });
    }

    constructor() {
        super('');
    }
}
