import Queue = require('better-queue')
import { ConnectionStringParser } from "connection-string-parser";
import { EventT, EventsT } from "../../types/events/eventT";
import { RegisteredEventT, RegisteredEventsT } from "../../types/events/registered_eventT";
import { TaskT, TasksT } from "../../types/events/taskT";
import EventStorage from "../../data_storage/events/event_storage";
import QueueStorage from "../../data_storage/events/queue_storage";
import Result from "../../result";
import Logger from "../../logger";
import axios, { AxiosResponse } from "axios";
import Config from "../../config";

export class QueueProcessor {

  private static instance: QueueProcessor;

  public static get Instance(): QueueProcessor {
    if (!QueueProcessor.instance) {
      QueueProcessor.instance = new QueueProcessor()
    }

    return QueueProcessor.instance
  }

  private store = makeStore();

  // define the database queue
  private messageQueue: Queue = new Queue(() => undefined, {
    store: this.store
  });

  public emit(events: EventsT) {
    if (Config.queue_system === 'database') {
      this.messageQueue.push(events)
    } else {
      Logger.error(`queue system ${Config.queue_system} unrecognized. Please supply supported value.`)
    }
  }
}

export async function StartQueue(): Promise<Result<boolean>> {
  Logger.debug('starting queue listener for event system');

  // process the tasks stored in the database queue. Each task may have multiple events
  if (Config.queue_system === 'database') {
    while (true) {

      const tasks: TaskT[] = await QueueStorage.Instance.List();

      for (const task of tasks) {

        const events: EventT[] = task.task;

        for (const event of events) {

          let registeredEvents: RegisteredEventsT;

          if (event.source_type === 'data_source') {
            const regResult = await EventStorage.Instance.ListByDataSource(event.type, event.source_id)
            if (regResult.isError) Logger.debug(`error listing registered events for event type ${event.type} and ID ${event.source_id}`)

            registeredEvents = regResult.value
          } else {
            const regResult = await EventStorage.Instance.ListByContainer(event.type, event.source_id)
            if (regResult.isError) Logger.debug(`error listing registered events for event type ${event.type} and ID ${event.source_id}`)

            registeredEvents = regResult.value
          }

          for (const rEvent of registeredEvents) {
            await axios.post(rEvent.app_url, event.data)
              .then(() => {
                Logger.debug(`event: ${event.type} on ${event.source_type} ${event.source_id} sent to ${rEvent.app_name} at ${rEvent.app_url}`)
              })
              .catch((e) => {
                Logger.error(`event: ${event.type} on ${event.source_type} ${event.source_id} failed to send to ${rEvent.app_name} at ${rEvent.app_url} ${e}`)
              });
          }
        }
        // remove the task from the queue
        // task must be removed even if there was an error (potential for multiple listeners)
        await QueueStorage.Instance.PermanentlyDelete(task.id);
      }
      await delay(Config.queue_poll_interval)
    }
  } else {
    return new Promise(resolve => resolve(Result.Failure(`queue system ${Config.queue_system} unrecognized. Please supply supported value.`)));
  }

  return new Promise(resolve => resolve(Result.Success(true)));
}

function makeStore() {
  const connectionStringParser = new ConnectionStringParser({
    scheme: "postgresql",
    hosts: []
  });

  const connectionObject = connectionStringParser.parse(Config.core_db_connection_string);

  const store = {
    type: 'sql',
    dialect: 'postgres',
    host: connectionObject.hosts[0].host,
    port: 5432,
    username: connectionObject.username!,
    password: connectionObject.password!,
    dbname: connectionObject.endpoint!,
    tableName: "queue_tasks"
  };

  return store;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}