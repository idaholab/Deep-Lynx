import * as t from "io-ts";
import {recordMetaT} from "./recordMetaT";

const metatypeRelationshipPairRequired = t.type({
    name: t.string,
    description: t.string,
    origin_metatype_id: t.string,
    destination_metatype_id: t.string,
    relationship_id: t.string,
    relationship_type: t.keyof({
        "many:many": null,
        "one:one": null,
        "one:many": null,
        "many:one": null
    })
});

const metatypeRelationshipPairOptional= t.partial({
    id: t.string,
    archived: t.boolean,
    container_id: t.string,
});

export const metatypeRelationshipPairT = t.exact(t.intersection([metatypeRelationshipPairRequired, metatypeRelationshipPairOptional, recordMetaT]));
export const metatypeRelationshipPairsT = t.array(metatypeRelationshipPairT);

export type MetatypeRelationshipPairT = t.TypeOf<typeof metatypeRelationshipPairT>
export type MetatypeRelationshipPairsT = t.TypeOf<typeof metatypeRelationshipPairsT>
