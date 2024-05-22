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
import EventActionRepository from './event_action_repository';
import GraphQLRunner from '../../../graphql/schema';
import {graphql} from 'graphql';
import {Emailer} from '../../../services/email/email';
import {BasicEmailTemplate} from '../../../services/email/templates/basic';

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

        await this.process(e);

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

    async process(event: Event) {
        // retrieve associated event actions
        // if a data source id is provided, grab all matching data source level events
        // otherwise grab container level events that match and don't have a data source id
        const repo = new EventRepository();
        const actionRepo = new EventActionRepository();
        let actionEvents: EventAction[] = [];

        // values for future logging
        let sourceType = '';
        let sourceID = '';

        if (event.data_source_id) {
            const actionEventsResult = await actionRepo
                .where()
                .containerID('eq', event.container_id)
                .and()
                .dataSourceID('eq', event.data_source_id)
                .and()
                .eventType('eq', event.event_type)
                .and()
                .active('eq', 'true')
                .list();
            actionEvents = actionEventsResult.value;

            sourceType = 'data source';
            sourceID = event.data_source_id;
        } else {
            const actionEventsResult = await actionRepo
                .where()
                .containerID('eq', event.container_id)
                .and()
                .dataSourceID('is null', undefined)
                .and()
                .eventType('eq', event.event_type)
                .and()
                .active('eq', 'true')
                .list();
            actionEvents = actionEventsResult.value;

            sourceType = 'container';
            sourceID = event.container_id || '';
        }

        // filter by events with a specific destination identified in event_config
        if (event.event_config && event.event_config.destination) {
            // filtering on a match between event_config destination and event action destination data source id
            actionEvents = actionEvents.filter((action) => action.destination_data_source_id === event.event_config.destination);
        }

        // send out events and create event action status
        for (const action of actionEvents) {
            // set default payload to contents of event.event and id
            const payload: any = {
                id: event.id,
                event: event.event,
            };

            // determine action type and act accordingly
            switch (action.action_type) {
                case 'default':
                    void repo.sendEvent(payload, event, action, sourceType, sourceID);
                    break;

                case 'send_data':
                    // attempt to query the data directly and send out
                    const generator = new GraphQLRunner();
                    await generator
                        .ForContainer(event.container_id!, {})
                        .then(async (schemaResult) => {
                            if (schemaResult.isError) {
                                Logger.error(`Unable to process query from event ${event.id}. Error: ${schemaResult.error}`);
                                return;
                            } else {
                                await graphql({
                                    schema: schemaResult.value,
                                    source: event.event.query,
                                    variableValues: event.event.variables,
                                })
                                    .then((result) => {
                                        // provide endpoint with query of event, and set event body as the query result
                                        payload.query = event.event;
                                        payload.event = result.data;
                                        void repo.sendEvent(payload, event, action, sourceType, sourceID);
                                    })
                                    .catch((e) => {
                                        Logger.error(`Unable to process query from event ${event.id}. Error: ${e}`);
                                        return;
                                    });
                            }
                        })
                        .catch((e) => {
                            Logger.error(`Unable to process query from event ${event.id}. Error: ${e}`);
                            return;
                        });

                    break;

                case 'email_user':
                    void Emailer.Instance.send(action.destination!, 'Event', BasicEmailTemplate(JSON.stringify(event.event))).then((result) => {
                        if (result.isError) Logger.error(`unable to send event email ${result.error}`);
                        else
                            Logger.debug(`event: ${event.event_type} on ${sourceType} ${sourceID} sent to 
                    event action ${action.id} of type ${action.action_type} at ${action.destination}`);
                    });

                    break;

                default:
                    break;
            }
        }

        return Promise.resolve();
    }

    constructor() {
        super('');
    }
}
