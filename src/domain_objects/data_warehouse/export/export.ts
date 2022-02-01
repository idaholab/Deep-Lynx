import {BaseDomainClass, NakedDomainClass} from '../../../common_classes/base_domain_class';
import {IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUrl, ValidateNested} from 'class-validator';
import {Exclude, Type} from 'class-transformer';

/*
 Add new configurations by converting kind to a union type in the BaseConfig
 and making sure the value you have in your config is the same unique string you
 used to extend kind - these are called discriminator properties and allow the
 class-transformer package to determine which configuration class to create and
 validate against
*/
export class BaseExporterConfig extends NakedDomainClass {
    kind: 'gremlin' | 'standard' = 'standard';
}

// shared configurations values, or for normal exporter should be defined here
export class StandardExporterConfig extends BaseExporterConfig {
    kind: 'standard' = 'standard';
}

/*
    GremlinExportConfig contains all values necessary for the GremlinImpl of
    Exporter to successfully export a container's data out to a Gremlin enabled
    graph database.
 */
export class GremlinExportConfig extends BaseExporterConfig {
    kind: 'gremlin' = 'gremlin';

    @IsString()
    traversal_source = 'g';

    @IsString()
    @Exclude({toPlainOnly: true})
    user = '';

    @IsString()
    @Exclude({toPlainOnly: true})
    key = '';

    @IsUrl()
    endpoint?: string;

    @IsString()
    port?: string;

    @IsString()
    path?: string;

    @IsNumber()
    writes_per_second = 100;

    @IsOptional()
    @IsString()
    mime_type?: string;

    @IsBoolean()
    graphson_v1 = false;

    constructor(input: {
        traversal_source: string;
        user: string;
        key: string;
        endpoint: string;
        port: string;
        path: string;
        writes_per_second?: number;
        mime_type?: string;
        graphson_v1?: boolean;
    }) {
        super();

        if (input) {
            this.traversal_source = input.traversal_source;
            this.user = input.user;
            this.key = input.key;
            this.endpoint = input.endpoint;
            this.port = input.port;
            this.path = input.path;
            if (input.writes_per_second) this.writes_per_second = input.writes_per_second;
            if (input.mime_type) this.mime_type = input.mime_type;
            if (input.graphson_v1) this.graphson_v1 = input.graphson_v1;
        }
    }
}

/*
    ExportRecord represents an export record in the Deep Lynx database and the various
    validations required for said record to be considered valid.
 */
export default class ExportRecord extends BaseDomainClass {
    @IsOptional()
    id?: string;

    @IsString()
    @IsIn(['gremlin'])
    adapter = 'gremlin';

    // this allows use to create and validate the correct class on the transformer pulling from db
    @ValidateNested()
    @Type(() => BaseExporterConfig, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'kind',
            subTypes: [
                {value: GremlinExportConfig, name: 'gremlin'},
                {value: StandardExporterConfig, name: 'standard'},
            ],
        },
    })
    config?: StandardExporterConfig | GremlinExportConfig;

    @IsString()
    container_id?: string;

    @IsOptional()
    @IsString()
    destination_type?: string;

    // we don't use the IsIn validator because the end user isn't
    // setting this via the class
    status: 'created' | 'processing' | 'paused' | 'completed' | 'failed' = 'created';

    @IsOptional()
    status_message?: string;

    constructor(input: {container_id: string; adapter: string; config?: StandardExporterConfig | GremlinExportConfig; destination_type?: string}) {
        super();

        this.config = new StandardExporterConfig();

        if (input) {
            this.container_id = input.container_id;
            this.adapter = input.adapter;
            if (input.config) this.config = input.config;
            if (input.destination_type) this.destination_type = input.destination_type;
        }
    }
}
