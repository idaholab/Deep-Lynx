import * as t from 'io-ts'
import {recordMetaT} from "../recordMetaT";
import {DateFromISOString} from "io-ts-types/DateFromISOString";

// keyMapping contains fields for both metatype and metatype relationship in order
// to handle a type mapping that results in both a NodeT and EdgeT final product.
const keyMapping = t.partial({
    key: t.string,
    metatype_key_id: t.string,
    metatype_relationship_key_id: t.string
})

export const typeMappingT = t.type({
    id: t.string,
    container_id: t.string,
    sample_payload: t.unknown,
    data_source_id: t.string,
    active: t.boolean,
    shape_hash: t.string,
    created_at: t.union([DateFromISOString, t.string]),
    modified_at: t.union([DateFromISOString, t.string])
})

const typeTransformationConditionalSubexpression = t.type({
    expression: t.keyof({
        "AND": null,
        "OR": null
    }),
    key: t.string,
    operator: t.string,
    value: t.unknown
})

const typeTransformationConditionRequired = t.type({
    key: t.string,
    operator: t.string,
    value: t.unknown
})

const typeTransformationConditionalOptional = t.partial({
    subexpressions: t.array(typeTransformationConditionalSubexpression)
})

const typeTransformationRequired = t.type({
    keys: t.array(keyMapping),
})

const typeTransformationOptional = t.partial({
    id: t.string,
    type_mapping_id: t.string,
    conditions: t.array(t.intersection([typeTransformationConditionRequired, typeTransformationConditionalOptional])),
    metatype_id: t.string, // optional because mapping could be either type or relationship
    metatype_relationship_pair_id: t.string,
    origin_id_key: t.string,
    destination_id_key: t.string,

    unique_identifier_key: t.string,
    on_conflict: t.keyof({
        "create": null,
        "update": null,
        "ignore": null
    }),

    // composite fields
    metatype_name: t.string,
    metatype_relationship_pair_name: t.string
})

export const typeTransformationT = t.intersection([typeTransformationRequired, typeTransformationOptional, recordMetaT])

export type TypeMappingT = t.TypeOf<typeof typeMappingT>
export type TypeTransformationT = t.TypeOf<typeof typeTransformationT>
