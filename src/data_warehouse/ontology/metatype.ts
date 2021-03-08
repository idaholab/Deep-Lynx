import {BaseDataClass} from "../../base_data_class";
import {IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength} from "class-validator";
import MetatypeKey from "./metatype_key";
import * as t from "io-ts";

export default class Metatype extends BaseDataClass {
    @IsOptional()
    @IsUUID()
    id?: string

    @IsOptional()
    @IsUUID()
    container_id?: string


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

    keys: MetatypeKey[] = []

    constructor(name: string, description: string) {
        super();

        this.name = name
        this.description = description
    }

    // CompileMetatypeKeys creates an io-ts runtime type decoder out of them.
    // This single function is extremely important, and is the driving force
    // behind the dynamic type generation and being able to type-check user payloads.
    compileKeys (){
        const output : {[key:string]:any} = {};
        const partialOutput : {[key:string]:any} = {};

        // the handled key types here can become more complex as the application evolves
        (this.keys).map((key) => {
            switch(key.data_type) {
                case "number": {
                    (key.required) ? output[key.property_name] = t.number : partialOutput[key.property_name] = t.union([t.number, t.null]);
                    break;
                }

                case "date" : {
                    (key.required) ?  output[key.property_name] = t.string : partialOutput[key.property_name] = t.union([t.null, t.string]);
                    break;
                }

                case "string" : {
                    (key.required) ? output[key.property_name] = t.string : partialOutput[key.property_name] = t.union([t.null, t.string]);
                    break;
                }

                case "boolean": {
                    (key.required) ? output[key.property_name] = t.boolean : partialOutput[key.property_name] = t.union([t.null, t.boolean]);
                    break;
                }

                case "enumeration": {
                    // if we don't have options, enum will default to a string value
                    if (key.options === undefined) {
                        output[key.property_name] = t.union([t.null, t.string]);
                        break;
                    }

                    const toUnion: {[key:string]:any} = {};

                    // options must be represented by strings, as defined in the MetatypeKey type definitions. As such, we can
                    // dynamically create a union using keyof
                    for(const option of key.options) {
                        toUnion[option] = null
                    }

                    (key.required) ? output[key.property_name] = t.keyof(toUnion) : partialOutput[key.property_name] = t.keyof(toUnion);

                    break;
                }

                default : {
                    partialOutput[key.property_name] = t.unknown
                }
            }
        });

        // First iteration of the core is built to accept any additional user properties, change to t.exact later on
        return t.intersection([t.type(output), t.partial(partialOutput)])
    }

}
