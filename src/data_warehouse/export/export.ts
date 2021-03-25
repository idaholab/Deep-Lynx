import Result from "../../common_classes/result";
import {User} from "../../access_management/user";
import {BaseDomainClass, NakedDomainClass} from "../../common_classes/base_domain_class";
import {IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUrl, IsUUID, ValidateNested} from "class-validator";
import {Exclude, Type} from "class-transformer";

// The exporter interface allows the user to create a standard implementation
// for data export and implement it with minimum amount of work. The repository
// should always return the interface vs. the export record itself
export interface Exporter {
    ExportRecord?: ExportRecord
    Initiate(user: User): Promise<Result<boolean>>
    Restart(user: User): Promise<Result<boolean>>
    Stop(user: User): Promise<Result<boolean>>
    Reset(user: User): Promise<Result<boolean>>
    Status(): string

    // this final method is so that the exporter can run any encryption or exporter
    // specific functions prior to the export record being saved into the database
    ToSave(): Promise<ExportRecord>
}

// add new configurations by converting kind to a union type in the BaseConfig
// and making sure the value you have in your config is the same unique string you
// used to extend kind - these are called discriminator properties
export class BaseExporterConfig extends NakedDomainClass {
    kind?: "gremlin" | "standard"
}

// shared configurations values, or for normal exporter should be defined here
export class StandardExporterConfig extends BaseExporterConfig {
    kind: "standard" = "standard"
}

export class GremlinExportConfig extends BaseExporterConfig {
    kind: "gremlin" = "gremlin"

    @IsString()
    traversal_source: string = "g"

    @IsString()
    @Exclude({toPlainOnly: true})
    user: string = ""

    @IsString()
    @Exclude({toPlainOnly: true})
    key: string = ""

    @IsUrl()
    endpoint?: string

    @IsString()
    port?: string

    @IsString()
    path?: string

    @IsNumber()
    writes_per_second: number = 100

    @IsOptional()
    @IsString()
    mime_type?: string

    @IsBoolean()
    graphson_v1: boolean = false

    constructor(input: {
        traversal_source: string,
        user: string,
        key: string,
        endpoint: string,
        port: string,
        path: string,
        writes_per_second?: number,
        mime_type?: string,
        graphson_v1?: boolean
    }) {
        super();

        if(input) {
            this.traversal_source = input.traversal_source
            this.user = input.user
            this.key = input.key
            this.endpoint = input.endpoint
            this.port = input.port
            this.path = input.path
            if(input.writes_per_second) this.writes_per_second = input.writes_per_second
            if(input.mime_type) this.mime_type = input.mime_type
            if(input.graphson_v1) this.graphson_v1 = input.graphson_v1
        }
    }
}

export function IsGremlinConfig(config:GremlinExportConfig | StandardExporterConfig): config is GremlinExportConfig {
    return config.kind === "gremlin"
}

export default class ExportRecord extends BaseDomainClass {
    @IsOptional()
    id?: string

    @IsString()
    @IsIn(["gremlin"])
    adapter: string = "gremlin"

    // this allows use to create and validate the correct class on the transformer pulling from db
    @ValidateNested()
    @Type(() => BaseExporterConfig, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'kind',
            subTypes: [
                {value: GremlinExportConfig, name: "gremlin"},
                {value: StandardExporterConfig, name: "standard"}
            ]
        }
    })
    config?: StandardExporterConfig | GremlinExportConfig

    @IsUUID()
    container_id?: string

    @IsOptional()
    @IsString()
    destination_type?: string

    // we don't use the IsIn validator because the end user isn't
    // setting this via the class
    status: "created" | "processing" | "paused" | "completed" | "failed" = "created"

    @IsOptional()
    status_message?: string

    constructor(input:{
        container_id: string,
        adapter: string,
        config?: StandardExporterConfig | GremlinExportConfig,
        destination_type?: string,
    }) {
        super();

        if(input){
            this.container_id = input.container_id
            this.adapter = input.adapter
            if(input.config) this.config = input.config
            if(input.destination_type) this.destination_type = input.destination_type
        }
    }
}

