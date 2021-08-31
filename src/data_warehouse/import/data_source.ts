import {BaseDomainClass, NakedDomainClass} from '../../common_classes/base_domain_class';
import {IsArray, IsBoolean, IsDefined, IsIn, IsObject, IsOptional, IsString, IsUrl, IsUUID, ValidateIf, ValidateNested} from 'class-validator';
import {Exclude, Type} from 'class-transformer';
import {User} from '../../access_management/user';
import Import from './import';
import Result from '../../common_classes/result';
import {PoolClient} from 'pg';

/*
    The DataSource interface represents basic functionality of a data source. All
    data sources must be able to receive and process received information. Currently
    there are two implementations - the Http data source and Standard data source.
 */
export interface DataSource {
    DataSourceRecord?: DataSourceRecord;

    // a payload of any should allow data sources to accept things like streams,
    // json payloads, or hopefully anything they might need. This should return
    // the import record the data is stored under - optionally you can pass an
    // import that already exists, in case you are adding data to it - keep in
    // mind that it is not best practice to do so - in case your old data overwrites
    // newer data when the data source attempts to process it
    ReceiveData(payload: any, user: User, options?: ReceiveDataOptions): Promise<Result<Import>>;

    // process single fire function that both processes the data from the
    // source as well as running any polling efforts like with the http implementation
    // this is run once per minute by default
    Process(): Promise<Result<boolean>>;

    // this final method is so that the data source can run any encryption or source
    // specific functions prior to the data source record being saved into the database
    ToSave(): Promise<DataSourceRecord>;
}

// ReceiveDataOptions will allow us to grow the potential options needed by the ReceiveData
// function of various implementations without having to grow the parameter list
export class ReceiveDataOptions {
    transaction?: PoolClient;
    importID?: string;
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

    @IsString()
    @Exclude({toPlainOnly: true})
    token?: string;

    constructor(input: {endpoint: string; token: string; project_name: string; poll_interval?: number; secure?: boolean}) {
        super();

        if (input) {
            this.endpoint = input.endpoint;
            this.project_name = input.project_name;
            this.token = input.token;
            if (input.poll_interval) this.poll_interval = input.poll_interval;
            if (input.secure) this.secure = input.secure;
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
    ifc_element_types: string[] = [
        'WORLD',
        'SITE',
        'AREA WORLD',
        'GROUP WORLD',
        'GROUP',
        'AREA SET',
        'AREA DEFINITION',
        'SITE',
        'ZONE',
        'DRAWING',
        'STRUCTURE',
    ];

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

    @IsUUID()
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
