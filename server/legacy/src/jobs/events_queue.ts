import {QueueFactory} from '../services/queue/queue';
import Config from '../services/config';
import Logger from '../services/logger';
import {Writable} from 'stream';
import {plainToClass} from 'class-transformer';
import Event from '../domain_objects/event_system/event';
import EventRepository from '../data_access_layer/repositories/event_system/event_repository';
import EventActionRepository from '../data_access_layer/repositories/event_system/event_action_repository';
import EventAction from '../domain_objects/event_system/event_action';
import GraphQLRunner from '../graphql/schema';
import {graphql} from 'graphql';
import {Emailer} from '../services/email/email';
import {BasicEmailTemplate} from '../services/email/templates/basic';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import {parentPort} from 'worker_threads';
import Cache from '../services/cache/cache';

// handle cache clears from parent IF memory cache
if (Config.cache_provider === 'memory') {
    parentPort?.on('message', (message: any) => {
        const parts = message.split('|');
        // if a two part message it's a deleted key
        if (parts.length === 2 && parts[0] === 'deleted') {
            void Cache.del(parts[1]);
        }

        if (parts.length === 1 && parts[0] === 'flush') {
            void Cache.flush();
        }
    });
}

void PostgresAdapter.Instance.init()
    .then(() => {
        void QueueFactory().then((queue) => {
            const destination = new Writable({
                objectMode: true,
                write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
                    const event = plainToClass(Event, chunk as object);
                    processFunction(event)
                        .then(() => {
                            callback();
                        })
                        .catch((e) => {
                            Logger.error(`unable to process event from queue ${e}`);
                            callback();
                        });
                },
            });

            destination.on('error', (e: Error) => {
                void PostgresAdapter.Instance.close();

                Logger.error(`unexpected error in processing queue thread ${e}`);
                if (parentPort) parentPort.postMessage('done');
                else {
                    process.exit(1);
                }
            });

            queue.Consume(Config.events_queue, destination);
        });
    })
    .catch((e) => {
        void PostgresAdapter.Instance.close();

        Logger.error(`unexpected error in events queue thread ${e}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(1);
        }
    });

async function processFunction(event: Event) {
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
