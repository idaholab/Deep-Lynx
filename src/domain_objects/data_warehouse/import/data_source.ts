import {BaseDomainClass, NakedDomainClass} from '../../../common_classes/base_domain_class';
import {
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsDefined,
    IsIn,
    IsObject,
    IsOptional,
    IsString,
    IsUrl,
    ValidateIf,
    ValidateNested,
    Validate,
    Matches,
    ValidationOptions,
    registerDecorator,
    ValidationArguments,
    IsNotEmpty,
} from 'class-validator';
import {Exclude, Type} from 'class-transformer';
import {PoolClient} from 'pg';
import {Transform} from 'stream';
import {DataRetentionDays} from '../../validators/data_retention_validator';
import {WebSocket} from 'ws';
import { Bucket, ChangeBucketPayload } from 'deeplynx-timeseries';

// ReceiveDataOptions will allow us to grow the potential options needed by the ReceiveData
// function of various implementations without having to grow the parameter list
export class ReceiveDataOptions {
    transaction?: PoolClient;
    importID?: string;
    overrideJsonStream? = false; // needed if you're passing raw json objects or an object stream
    transformStream?: Transform; // streams to pipe to, prior to piping to the JSONStream
    bufferSize = 1000; // buffer size for timeseries records to be inserted into the db, modify this at runtime if needed
    websocket?: WebSocket;
    has_files?: boolean = false; // dictates that this piece of data has files attached
    errorCallback?: (error: any) => void;
    fast_load?: boolean = false; // dictates whether to use the csv fast load module on the timeseries source
}

/*
 Add new configurations by converting kind to a union type in the BaseConfig
 and making sure the value you have in your config is the same unique string you
 used to extend kind - these are called discriminator properties and allow the
 class-transformer package to determine which configuration class to create and
 validate against
*/
export class BaseDataSourceConfig extends NakedDomainClass {
    kind: 'http' | 'standard' | 'manual' | 'jazz' | 'aveva' | 'timeseries' | 'p6' | 'timeseries_bucket' = 'standard';

    // advanced configuration, while we allow the user to set these it's generally
    // assumed that only those with technical knowledge or experience would be modifying
    // these

    // when parsing data from this data source, these are nodes which should be removed
    // and ignored when creating the shape_hash
    @IsOptional()
    @IsArray()
    stop_nodes?: string[];

    // when parsing data from this data source, these nodes should have their values
    // and not their types evaluated when creating the shape_hash - nested keys must be
    // dictated in dot notation - this will ignore any nodes which end up being objects
    @IsOptional()
    @IsArray()
    value_nodes?: string[];

    @IsOptional()
    @Validate(DataRetentionDays)
    data_retention_days = 30;

    @IsBoolean()
    raw_retention_enabled = false;
}

export class StandardDataSourceConfig extends BaseDataSourceConfig {
    kind: 'standard' | 'manual' = 'standard';

    @IsDefined()
    data_type: 'json' | 'csv' = 'json';
}

export class HttpDataSourceConfig extends BaseDataSourceConfig {
    kind: 'http' = 'http';

    @IsUrl()
    endpoint?: string;

    @IsBoolean()
    secure = false;

    @IsDefined()
    auth_method: 'none' | 'basic' | 'token' = 'none';

    // poll interval in minutes
    poll_interval = 10;

    // timout of http request in milliseconds
    timeout = 15000;

    @ValidateIf((o) => o.auth_method === 'token')
    @IsString()
    @Exclude({toPlainOnly: true})
    token?: string;

    @ValidateIf((o) => o.auth_method === 'basic')
    @IsString()
    @Exclude({toPlainOnly: true})
    username?: string;

    @IsOptional()
    @IsString()
    @Exclude({toPlainOnly: true})
    password?: string;

    constructor(input: {
        endpoint: string;
        auth_method: 'none' | 'basic' | 'token';
        poll_interval?: number;
        token?: string;
        username?: string;
        password?: string;
        secure?: boolean;
        timeout?: number;
    }) {
        super();

        if (input) {
            this.endpoint = input.endpoint;
            this.auth_method = input.auth_method;
            if (input.poll_interval) this.poll_interval = input.poll_interval;
            this.username = input.username;
            this.password = input.password;
            if (input.secure) this.secure = input.secure;
            if (input.timeout) this.timeout = input.timeout;
        }
    }
}

