import * as t from 'io-ts'
import {recordMetaT} from "../recordMetaT";

// keyMapping contains fields for both metatype and metatype relationship in order
// to handle a type mapping that results in both a NodeT and EdgeT final product.
const keyMapping = t.partial({
    key: t.string,
    metatype_key_id: t.string,
    metatype_relationship_key_id: t.string
})

const typeMappingRequired = t.type({
    unique_identifier_key: t.string
})

const typeMappingOptional = t.partial({
    id: t.string,
    data_source_id: t.string,
    action_key: t.string,
    action_value: t.keyof({
        "create": null,
        "update": null,
        "delete": null
    }),
    type_key: t.string,
    type_value: t.string,
    relationship_type_key: t.string,
    relationship_type_value: t.string,
    container_id: t.string,
    example_payload: t.unknown,
    metatype_id: t.string, // optional because mapping could be either type or relationship
    metatype_relationship_pair_id: t.string,
    origin_key: t.string,
    destination_key: t.string,
    keys: t.array(keyMapping),
    ignored_keys: t.array(t.string),

    // composite fields
    metatype_name: t.string,
    metatype_relationship_pair_name: t.string
})

export const typeMappingT = t.intersection([typeMappingRequired, typeMappingOptional, recordMetaT])

export type TypeMappingT = t.TypeOf<typeof typeMappingT>
