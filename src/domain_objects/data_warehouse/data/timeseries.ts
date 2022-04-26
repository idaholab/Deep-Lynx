import {IsArray, IsDefined, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';
import {Conversion} from '../etl/type_transformation';
import {NakedDomainClass} from '../../../common_classes/base_domain_class';
import Edge from './edge';
import Node from './node';

export class TimeseriesMetadata {
    @IsOptional()
    @IsArray()
    @Type(() => Conversion)
    conversions: Conversion[] = [];

    @IsOptional()
    @IsArray()
    @Type(() => Conversion)
    failed_conversions: Conversion[] = [];

    constructor(input: {conversions?: Conversion[]; failed_conversions?: Conversion[]}) {
        if (input) {
            if (input.conversions) this.conversions = input.conversions;
            if (input.failed_conversions) this.failed_conversions = input.failed_conversions;
        }
    }
}

export class TimeseriesData extends NakedDomainClass {
    @IsString()
    column_name?: string;

    @IsIn(['number', 'number64', 'float', 'float64', 'date', 'string', 'boolean'])
    value_type?: string;

    @IsDefined()
    value: any;

    constructor(input: {column_name: string; value_type: string; value: any}) {
        super();
        if (input) {
            this.column_name = input.column_name;
            this.value_type = input.value_type;
            this.value = input.value;
        }
    }
}

// Timeseries Entry represents a piece of data that will be inserted  into a timescaledb hypertable
export default class TimeseriesEntry extends NakedDomainClass {
    @IsString()
    transformation_id?: string;

    @IsOptional()
    nodes: string[] = [];

    @IsOptional()
    @ValidateNested()
    @Type(() => TimeseriesMetadata)
    metadata?: TimeseriesMetadata;

    @IsNotEmpty()
    data: TimeseriesData[] = [];

    constructor(input: {transformation_id?: string; nodes?: string[]; metadata?: TimeseriesMetadata; data: TimeseriesData[]}) {
        super();

        if (input) {
            if (input.transformation_id) this.transformation_id = input.transformation_id;
            if (input.nodes) this.nodes = input.nodes;
            if (input.metadata) this.metadata = input.metadata;
            this.data = input.data;
        }
    }
}

// type guard for differentiating an array of timeseries entries
export function IsTimeseries(set: Node[] | Edge[] | TimeseriesEntry[]): set is TimeseriesEntry[] {
    // technically an empty array could be a set of NodeT
    if (Array.isArray(set) && set.length === 0) return true;

    return set[0] instanceof TimeseriesEntry;
}