export class JazzDataSourceConfig extends BaseDataSourceConfig {
    kind: 'jazz' = 'jazz';

    @IsUrl()
    endpoint?: string;

    @IsBoolean()
    secure = false;

    @IsString()
    project_name?: string;

    // poll interval in minutes
    poll_interval = 10;

    // timout of http request in milliseconds
    timeout = 30000;

    // limit records returned, can be useful for large projects
    limit?: number;

    // artifact types dictate to Jazz how to limit the return to user defined or general artifact types - we cannot set
    // sane defaults for this as the artifact type names vary widely between projects - enforce that we have at least one
    // item in the array however
    @IsArray()
    @ArrayMinSize(1)
    artifact_types: string[] = [];

    @IsString()
    @Exclude({toPlainOnly: true})
    token?: string;

    constructor(input: {
        endpoint: string;
        token: string;
        project_name: string;
        poll_interval?: number;
        timeout?: number;
        secure?: boolean;
        limit?: number;
        artifact_types?: string[];
    }) {
        super();

        if (input) {
            this.endpoint = input.endpoint;
            this.project_name = input.project_name;
            this.token = input.token;
            if (input.poll_interval) this.poll_interval = input.poll_interval;
            if (input.secure) this.secure = input.secure;
            if (input.limit) this.limit = input.limit;
            if (input.artifact_types) this.artifact_types = input.artifact_types;
            if (input.timeout) this.timeout = 30000;
        }
    }
}

export class AvevaDataSourceConfig extends BaseDataSourceConfig {
    kind: 'aveva' = 'aveva';

    // data base types to ignore when attempting to extract elements - these are sane defaults as these databases
    // generally contain information specific to the aveva program itself, not the project
    @IsArray()
    ignore_dbs: string[] = ['SYSTEM', 'DICTIONARY', 'PROPERTY', 'CATALOG', 'NSEQ'];

    // element types to ignore when exporting data - these are sane defaults which avoid the data being polluted
    // by primitive element types
    @IsArray()
    ignore_element_types: string[] = [
        'GENPRI',
        'POINT',
        'INVISIBLE POINT',
        'TANGENT POINT',
        'POLYGON',
        'VERTEX',
        'AIDARC',
        'AIDCIRCLE',
        'AIDLINE',
        'AIDPOINT',
        'AIDTEXT',
        'BOX',
        'CONE',
        'CTORUS',
        'CYLINDER',
        'DISH',
        'DRAWING',
        'EXTRUSION',
        'IPOINT',
        'LINDIMENSION',
        'LOOP',
        'LOOPTS',
        'MLABEL',
        'POGON',
        'POHEDRON',
        'POINT',
        'POLFACE',
        'POLOOP',
        'POLPTLIST',
        'POLYHEDRON',
        'PYRAMID',
        'REVOLUTION',
        'RTORUS',
        'SLCYLINDER',
        'SNOUT',
        'TANPOINT',
        'VERTEX',
        'NBOX',
        'NCONE',
        'NCTORUS',
        'NCYLINDER',
        'NDISH',
        'NPOLYHEDRON',
        'NPYRAMID',
        'NREVOLUTION',
        'NRTORUS',
        'NSLCYLINDER',
        'NSNOUT',
        'NXRUSION',
    ];

    // element types for which IFC files hould be generated - these are sane defaults and should cover most use cases
    // as it will return the whole project as an ifc file, then separate by zones, sites etc. See Aveva's database documentation
    // for more information - https://help.aveva.com/AVEVA_Everything3D/1.1/NCUG/wwhelp/wwhimpl/js/html/wwhelp.htm#href=NCUG4.5.15.html#1021602
    @IsArray()
    ifc_element_types: string[] = ['SITE', 'GROUP', 'SITE', 'ZONE', 'DRAWING', 'STRUCTURE'];

