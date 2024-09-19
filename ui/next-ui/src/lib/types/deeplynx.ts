export type ContainerT = {
  id: string;
  name: string;
  description: string;
  config: {
    data_versioning_enabled: boolean;
    ontology_versioning_enabled: boolean;
    enabled_data_sources: string[];
  };
  created_at: string;
  modified_at: string;
  created_by: string;
  modified_by: string;
};

export type ConversionT = {
  original_value: any;
  converted_value?: any;
  errors?: string;
};

export type DataSourceT = {
  id?: string;
  container_id?: string;
  name: string;
  adapter_type: string | undefined;
  active: boolean;
  archived?: boolean;
  config:
    | StandardDataSourceConfig
    | HttpDataSourceConfig
    | AvevaDataSourceConfig
    | TimeseriesDataSourceConfig
    | P6DataSourceConfig
    | CustomDataSourceConfig
    | undefined;
  created_at?: string;
  modified_at?: string;
  created_by?: string;
  modified_by?: string;

  // composite fields, not on original return
  data_imported?: number;
};

export type CustomTemplateFieldT = {
  name: string;
  value?: string;
  encrypt?: boolean;
  required?: boolean;
};

export type DataSourceTemplateT = {
  id?: string;
  name: string;
  custom_fields?: CustomTemplateFieldT[];
  redirect_address: string;
  authorized?: boolean;
  saveable?: boolean;
};

// Datasource Configs
export type StandardDataSourceConfig = {
  kind: "standard" | "manual";
  data_type: "json" | "csv";
  stop_nodes?: string[];
  value_nodes?: string[];
  data_retention_days?: number;
  raw_retention_enabled?: boolean;
};

export type TimeseriesColumn = {
  id?: string;
  column_name?: string;
  property_name?: string;
  is_primary_timestamp: boolean;
  unique: boolean;
  type?: string;
  date_conversion_format_string?: string;
};

export type TimeseriesNodeParameter = {
  type?: string;
  operator?: string;
  key?: any;
  value?: any;
};

// we extend so the class-transformer can work properly, even though we don't actually need it
export type TimeseriesDataSourceConfig = {
  kind: "timeseries";
  columns: TimeseriesColumn[];
  chunk_interval?: string; // only required if they are using a bigint as a primary timestamp
  attachment_parameters: TimeseriesNodeParameter[];
  stop_nodes?: string[];
  value_nodes?: string[];
  data_retention_days?: number;
  raw_retention_enabled?: boolean;
  fast_load_enabled?: boolean;
};

export type HttpDataSourceConfig = {
  kind: "http";
  endpoint: string;
  secure: boolean;
  auth_method: "none" | "basic" | "token";
  poll_interval: number; // in minutes
  timeout: number; // milliseconds
  token?: string; // security token, set if auth method is token
  username?: string; // auth method basic
  password?: string; // auth method basic
  stop_nodes?: string[];
  value_nodes?: string[];
  data_retention_days?: number;
  raw_retention_enabled?: boolean;
};

export type AvevaDataSourceConfig = {
  kind: "aveva";
  ignore_dbs: string[];
  ignore_element_types: string[];
  ifc_element_types: string[];
  ifc_settings: {
    format: string;
    data_level: string;
    component_level: boolean;
    log_detail: number;
    arc_tolerance: string;
    tube: boolean;
    cl: boolean;
    insu_translucency: number;
    obst_translucency: number;
    root: number;
    pipe: number;
    nozzle: number;
    structure: number;
    cable: number;
  };
  stop_nodes?: string[];
  value_nodes?: string[];
  data_retention_days?: number;
  raw_retention_enabled?: boolean;
};

export type P6DataSourceConfig = {
  kind: "p6";
  id?: string;
  name?: string;
  endpoint: string;
  projectID: string;
  username?: string;
  password?: string;
  stop_nodes?: string[];
  value_nodes?: string[];
  data_retention_days?: number;
  raw_retention_enabled?: boolean;
};

export type CustomDataSourceConfig = {
  kind: "custom";
  template: DataSourceTemplateT;
  stop_nodes?: string[];
  value_nodes?: string[];
  data_retention_days?: number;
  raw_retention_enabled?: boolean;
};

export type EdgeT = {
  selected_edge?: boolean;
  id: string;
  container_id: string;
  relationship_pair_id?: string;
  data_source_id: string;
  metatype_relationship: MetatypeRelationshipT;
  destination_node?: NodeT;
  origin_node?: NodeT;
  origin_id?: string;
  destination_id?: string;
  metatype_relationship_name?: string;
  relationship_id?: string;
  properties: PropertyT[] | object;
  metadata_properties?: object;
  metadata?: MetadataT[];
  created_at: string;
  modified_at: string;
  data_staging_id: string;
  import_data_id: string;
  type_mapping_transformation_id: string;
  created_by?: string;
};

