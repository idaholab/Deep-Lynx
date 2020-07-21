import * as t from "io-ts";
import {recordMetaT} from "./recordMetaT";

const metatypeRelationshipRequired = t.type({
    name: t.string,
    description: t.string,
});

const metatypeRelationshipOptional= t.partial({
    id: t.string,
    container_id: t.string,
    archived: t.boolean,
});

export const metatypeRelationshipT = t.exact(t.intersection([metatypeRelationshipRequired, metatypeRelationshipOptional, recordMetaT]));
export const metatypeRelationshipsT = t.array(metatypeRelationshipT);

export type MetatypeRelationshipT = t.TypeOf<typeof metatypeRelationshipT>
export type MetatypeRelationshipsT = t.TypeOf<typeof metatypeRelationshipsT>
