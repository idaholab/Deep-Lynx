import * as t from 'io-ts'
import {eventTypeT} from "./eventTypeT";

const eventRequired = t.type({
    source_id: t.string,
    source_type: t.keyof({
        'data source': null,
        'container': null,
    }),
});

const eventOptional = t.partial({
    data: t.unknown
});

export const eventT = t.exact(t.intersection([eventRequired, eventTypeT, eventOptional]));
export const eventsT = t.array(eventT);

export type EventsT = t.TypeOf<typeof eventsT>
export type EventT = t.TypeOf<typeof eventT>