export type FileT = {
  id: string;
  container_id: string;
  data_source_id: string;
  file_name: string;
  file_size: number;
  md5hash: string;
  adapter_file_path: string;
  adapter: "filesystem" | "azure_blob" | "mock";
  metadata: object;
  created_at: string;
  modified_at: string;
  created_by: string;
  modified_by: string;
};

export type KeyPairT = {
  user_id: string;
  key: string;
  secret_raw: string;
};

export type MetadataT = {
  conversions?: ConversionT[];
  failed_conversions?: ConversionT[];
};

export type MetatypeKeyT = {
  id?: string;
  metatype_id?: string;
  metatype_name?: string;
  container_id: string;
  name: string;
  property_name: string;
  required: boolean;
  description: string;
  data_type:
    | "number"
    | "number64"
    | "float"
    | "float64"
    | "date"
    | "string"
    | "boolean"
    | "enumeration"
    | "file";
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
  created_at?: string;
  modified_at?: string;
  created_by?: string;
  modified_by?: string;
  deleted_at?: string;
  ontology_version?: string;
  uuid?: string;
};

export type MetatypeT = {
  id?: string;
  container_id: string;
  name: string;
  description: string;
  keys: MetatypeKeyT[];
  created_at?: string;
  modified_at?: string;
  created_by?: string;
  modified_by?: string;
  deleted_at?: string;
  parent_id?: string;
  parent_name?: string;
  ontology_version?: string;
  old_id?: string;
  uuid?: string;
  relationships?: MetatypeRelationshipPairT[];
};

export type MetatypeRelationshipT = {
  id?: string;
  container_id: string;
  name: string;
  description: string;
  keys: MetatypeRelationshipKeyT[];
  created_at?: string;
  modified_at?: string;
  created_by?: string;
  modified_by?: string;
  parent_id?: string;
  ontology_version?: string;
  old_id?: string;
};

export type MetatypeRelationshipKeyT = {
  id?: string;
  metatype_relationship_id?: string;
  container_id: string;
  name: string;
  property_name: string;
  required: boolean;
  description: string;
  data_type:
    | "number"
    | "number64"
    | "float"
    | "float64"
    | "date"
    | "string"
    | "boolean"
    | "enumeration"
    | "file";
  archived: boolean;
  validation: {
    regex: string;
    min: number;
    max: number;
  };
  options: string[] | undefined;
  default_value: string | boolean | number | any[] | undefined;
  created_at?: string;
  modified_at?: string;
  created_by?: string;
  modified_by?: string;
  ontology_version?: string;
  uuid?: string;
};

export type MetatypeRelationshipPairT = {
  id?: string;
  container_id: string;
  name: string;
  description: string;
  origin_metatype_id?: string;
  origin_metatype_name: string;
  destination_metatype_id?: string;
  destination_metatype_name: string;
  relationship_id?: string;
  relationship_type: "many:many" | "one:one" | "one:many" | "many:one";
  relationship_name?: string;
  created_at?: string;
  modified_at?: string;
  created_by?: string;
  modified_by?: string;
  ontology_version?: string;
  old_id?: string;
  origin_metatype?: MetatypeT;
  destination_metatype?: MetatypeT;
  relationship?: MetatypeRelationshipT;
  metatype_id?: string;
  metatype_name?: string;
};

export type NodeT = {
  // these first few fields are for the graph viewer component, they don't get returned by the API
  color?: any;
  collapsed?: boolean;
  selected_node?: boolean;
  x?: number;
  y?: number;
  label?: any;
  id: string;
  original_id?: string;
  metatype_id: string;
  metatype_name: string;
  metatype?: MetatypeT;
  properties: PropertyT[] | object;
  metadata_properties?: object;
  metadata?: MetadataT[];
  raw_properties?: string; // JSON string with the raw properties
  container_id: string;
  original_data_id?: string;
  data_source_id: string;
  created_at: string;
  modified_at: string;
  incoming_edges?: EdgeT[];
  outgoing_edges?: EdgeT[];
  import_data_id?: string;
  type_mapping_transformation_id?: string;
  data_staging_id?: string;
  created_by?: string;
};

export type PropertyT = {
  key: string;
  value: string;
  type: string;
};

export type UserT = {
  id: string;
  role: string;
  identity_provider_id: string;
  identity_provider: string;
  display_name: string;
  email: string;
  active: boolean;
  admin: boolean;
  permissions: string[][];
  iat: number;
  exp: number;
  token: string;
};

export type DagT = {
  dag_id: string;
  dag_run_id: string;
  state: string;
};
