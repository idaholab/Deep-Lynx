import Queue = require('better-queue')
import {EventT, EventsT} from "../types/events/eventT";
import Result from "../result";
import Logger from "../logger";

export function StartQueue(): Promise<Result<boolean>> {
    Logger.debug('starting queue listener for event system');
    // define the queue
    const q: Queue = new Queue((events: EventsT, cb) => {
      for(const event in events) {
      }
      cb(null);
    });

    return new Promise(resolve => resolve(Result.Success(true)));
}