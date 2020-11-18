export type ContainerT  = {
    id: string
    name: string
    description: string
    created_at: string
    modified_at: string
    created_by: string
    modified_by: string
}

export type MetatypeT = {
    id: string
    container_id: string
    name: string
    description: string
    properties: MetatypeKeyT[]
    created_at: string
    modified_at: string
    created_by: string
    modified_by: string
}

export type MetatypeRelationshipT = {
    id: string
    container_id: string
    name: string
    description: string
    properties: MetatypeRelationshipKeyT[]
    created_at: string
    modified_at: string
    created_by: string
    modified_by: string
}

export type MetatypeRelationshipPairT = {
    id: string
    container_id: string
    name: string
    description: string
    origin_metatype_id: string
    destination_metatype_id: string
    relationship_id: string
    relationship_type: "many:many" | "one:one" | "one:many" | "many:one"
    created_at: string
    modified_at: string
    created_by: string
    modified_by: string
}

export type MetatypeKeyT= {
    id: string
    metatype_id: string
    name: string,
    property_name: string,
    required: boolean
    description: string
    data_type: "number" | "date" | "string" | "boolean" | "enumeration" | "file"
    archived: boolean
    cardinality: number | undefined
    validation: {
        regex: string,
        min: number,
        max: number
    } | undefined
    unique: boolean
    options: string[] | undefined
    default_value: string | boolean | number | any[] | undefined
    created_at: string
    modified_at: string
    created_by: string
    modified_by: string
}

export type MetatypeRelationshipKeyT= {
    id: string
    metatype_relationship_id: string
    name: string,
    property_name: string,
    required: boolean
    description: string
    data_type: "number" | "date" | "string" | "boolean" | "enumeration" | "file"
    archived: boolean
    cardinality: number | undefined
    validation: {
        regex: string,
        min: number,
        max: number
    } | undefined
    unique: boolean
    options: string[] | undefined
    default_value: string | boolean | number | any[] | undefined
    created_at: string
    modified_at: string
    created_by: string
    modified_by: string
}

export type DataSourceT = {
    id: string
    container_id: string
    name: string
    adapter_type: string
    active: boolean
    config: object
    created_at: string
    modified_at: string
    created_by: string
    modified_by: string
}

export type ImportT = {
    id: string
    data_source_id: string
    status: string
    status_message: string
    created_at: string
    modified_at: string
    reference: string
    created_by: string
    modified_by: string
}

export type AssignRolePayloadT = {
   user_id: string
   container_id: string
   role_name: string
}

export type UnmappedDataT = {
    id: number
    data: {[key:string]: any}
    data_source_id: string
    import_id: string
}

export type ImportDataT = {
    id: number
    data_source_id: string
    import_id: string
    mapping_id: string
    errors: string[]
    data: {[key:string]: any}
    inserted_at: string
    created_at: string
}

export type TypeMappingT = {
    id: string
    data_source_id: string
    container_id: string
    relationship_type_key: string
    relationship_type_value: string
    metatype_id: string
    metatype_name: string
    metatype_relationship_pair_id: string
    metatype_relationship_pair_name: string
    origin_key: string
    destination_key: string
    type_key: string
    type_value: string
    unique_identifier_key: string
    keys: {[key: string]: any}[]
    ignored_keys: {[key: string]: any}[]
    example_payload: any
}

export type TypeMappingPayloadT = {
    type_key: string
    type_value: string
    action_key?: string
    action_value?: "create" | "update" | "delete"
    relationship_type_key?: string
    relationship_type_value?: string
    origin_key?: string
    destination_key?: string
    unique_identifier_key: string
    metatype_id?: string
    metatype_relationship_pair_id?: string
    keys: {[key: string]: any}[]
    ignored_keys: {[key: string]: any}[]
    example_payload: any
}

export type UserContainerInviteT = {
    id: number
    email: string
    origin_user: string,
    token: string,
    accepted: boolean,
    container_id: string
    container_name: string
    issued: string
}

export type ResetPasswordPayloadT = {
    email: string
    token: string
    new_password: string
}

export type NewUserPayloadT = {
    display_name: string
    email: string
    password: string
    identity_provider: "username_password"
}
