import * as t from 'io-ts'
import {recordMetaT} from "../recordMetaT";
import {eventTypeT} from "./eventTypeT";

const registeredEventRequired = t.type({
    app_name: t.string,
    app_url: t.string,
});

const registeredEventOptional = t.partial({
    id: t.string,
    data_source_id: t.string,
    container_id: t.string,
    active: t.boolean,
});

export const registeredEventT = t.exact(t.intersection([registeredEventRequired, eventTypeT, registeredEventOptional, recordMetaT]));
export const registeredEventsT = t.array(registeredEventT);

export type RegisteredEventsT = t.TypeOf<typeof registeredEventsT>
export type RegisteredEventT = t.TypeOf<typeof registeredEventT>