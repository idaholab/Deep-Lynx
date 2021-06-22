export type ContainerT = {
    id: string;
    name: string;
    description: string;
    config: {
        data_versioning_enabled: boolean;
    };
    created_at: string;
    modified_at: string;
    created_by: string;
    modified_by: string;
};

export type MetatypeT = {
    id: string;
    container_id: string;
    name: string;
    description: string;
    properties: MetatypeKeyT[];
    created_at: string;
    modified_at: string;
    created_by: string;
    modified_by: string;
};

export type MetatypeRelationshipT = {
    id: string;
    container_id: string;
    name: string;
    description: string;
    properties: MetatypeRelationshipKeyT[];
    created_at: string;
    modified_at: string;
    created_by: string;
    modified_by: string;
};

export type MetatypeRelationshipPairT = {
    id: string;
    container_id: string;
    name: string;
    description: string;
    origin_metatype_id: string;
    destination_metatype_id: string;
    relationship_id: string;
    relationship_type: 'many:many' | 'one:one' | 'one:many' | 'many:one';
    relationship_pair_name?: string;
    created_at: string;
    modified_at: string;
    created_by: string;
    modified_by: string;
};

export type MetatypeKeyT = {
    id: string;
    metatype_id: string;
    name: string;
    property_name: string;
    required: boolean;
    description: string;
    data_type: 'number' | 'date' | 'string' | 'boolean' | 'enumeration' | 'file';
    archived: boolean;
    validation:
        | {
              regex: string;
              min: number;
              max: number;
          }
        | undefined;
    options: string[] | undefined;
    default_value: string | boolean | number | any[] | undefined;
    created_at: string;
    modified_at: string;
    created_by: string;
    modified_by: string;
};

export type MetatypeRelationshipKeyT = {
    id: string;
    metatype_relationship_id: string;
    name: string;
    property_name: string;
    required: boolean;
    description: string;
    data_type: 'number' | 'date' | 'string' | 'boolean' | 'enumeration' | 'file';
    archived: boolean;
    validation: {
        regex: string;
        min: number;
        max: number;
    };
    options: string[] | undefined;
    default_value: string | boolean | number | any[] | undefined;
    created_at: string;
    modified_at: string;
    created_by: string;
    modified_by: string;
};

export type DataSourceT = {
    id: string;
    container_id: string;
    name: string;
    adapter_type: string;
    active: boolean;
    config: object;
    created_at: string;
    modified_at: string;
    created_by: string;
    modified_by: string;
};

export type ImportT = {
    id: string;
    data_source_id: string;
    status: string;
    status_message: string;
    created_at: string;
    modified_at: string;
    reference: string;
    created_by: string;
    modified_by: string;

    total_records: number;
    records_inserted: number;
};

export type AssignRolePayloadT = {
    user_id: string;
    container_id: string;
    role_name: string;
};

export type ImportDataT = {
    id: number;
    data_source_id: string;
    import_id: string;
    mapping_id: string;
    errors: string[];
    data: {[key: string]: any};
    inserted_at: string;
    created_at: string;
};

export type TypeMappingT = {
    id: string;
    data_source_id: string;
    container_id: string;
    active: boolean;
    shape_hash: string;
    sample_payload: object;
    created_at: string;
    modified_at: string;
    transformations: TypeMappingTransformationT[];
};

export type TypeMappingTransformationKeyMapping = {
    key: string;
    metatype_key_id?: string;
    metatype_relationship_key_id?: string;
};

export type TypeMappingTransformationSubexpression = {
    expression: 'AND' | 'OR';
    key: string;
    operator: string;
    value: any;
};

export type TypeMappingTransformationCondition = {
    key: string;
    operator: string;
    value: any;
    subexpressions: TypeMappingTransformationSubexpression[];
};

export type TypeMappingTransformationT = {
    id: string;
    root_array: string;
    type_mapping_id: string;
    conditions?: TypeMappingTransformationCondition[];
    metatype_id?: string;
    metatype_relationship_pair_id?: string;
    origin_id_key?: string;
    destination_id_key?: string;
    unique_identifier_key?: string;
    on_conflict?: 'create' | 'update' | 'ignore';
    metatype_name?: string;
    metatype_relationship_pair_name?: string;
    keys: TypeMappingTransformationKeyMapping[];
};

export type TypeMappingTransformationPayloadT = {
    conditions?: TypeMappingTransformationCondition[];
    metatype_id?: string;
    metatype_relationship_pair_id?: string;
    origin_id_key?: string;
    destination_id_key?: string;
    unique_identifier_key?: string;
    on_conflict?: 'create' | 'update' | 'ignore';
    keys: TypeMappingTransformationKeyMapping[];
    type_mappping_id: string;
};

export type UserContainerInviteT = {
    id: number;
    email: string;
    origin_user: string;
    token: string;
    accepted: boolean;
    container_id: string;
    container_name: string;
    issued: string;
};

export type ExportT = {
    id: string;
    destination_type: string;
    adapter: 'gremlin';
    config: GremlinExportConfigT;
    container_id?: string;
    status?: 'created' | 'processing' | 'paused' | 'completed' | 'failed';
    status_message?: string;
};

export type GremlinExportConfigT = {
    kind: 'gremlin';
    traversal_source: string;
    user: string;
    key: string;
    endpoint: string;
    port: string; // port is a string due to the type expected by DL also being a string
    path: string;
    writes_per_second: number;
    mime_type?: string;
    graphson_v1?: boolean;
    created_at?: string;
    modified_at?: string;
    created_by?: string;
    modified_by?: string;
};

export type ResultT = {
    value: any;
    isError: boolean;
    error: any;
};
