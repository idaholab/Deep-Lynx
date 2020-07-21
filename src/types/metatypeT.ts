import * as t from 'io-ts'
import {recordMetaT} from "./recordMetaT";

const metatypeRequired = t.type({
    name: t.string,
    description: t.string,
});

const metatypeOptional= t.partial({
    id: t.string,
    container_id: t.string,
    archived: t.boolean,
});

export const metatypeT = t.exact(t.intersection([metatypeRequired, metatypeOptional, recordMetaT]));
export const metatypesT = t.array(metatypeT);

export type MetatypeT = t.TypeOf<typeof metatypeT>
export type MetatypesT = t.TypeOf<typeof metatypesT>
