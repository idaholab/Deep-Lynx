import * as t from 'io-ts'
import {recordMetaT} from "../recordMetaT";
import {DateFromISOString} from "io-ts-types/DateFromISOString";

// keyMapping contains fields for both metatype and metatype relationship in order
// to handle a type mapping that results in both a NodeT and EdgeT final product.
const keyMapping = t.partial({
    key: t.string,
    metatype_key_id: t.string,
    metatype_relationship_key_id: t.string,
    value: t.unknown,
    value_type:  t.union([
        t.literal('number'),
        t.literal('date'),
        t.literal('string'),
        t.literal('boolean'),
        t.literal('enumeration'),
        t.literal('file')
    ]),
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
    operator: t.keyof({
        "==": null,
        "!=": null,
        "in": null,
        "contains":null,
        ">": null,
        ">=": null,
        "<": null,
        "<=": null
    }),
    value: t.unknown
})

const typeTransformationConditionRequired = t.type({
    key: t.string,
    operator: t.keyof({
        "==": null,
        "!=": null,
        "in": null,
        "contains":null,
        ">": null,
        ">=": null,
        "<": null,
        "<=": null
    }),
    value: t.unknown
})

const typeTransformationConditionalOptional = t.partial({
    subexpressions: t.array(typeTransformationConditionalSubexpression)
})

const typeTransformationRequired = t.type({
    keys: t.array(keyMapping),
})

export const typeTransformationCondition = t.intersection([typeTransformationConditionRequired, typeTransformationConditionalOptional])
export type TypeTransformationConditionT = t.TypeOf<typeof typeTransformationCondition>

const typeTransformationOptional = t.partial({
    id: t.string,
    type_mapping_id: t.string,
    conditions: t.array(typeTransformationCondition),
    metatype_id: t.string, // optional because mapping could be either type or relationship
    metatype_relationship_pair_id: t.string,
    origin_id_key: t.string,
    destination_id_key: t.string,
    root_array: t.string, // allows the user to specify that this transformation be applied to all objects in an array

    unique_identifier_key: t.string,
    // composite fields
    metatype_name: t.string,
    metatype_relationship_pair_name: t.string
})

export const typeTransformationT = t.intersection([typeTransformationRequired, typeTransformationOptional, recordMetaT])

export type TypeMappingT = t.TypeOf<typeof typeMappingT>
export type TypeTransformationT = t.TypeOf<typeof typeTransformationT>

