import {BaseDomainClass, NakedDomainClass} from '../../../common_classes/base_domain_class';
import {ArrayMinSize, IsArray, IsBoolean, IsDefined, IsIn, IsObject, IsOptional, IsString, IsUrl, ValidateIf, ValidateNested} from 'class-validator';
import {Exclude, Type} from 'class-transformer';
import {PoolClient} from 'pg';
import {Transform} from 'stream';

// ReceiveDataOptions will allow us to grow the potential options needed by the ReceiveData
// function of various implementations without having to grow the parameter list
export class ReceiveDataOptions {
    transaction?: PoolClient;
    importID?: string;
    returnStagingRecords? = false; // needed if you'd rather return the individual staging records over the import, useful if needing to attach files
    overrideJsonStream? = false; // needed if you're passing raw json objects or an object stream
    transformStreams?: Transform[]; // streams to pipe to, prior to piping to the JSONStream
    generateShapeHash? = false; // whether or not to generate shape hash on ingestion, this is cpu heavy so try to let the job handle it
}

/*
 Add new configurations by converting kind to a union type in the BaseConfig
 and making sure the value you have in your config is the same unique string you
 used to extend kind - these are called discriminator properties and allow the
 class-transformer package to determine which configuration class to create and
 validate against
*/
export class BaseDataSourceConfig extends NakedDomainClass {
    kind: 'http' | 'standard' | 'manual' | 'jazz' | 'aveva' = 'standard';

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
    }) {
        super();

        if (input) {
            this.endpoint = input.endpoint;
            this.auth_method = input.auth_method;
            if (input.poll_interval) this.poll_interval = input.poll_interval;
            this.username = input.username;
            this.password = input.password;
            if (input.secure) this.secure = input.secure;
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

/*
    DataSourceRecord represents a data source record in the Deep Lynx database and the various
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
    @IsIn(['http', 'standard', 'manual', 'jazz', 'aveva'])
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
            ],
        },
    })
    config?: StandardDataSourceConfig | HttpDataSourceConfig | JazzDataSourceConfig | AvevaDataSourceConfig = new StandardDataSourceConfig();

    constructor(input: {
        container_id: string;
        name: string;
        adapter_type: string;
        active?: boolean;
        config?: StandardDataSourceConfig | HttpDataSourceConfig | JazzDataSourceConfig | AvevaDataSourceConfig;
        data_format?: string;
        status?: 'ready' | 'polling' | 'error';
        status_message?: string;
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
        }
    }
}
