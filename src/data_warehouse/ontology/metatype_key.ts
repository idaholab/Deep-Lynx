import {BaseDataClass} from "../../base_data_class";
import {IsArray, IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MinLength} from "class-validator";

export default class MetatypeKey extends BaseDataClass {
    @IsOptional()
    @IsUUID()
    id?: string

    @IsUUID()
    metatype_id?: string

    @IsOptional()
    @IsBoolean()
    archived?: boolean

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    name: string =""

    @IsNotEmpty()
    @IsString()
    description: string = ""

    @IsNotEmpty()
    @IsString()
    property_name: string = ""

    @IsNotEmpty()
    @IsString()
    @IsIn(["number", "date", "string", "boolean", "enumeration", "file", "unknown"])
    data_type: string = "unknown"

    @IsBoolean()
    required: boolean = false

    @IsObject()
    @IsOptional()
    validation?: {
        regex: string,
        min?: number,
        max?: number
    }

    @IsArray()
    @IsOptional()
    options?: any[]

    @IsOptional()
    default_value?: string | boolean | number | any[]

    constructor(input: {
        metatypeID?: string,
        name: string,
        description: string,
        required:boolean,
        propertyName: string,
        dataType: string,
        options?: any[],
        defaultValue?: any,
        validation?: {
            regex: string,
            max?: number,
            min?: number
        }}) {
        super();

        // we have to do this because class-transformer doesn't know to create
        // an object with our specifications for the parameter
        if(input) {
            this.required = input.required
            this.name = input.name
            this.description = input.description
            this.property_name = input.propertyName
            this.data_type = input.dataType
            if(input.options) this.options = input.options
            if(input.validation) this.validation = input.validation
            if(input.metatypeID) this.metatype_id = input.metatypeID
            if(input.defaultValue) this.default_value = input.defaultValue
        }

    }
}