    @IsObject()
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
    } = {
        format: 'IFC2x3',
        data_level: 'GA',
        component_level: true,
        log_detail: 2,
        arc_tolerance: '10mm',
        tube: true,
        cl: false,
        insu_translucency: 25,
        obst_translucency: 50,
        root: 6,
        pipe: 6,
        nozzle: 6,
        structure: 6,
        cable: 6,
    };
}

export class P6DataSourceConfig extends BaseDataSourceConfig {
    kind: 'p6' = 'p6';

    // not constraining this to URL since p6 address could be a remote desktop address
    endpoint?: string;

    @IsString()
    projectID?: string;

    @IsString()
    @Exclude({toPlainOnly: true})
    username?: string;

    @IsString()
    @Exclude({toPlainOnly: true})
    password?: string;
}

export class TimeseriesColumn {
    // id is completely optional, we include it mainly because we need to be able to differentiate on the gui
    @IsOptional()
    @IsString()
    id?: string;

    @IsOptional()
    @IsString()
    @Matches(/^[a-zA-Z]\w{1,30}$/)
    column_name?: string;

    @IsOptional()
    @IsString()
    property_name?: string;

    // this key dictates whether this should be used as the primary timestamp in timescaledb table creation
    // for tabular data - there can only be one primary timestamp per transformation
    @IsOptional()
    @IsBoolean()
    is_primary_timestamp = false;

    // unique cannot apply to the primary timestamp and uniqueness is unique amid the primary partitioning key (timestamp)
    @IsOptional()
    @ValidateIf((o) => !o.is_primary_timestamp)
    @IsBoolean()
    unique = false;

    @IsOptional()
    @IsString()
    @IsIn(['number', 'number64', 'float', 'float64', 'date', 'string', 'boolean', 'json'])
    @PrimaryTimestampType()
    type?: string;

    @IsOptional()
    @IsString()
    date_conversion_format_string?: string;
}

export class TimeseriesNodeParameter {
    @IsString()
    @IsIn(['data_source', 'metatype_id', 'metatype_name', 'original_id', 'property', 'id'])
    type?: string;

    @IsString()
    @IsOptional()
    operator?: string;

    @IsOptional()
    key?: any;

    value?: any;
}

// we extend so the class-transformer can work properly, even though we don't actually need it
export class TimeseriesDataSourceConfig extends BaseDataSourceConfig {
    kind: 'timeseries' = 'timeseries';

    fast_load_enabled = false;

    @Type(() => TimeseriesColumn)
    @IsNotEmpty() // we must have columns if creating a timeseries table
    @PrimaryTimestampExists({message: 'must contain exactly one primary timestamp column'})
    @ValidateNested()
    columns: TimeseriesColumn[] = [];

    @NeedsChunkInterval({message: 'number primary timestamps require a chunk interval'})
    @IsString()
    @IsOptional()
    chunk_interval?: string; // only required if they are using a bigint as a primary timestamp

    @ValidateNested()
    @Type(() => TimeseriesNodeParameter)
    @IsOptional()
    attachment_parameters: TimeseriesNodeParameter[] = [];

    constructor(input: {columns?: TimeseriesColumn[]; attachment_parameters?: TimeseriesNodeParameter[]; chunk_interval?: string; fastLoadEnabled?: boolean}) {
        super();

        if (input?.columns) this.columns = input.columns;
        if (input?.attachment_parameters) this.attachment_parameters = input.attachment_parameters;
        if (input?.chunk_interval) this.chunk_interval = input.chunk_interval;
        if (input?.fastLoadEnabled) this.fast_load_enabled = input.fastLoadEnabled;
    }
}

export class TimeseriesBucketDataSourceConfig extends BaseDataSourceConfig {
    kind: 'timeseries_bucket' = 'timeseries_bucket';

    change_bucket_payload: ChangeBucketPayload | undefined;

    bucket: Bucket | undefined;

    constructor(input?: {change_bucket_payload?: ChangeBucketPayload}) {
        super();
        if (input?.change_bucket_payload) this.change_bucket_payload = input.change_bucket_payload;
    }
}

/*
    DataSourceRecord represents a data source record in the DeepLynx database and the various
    validations required for said record to be considered valid.
 */
