import {BaseDomainClass} from '../../../common_classes/base_domain_class';
import {IsArray, IsBoolean, IsDate, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, Matches, MinLength} from 'class-validator';
import {Type} from 'class-transformer';

/*
    MetatypeKey represents a metatype key record in the Deep Lynx database and the various
    validations required for said record to be considered valid.
 */
export default class MetatypeKey extends BaseDomainClass {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    metatype_id?: string;

    @IsString()
    @IsOptional()
    container_id?: string;

    @IsOptional()
    @IsBoolean()
    archived?: boolean;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    name = '';

    @IsString()
    description = '';

    @IsNotEmpty()
    @IsString()
    @Matches(/^[_a-zA-Z][_a-zA-Z0-9]*$/)
    property_name = '';

    @IsNotEmpty()
    @IsString()
    @IsIn(['number', 'number64', 'float', 'float64', 'date', 'string', 'boolean', 'enumeration', 'file', 'list', 'unknown'])
    data_type = 'unknown';

    @IsBoolean()
    required = false;

    @IsObject()
    @IsOptional()
    validation?: {
        regex: string;
        min?: number;
        max?: number;
    };

    @IsArray()
    @IsOptional()
    options?: any[];

    @IsOptional()
    default_value?: string | boolean | number | any[];

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    deleted_at?: Date;

    constructor(input: {
        metatype_id?: string;
        container_id?: string;
        name: string;
        description: string;
        required: boolean;
        property_name: string;
        data_type: string;
        options?: any[];
        default_value?: any;
        validation?: {
            regex: string;
            max?: number;
            min?: number;
        };
    }) {
        super();

        // we have to do this because class-transformer doesn't know to create
        // an object with our specifications for the parameter
        if (input) {
            this.required = input.required;
            this.name = input.name;
            this.description = input.description;
            this.property_name = input.property_name;
            this.data_type = input.data_type;
            if (input.options) this.options = input.options;
            if (input.validation) this.validation = input.validation;
            if (input.metatype_id) this.metatype_id = input.metatype_id;
            if (input.default_value) this.default_value = input.default_value;
            if (input.container_id) this.container_id = input.container_id;
        }
    }
}
