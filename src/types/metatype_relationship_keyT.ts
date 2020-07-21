import * as t from 'io-ts'
import {recordMetaT} from "./recordMetaT";

const metatypeRelationshipKeyRequired = t.type({
    name: t.string,
    required: t.boolean,
    property_name: t.string,
    description: t.string,
    data_type: t.union([
        t.literal('number'),
        t.literal('date'),
        t.literal('string'),
        t.literal('boolean'),
        t.literal('enumeration'),
        t.literal('file')
    ]),
});

const metatypeRelationshipKeyOptional = t.partial({
    id: t.string,
    archived: t.boolean,
    metatype_relationship_id: t.string,
    cardinality: t.number,
    validation: t.partial({
        regex: t.string,
        min: t.number,
        max: t.number
    }),
    unique: t.boolean,
    options: t.array(t.string),
    default_value: t.union([
        t.string,
        t.boolean,
        t.number,
        t.UnknownArray
    ])
});

export const metatypeRelationshipKeyT = t.exact(t.intersection([metatypeRelationshipKeyRequired, metatypeRelationshipKeyOptional, recordMetaT]));
export const metatypeRelationshipKeysT = t.array(metatypeRelationshipKeyT);

export type MetatypeRelationshipKeyT = t.TypeOf<typeof metatypeRelationshipKeyT>
export type MetatypeRelationshipKeysT = t.TypeOf<typeof metatypeRelationshipKeysT>
