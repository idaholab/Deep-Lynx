/*
    Standalone loop for processing events. This loop retrieves all events matching the filters below
    and then finds event actions that match those events (on container id, data source id, and event type).
    For any matching event actions, the proper action is taken to send the event to the specified destination.
 */

import Logger from '../services/logger';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import EventRepository from '../data_access_layer/repositories/event_system/event_repository';
import EventActionRepository from '../data_access_layer/repositories/event_system/event_action_repository';
import EventAction from '../domain_objects/event_system/event_action';
import {graphql} from 'graphql';
import Event from '../domain_objects/event_system/event';
import GraphQLSchemaGenerator from '../graphql/schema';
import {Emailer} from '../services/email/email';
import {BasicEmailTemplate} from '../services/email/templates/basic';
import {parentPort} from 'worker_threads';

const postgresAdapter = PostgresAdapter.Instance;

void postgresAdapter.init().then(() => {
    const repo = new EventRepository();

    repo.where()
        .processed('is not null')
        .list({
            limit: 1000,
        })
        .then((results) => {
            if (results.isError) {
                Logger.error(`unable to list records for event loop ${results.error?.error}`);
                process.exit(1);
                return;
            }

            if (results.value.length === 0) {
                if (parentPort) parentPort.postMessage('done');
                else {
                    process.exit(0);
                }
            }

            // loop through each event and notify according to event actions
            const processPromises = [];

            for (const event of results.value) {
                processPromises.push(processFunction(event));
            }
        })
        .catch((e) => {
            Logger.error(`unable to process records for event loop ${e}`);
            process.exit(1);
        });
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
            .dataSourceID('eq', 'NULL')
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
    if (event.event_type === 'manual') {
        if (event.event_config && event.event_config.destination) {
            // filtering on a match between event_config destination and event action destination data source id
            actionEvents = actionEvents.filter((action) => action.destination_data_source_id === event.event_config.destination);
        }
    }

    // send out events and create event action status
    for (const action of actionEvents) {
        // set default payload to contents of event.event
        let payload: any = event.event;

        // determine action type and act accordingly
        switch (action.action_type) {
            case 'send_query':
                void repo.sendEvent(payload, event, action, sourceType, sourceID);
                break;

            case 'send_data':
                // attempt to query the data directly and send out
                const generator = new GraphQLSchemaGenerator();
                await generator
                    .ForContainer(event.container_id!)
                    .then(async (schemaResult) => {
                        if (schemaResult.isError) {
                            Logger.error(`Unable to process query from event ${event.id}. Error: ${schemaResult.error}`);
                            return;
                        } else {
                            await graphql(schemaResult.value, JSON.stringify(event.event), event.container_id)
                                .then((result) => {
                                    payload = result.data;
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
                void Emailer.Instance.send(action.destination!, 'Event', BasicEmailTemplate(JSON.stringify(event.event!))).then((result) => {
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

    // update event as processed
    repo.markProcessed(event.id!).catch((e) => {
        Logger.error(`Unable to mark event ${event.id} as processed. ${e}`);
    });
}
