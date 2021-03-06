import Queue = require('better-queue');
import EventQueueMapper from '../data_access_layer/mappers/event_system/event_queue_mapper';
import Result from '../common_classes/result';
import Logger from '../services/logger';
import axios from 'axios';
import Config from '../services/config';
import Event from './event';
import Task from './task';
import EventRegistration from './event_registration';
import EventRegistrationRepository from '../data_access_layer/repositories/event_system/event_registration_repository';
import {plainToClass} from 'class-transformer';
import {ConnectionOptions} from 'pg-connection-string';

const pgParse = require('pg-connection-string').parse;

/*
  QueueProcessor class manages the emission of events to their various registered
  sources.
 */
export class QueueProcessor {
    private static instance: QueueProcessor;

    public static get Instance(): QueueProcessor {
        if (!QueueProcessor.instance) {
            QueueProcessor.instance = new QueueProcessor();
        }

        return QueueProcessor.instance;
    }

    private store = makeStore();

    // define the database queue
    private messageQueue: Queue = new Queue(() => undefined, {
        store: this.store,
    });

    public emit(...events: Event[]) {
        if (Config.queue_system === 'database') {
            this.messageQueue.push(events);
        } else {
            Logger.error(`queue system ${Config.queue_system} unrecognized. Please supply supported value.`);
        }
    }
}

// StartQueue is used for getting the processing queue off the ground in a separate
// thread so as not to slow/stop the main DL thread
export async function StartQueue(): Promise<Result<boolean>> {
    Logger.debug('starting queue listener for event system');

    // process the tasks stored in the database queue. Each task may have multiple events
    if (Config.queue_system === 'database') {
        while (true) {
            const tasks: Task[] = await EventQueueMapper.Instance.List();

            for (const task of tasks) {
                // transform the incoming string into json and then to the Event class
                // because it's stored in the database as a string, not actual json
                const events: Event[] = plainToClass(Event, JSON.parse(task.task!));

                for (const event of events) {
                    let registeredEvents: EventRegistration[];
                    let eventRepo = new EventRegistrationRepository();
                    eventRepo = eventRepo.where().eventType('eq', event.type!);

                    if (event.source_type === 'data_source') {
                        const regResult = await eventRepo.and().dataSourceID('eq', event.source_id!).list();
                        if (regResult.isError) Logger.debug(`error listing registered events for event type ${event.type} and ID ${event.source_id}`);

                        registeredEvents = regResult.value;
                    } else {
                        const regResult = await eventRepo.and().containerID('eq', event.source_id!).list();
                        if (regResult.isError) Logger.debug(`error listing registered events for event type ${event.type} and ID ${event.source_id}`);

                        registeredEvents = regResult.value;
                    }

                    for (const rEvent of registeredEvents) {
                        await axios
                            .post(rEvent.app_url!, event.data)
                            .then(() => {
                                Logger.debug(`event: ${event.type} on ${event.source_type} ${event.source_id} sent to ${rEvent.app_name} at ${rEvent.app_url}`);
                            })
                            .catch((e) => {
                                Logger.error(
                                    `event: ${event.type} on ${event.source_type} ${event.source_id} 
                                    failed to send to ${rEvent.app_name} at ${rEvent.app_url} ${e}`,
                                );
                            });
                    }
                }
                // remove the task from the queue
                // task must be removed even if there was an error (potential for multiple listeners)
                await EventQueueMapper.Instance.Delete(task.id!);
            }
            await delay(Config.queue_poll_interval);
        }
    } else {
        return new Promise((resolve) => resolve(Result.Failure(`queue system ${Config.queue_system} unrecognized. Please supply supported value.`)));
    }

    return new Promise((resolve) => resolve(Result.Success(true)));
}

function makeStore() {
    const connectionObject: ConnectionOptions = pgParse(Config.core_db_connection_string);

    const store = {
        type: 'sql',
        dialect: 'postgres',
        host: connectionObject.host,
        port: connectionObject.port ? Number(connectionObject.port) : 5432,
        username: connectionObject.user,
        password: connectionObject.password,
        dbname: connectionObject.database,
        tableName: 'queue_tasks',
    };

    return store;
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
