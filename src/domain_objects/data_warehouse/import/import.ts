import {BaseDomainClass, NakedDomainClass} from '../../../common_classes/base_domain_class';
import {IsDate, IsDefined, IsNumber, IsOptional, IsString, IsUUID} from 'class-validator';
import {Type} from 'class-transformer';
import {AvevaDataSourceConfig, BaseDataSourceConfig, HttpDataSourceConfig, StandardDataSourceConfig, P6DataSourceConfig} from './data_source';

/*
    Import represents an import record in the DeepLynx database and the various
    validations required for said record to be considered valid.
 */
export default class Import extends BaseDomainClass {
    @IsOptional()
    id?: string;

    @IsString()
    data_source_id?: string;

    @IsOptional()
    @IsString()
    status_message?: string;

    @IsString()
    status: 'ready' | 'processing' | 'error' | 'stopped' | 'completed' = 'ready';

    @IsOptional()
    reference?: string;

    // composite properties pulled in by JOIN statements when the db fetches this record
    @IsOptional()
    @IsNumber()
    total_records?: number;

    @IsOptional()
    @IsNumber()
    records_inserted?: number;

    @IsOptional()
    @IsNumber()
    total_errors?: number;

    constructor(input: {data_source_id: string; status_message?: string; reference?: string}) {
        super();

        if (input) {
            this.data_source_id = input.data_source_id;
            if (input.status_message) this.status_message = input.status_message;
            if (input.reference) this.reference = input.reference;
        }
    }
}

/*
 DataStaging refers to the individual points of data coming in from an import
 I regret naming it this, but we are now too far into the project to rename an
 entire table for sake of looks
*/
export class DataStaging extends NakedDomainClass {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    data_source_id?: string;

    @IsString()
    import_id?: string;

    @IsOptional()
    @IsString()
    shape_hash?: string;

    @IsOptional()
    errors: string[] = [];

    @IsDefined()
    data: any;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    created_at?: Date;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    inserted_at?: Date;

    // The fields below are fields generally fetched on a join
    @IsOptional()
    container_id?: string;

    // we need to have this so we can stop spamming the database on the db on processing
    @IsOptional()
    file_attached?: boolean = false;

    @Type(() => BaseDataSourceConfig, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'kind',
            subTypes: [
                {value: StandardDataSourceConfig, name: 'standard'},
                {value: StandardDataSourceConfig, name: 'manual'},
                {value: HttpDataSourceConfig, name: 'http'},
                {value: AvevaDataSourceConfig, name: 'aveva'},
                {value: P6DataSourceConfig, name: 'p6'},
            ],
        },
    })
    data_source_config?: StandardDataSourceConfig | HttpDataSourceConfig | AvevaDataSourceConfig | P6DataSourceConfig = new StandardDataSourceConfig();

    constructor(input: {data_source_id: string; import_id: string; data: any; shape_hash?: string; container_id?: string; file_attached?: boolean}) {
        super();

        if (input) {
            this.data_source_id = input.data_source_id;
            this.import_id = input.import_id;
            this.data = input.data;
            if (input.shape_hash) this.shape_hash = input.shape_hash;
            if (input.container_id) this.container_id = input.container_id;
            if (input.file_attached) this.file_attached = input.file_attached;
        }
    }
}
