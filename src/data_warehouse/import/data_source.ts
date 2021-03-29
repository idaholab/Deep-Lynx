import {BaseDomainClass, NakedDomainClass} from "../../common_classes/base_domain_class";
import {
    IsBoolean,
    IsDefined,
    IsIn,
    IsOptional,
    IsString,
    IsUrl,
    IsUUID,
    ValidateIf,
    ValidateNested
} from "class-validator";
import {Exclude, Type} from "class-transformer";
import {User} from "../../access_management/user";
import Import from "./import";
import Result from "../../common_classes/result";

export interface DataSource {
    DataSourceRecord?: DataSourceRecord

    // a payload of any should allow data sources to accept things like streams,
    // json payloads, or hopefully anything they might need. This should return
    // the import record the data is stored under
    ReceiveData(payload: any, user: User): Promise<Result<Import>>

    // process should be a never ending loop that both processes the data from the
    // source as well as starting any polling efforts like with the http implementation
    Process(loopOnce?: boolean): Promise<void>

    // this final method is so that the data source can run any encryption or source
    // specific functions prior to the data source record being saved into the database
    ToSave(): Promise<DataSourceRecord>
}

// add new configurations by converting kind to a union type in the BaseConfig
// and making sure the value you have in your config is the same unique string you
// used to extend kind - these are called discriminator properties
export class BaseDataSourceConfig extends NakedDomainClass {
    kind: "http" | "standard" = "standard"
}

export class StandardDataSourceConfig extends BaseDataSourceConfig {
    kind: "standard" = "standard"

    @IsDefined()
    data_type?: "json" | "csv"
}

export class HttpDataSourceConfig extends BaseDataSourceConfig {
    kind: "http" = "http"

    @IsUrl()
    endpoint?: string

    @IsDefined()
    auth_method: "none" | "basic" | "token" = "none"

    // poll interval in seconds
    poll_interval: number = 10

    @ValidateIf(o => o.auth_method === "token")
    @IsString()
    @Exclude({toPlainOnly: true})
    token?: string

    @ValidateIf(o => o.auth_method === "basic")
    @IsString()
    @Exclude({toPlainOnly: true})
    username?: string

    @IsOptional()
    @IsString()
    @Exclude({toPlainOnly: true})
    password?: string

    constructor(input: {
        endpoint: string,
        auth_method: "none" | "basic" | "token",
        poll_interval?: number,
        token?: string,
        username?: string,
        password?: string
    }) {
        super();

        if(input) {
            this.endpoint = input.endpoint
            this.auth_method = input.auth_method
            if(input.poll_interval) this.poll_interval = input.poll_interval
            this.username = input.username
            this.password = input.password
        }
    }
}

export default class DataSourceRecord extends BaseDomainClass {
    @IsOptional()
    id?: string

    @IsUUID()
    container_id?: string

    @IsString()
    name?: string

    @IsString()
    @IsIn(["http", "standard"])
    adapter_type: string = "standard"

    @IsOptional()
    @IsString()
    data_format?: string

    @IsBoolean()
    active: boolean = false // we don't want to start something processing unless user specifies

    @ValidateNested()
    @Type(() => BaseDataSourceConfig, {
       keepDiscriminatorProperty: true,
       discriminator: {
           property: 'kind',
           subTypes: [
               {value: StandardDataSourceConfig, name: "standard"},
               {value: HttpDataSourceConfig, name: "http"}
           ]
       }
    })
    config?: StandardDataSourceConfig | HttpDataSourceConfig

    constructor(input: {
        container_id: string,
        name: string,
        adapter_type: string,
        active?: boolean,
        config?: StandardDataSourceConfig | HttpDataSourceConfig,
        data_format?: string,
    }) {
        super();
        this.config = new StandardDataSourceConfig()

        if(input) {
            this.container_id = input.container_id
            this.name = input.name
            this.adapter_type = input.adapter_type
            if(input.active) this.active = input.active
            if(input.config) this.config = input.config
            if(input.data_format) this.data_format = input.data_format
        }
    }
}
