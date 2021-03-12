import {BaseDataClass} from "../../base_data_class";
import {IsArray, IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MinLength} from "class-validator";

export default class MetatypeRelationshipKey extends BaseDataClass {
    @IsOptional()
    @IsUUID()
    id?: string

    @IsUUID()
    metatype_relationship_id?: string

    @IsOptional()
    @IsBoolean()
    archived?: boolean

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    name: string = ""

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
        min: number,
        max: number
    }

    @IsArray()
    @IsOptional()
    options?: any[]

    @IsOptional()
    default_value?: string | boolean | number | any[]

    constructor(input: {
        metatypeRelationshipID?: string,
        name: string,
        description: string,
        required:boolean,
        propertyName: string,
        dataType: string,
        options?: any[],
        validation?: {
            regex: string,
            min: number,
            max: number
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
            if(input.metatypeRelationshipID) this.metatype_relationship_id = input.metatypeRelationshipID
        }
    }
}
