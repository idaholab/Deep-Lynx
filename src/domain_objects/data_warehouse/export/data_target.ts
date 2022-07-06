import {BaseDomainClass, NakedDomainClass} from '../../../common_classes/base_domain_class';
import {IsBoolean, IsDefined, IsIn, IsOptional,IsDate, IsString, IsUrl, ValidateIf, ValidateNested} from 'class-validator';
import {Exclude, Type} from 'class-transformer';

/*
 Add new configurations by converting kind to a union type in the BaseConfig
 and making sure the value you have in your config is the same unique string you
 used to extend kind - these are called discriminator properties and allow the
 class-transformer package to determine which configuration class to create and
 validate against
*/
export class BaseDataTargetConfig extends NakedDomainClass {
    kind: 'http' = 'http';
}

export class HttpDataTargetConfig extends BaseDataTargetConfig {
    kind: 'http' = 'http';

    @IsUrl()
    endpoint?: string;

    @IsBoolean()
    secure = false;

    @IsDefined()
    auth_method: 'none' | 'basic' | 'token' = 'none';

    // Default poll interval in seconds in case the user doesn't set their own on creation
    poll_interval = '30 seconds';

    // query for data to structure post request body
    graphql_query?: string;

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
        poll_interval?: string;
        graphql_query?: string;
        token?: string;
        username?: string;
        password?: string;
        secure?: boolean;
    }) {
        super();

        if (input) {
            this.endpoint = input.endpoint;
            this.auth_method = input.auth_method;
            if (input.poll_interval) {this.poll_interval = input.poll_interval;}
            this.graphql_query = input.graphql_query;
            this.username = input.username;
            this.password = input.password;
            if (input.secure) {this.secure = input.secure;}
        }
    }
}

/*
    DataTargetRecord represents a data source record in the Deep Lynx database and the various
    validations required for said record to be considered valid.
 */
export default class DataTargetRecord extends BaseDomainClass {
    @IsOptional()
    id?: string;

    @IsString()
    container_id?: string;

    @IsString()
    name?: string;

    @IsString()
    adapter_type = 'http';

    @IsString()
    @IsIn(['ready', 'polling', 'error'])
    status?: 'ready' | 'polling' | 'error' = 'ready';

    @IsOptional()
    @IsString()
    status_message?: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    last_run_at?: Date;

    @IsOptional()
    @IsString()
    data_format?: string;

    @IsBoolean()
    active = false; // we don't want to start something processing unless user specifies

    @ValidateNested()
    @Type(() => BaseDataTargetConfig, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'kind',
            subTypes: [
                {value: HttpDataTargetConfig, name: 'http'},
            ],
        },
    })
    config: BaseDataTargetConfig | HttpDataTargetConfig = new BaseDataTargetConfig();

    constructor(input: {
        container_id: string;
        name: string;
        adapter_type: string;
        active?: boolean;
        config?: HttpDataTargetConfig;
        data_format?: string;
        status?: 'ready' | 'polling' | 'error';
        status_message?: string;
        last_run_at?: Date;
    }) {
        super();
        this.config = new BaseDataTargetConfig();

        if (input) {
            this.container_id = input.container_id;
            this.name = input.name;
            this.adapter_type = input.adapter_type;
            if (input.active) {this.active = input.active;}
            if (input.config) {this.config = input.config;}
            if (input.data_format) {this.data_format = input.data_format;}
            if (input.status) {this.status = input.status;}
            if (input.status_message) {this.status_message = input.status_message;}
        }
    }
}