export default class DataSourceRecord extends BaseDomainClass {
    @IsOptional()
    id?: string;

    @IsString()
    container_id?: string;

    @IsString()
    name?: string;

    @IsString()
    @IsIn(['http', 'standard', 'manual', 'jazz', 'aveva', 'timeseries', 'p6', 'timeseries_bucket'])
    adapter_type = 'standard';

    @IsString()
    @IsIn(['ready', 'polling', 'error'])
    status?: 'ready' | 'polling' | 'error' = 'ready';

    @IsOptional()
    @IsString()
    status_message?: string;

    @IsOptional()
    @IsString()
    data_format?: string;

    @IsBoolean()
    active = false; // we don't want to start something processing unless user specifies

    @IsBoolean()
    archived = false;

    @ValidateNested()
    @Type(() => BaseDataSourceConfig, {
        keepDiscriminatorProperty: true,
        discriminator: {
        property: 'kind',
        subTypes: [
        {value: StandardDataSourceConfig, name: 'standard'},
        {value: StandardDataSourceConfig, name: 'manual'},
        {value: JazzDataSourceConfig, name: 'jazz'},
        {value: HttpDataSourceConfig, name: 'http'},
        {value: AvevaDataSourceConfig, name: 'aveva'},
        {value: TimeseriesDataSourceConfig, name: 'timeseries'},
        {value: P6DataSourceConfig, name: 'p6'},
        {value: TimeseriesBucketDataSourceConfig, name: 'timeseries_bucket'}
        ],
        },
        })
    config?: StandardDataSourceConfig
    | HttpDataSourceConfig
    | JazzDataSourceConfig
    | AvevaDataSourceConfig
    | TimeseriesDataSourceConfig
    | P6DataSourceConfig
    | TimeseriesBucketDataSourceConfig =
    new StandardDataSourceConfig();

    constructor(input: {
        container_id: string;
        name: string;
        adapter_type: string;
        active?: boolean;
        config?:
        | StandardDataSourceConfig
        | HttpDataSourceConfig
        | JazzDataSourceConfig
        | AvevaDataSourceConfig
        | TimeseriesDataSourceConfig
        | P6DataSourceConfig
        | TimeseriesBucketDataSourceConfig;
        data_format?: string;
        status?: 'ready' | 'polling' | 'error';
        status_message?: string;
        data_retention_days?: number;
        archived?: boolean;
    }) {
        super();
        this.config = new StandardDataSourceConfig();

        if (input) {
            this.container_id = input.container_id;
            this.name = input.name;
            this.adapter_type = input.adapter_type;
            if (input.active) this.active = input.active;
            if (input.config) this.config = input.config;
            if (input.data_format) this.data_format = input.data_format;
            if (input.status) this.status = input.status;
            if (input.status_message) this.status_message = input.status_message;
            if (input.data_retention_days) this.config.data_retention_days = input.data_retention_days;
            if (input.archived) this.archived = input.archived;
        }
    }
}

export function PrimaryTimestampType(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'PrimaryTimestampType',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if ((args.object as TimeseriesColumn)?.is_primary_timestamp) {
                        return value === 'number' || value === 'number64' || value === 'date';
                    }

                    return true;
                },
            },
        });
    };
}

export function NeedsChunkInterval(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'NeedsChunkInterval',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const bigintColumns = (args.object as TimeseriesDataSourceConfig).columns.filter(
                        (c) => c.is_primary_timestamp && (c.type === 'number' || c.type === 'number64'),
                    );

                    // if no columns with a bigint, we don't need chunk interval
                    if (bigintColumns.length === 0) return true;

                    for (const c of bigintColumns) {
                        if (value) continue;
                        else return false;
                    }

                    return true;
                },
            },
        });
    };
}

export function PrimaryTimestampExists(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'PrimaryTimestampExists',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value: TimeseriesColumn[], args: ValidationArguments) {
                    const timestamp = value.filter((column) => column.is_primary_timestamp);

                    // there can only be one primary timestamp
                    if (timestamp.length === 1) return true;

                    return false;
                },
            },
        });
    };
}
