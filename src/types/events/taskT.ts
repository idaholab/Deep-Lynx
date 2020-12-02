import * as t from 'io-ts'
import {eventsT} from "./eventT"

const taskRequired = t.type({
    id: t.string,
    task: eventsT,
    priority: t.number,
    added: t.number,
});

const taskOptional = t.partial({
    lock: t.string
});

export const taskT = t.exact(t.intersection([taskRequired, taskOptional]));
export const tasksT = t.array(taskT);

export type TasksT = t.TypeOf<typeof tasksT>
export type TaskT = t.TypeOf<typeof taskT>