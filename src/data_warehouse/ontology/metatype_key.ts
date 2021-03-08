import {BaseDataClass} from "../../base_data_class";
import {IsArray, IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MinLength} from "class-validator";

export default class MetatypeKey extends BaseDataClass {
    @IsOptional()
    @IsUUID()
    id?: string

    @IsUUID()
    @IsOptional()
    metatype_id?: string

    @IsOptional()
    @IsBoolean()
    archived?: boolean

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    name: string

    @IsNotEmpty()
    @IsString()
    description: string

    @IsNotEmpty()
    @IsString()
    property_name: string

    @IsNotEmpty()
    @IsString()
    @IsIn(["number", "date", "string", "boolean", "enumeration", "file"])
    data_type: string

    @IsBoolean()
    required: boolean = false

    @IsObject()
    @IsOptional()
    validation?: {
        regex: string,
        min: number,
        max: number
    }

    @IsArray()
    @IsOptional()
    options?: string[]

    @IsOptional()
    default_value?: string | boolean | number | any[]

    constructor(name: string, description: string, propertyName: string, dataType: string) {
        super();

        this.name = name
        this.description = description
        this.property_name = propertyName
        this.data_type = dataType
    }
}
