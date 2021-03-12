import {BaseDataClass} from "../../base_data_class";
import {IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength} from "class-validator";
import MetatypeKey from "./metatype_key";
import * as t from "io-ts";
import Result from "../../result";
import {pipe} from "fp-ts/pipeable";
import {fold} from "fp-ts/Either";

export default class Metatype extends BaseDataClass {
    @IsOptional()
    @IsUUID()
    id?: string

    @IsUUID()
    container_id?: string

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

    keys: MetatypeKey[] = []
    // for tracking removed keys for update
    #removedKeys: MetatypeKey[] = []

    constructor(input: {containerID?: string, name: string, description: string}) {
        super();

        // we have to do this because class-transformer doesn't know to create
        // an object with our specifications for the parameter
        if(input) {
            if(input.containerID) this.container_id = input.containerID
            this.name = input.name
            this.description = input.description
        }
    }

    get removedKeys() {
        return this.#removedKeys
    }

    addKey(...keys: MetatypeKey[]) {
        this.keys.push(...keys)
    }

    replaceKeys(keys: MetatypeKey[], removedKeys?: MetatypeKey[]) {
        this.keys = keys
        if(removedKeys) this.#removedKeys = removedKeys
    }

    // removeKeys will remove the first matching key, you must save the object
    // for changes to take place
    removeKey(...keys: MetatypeKey[] | string[]) {
        for(const key of keys) {
            if(typeof key === 'string') {
                this.keys = this.keys.filter(k => {
                    if(k.id !== key) {
                        return false
                    }
                    this.#removedKeys.push(k)
                }, this)
            } else {
                // if it's not a string, we can safely assume it's the type
                this.keys = this.keys.filter(k => {
                    // to avoid accidentally removing keys with no id check the name
                    // as well, it's a unique identifier for the combo of metatype/keys
                    if(k.id !== key.id && k.name !== key.name) {
                        return false
                    }
                    this.#removedKeys.push(k)
                }, this)
            }
        }
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

    // validateAndTransformProperties will compile an io-ts type to run a provided
    // input against. You use this method to insure that the provided input's structure
    // and values match the expected structure and values defined in the ontology
    // as well as run any validations that might be required on a given key
    // this will return a valid payload with default values set if needed
    async validateAndTransformProperties(input:any): Promise<Result<any>> {
        // easiest way to create type for callback func
        const compiledType = this.compileKeys();


        // before we attempt to validate we need to insure that any keys with default values have that applied to the payload
        for(const key of this.keys) {
            if(key.property_name in input || key.default_value === null) continue;

            switch(key.data_type) {
                case "number": {
                    input[key.property_name] = +key.default_value!
                    break;
                }

                case "boolean": {
                    input[key.property_name] = key.default_value === "true" || key.default_value === "t"
                    break;
                }

                default: {
                    input[key.property_name] = key.default_value
                    break;
                }
            }
        }

        const onValidateSuccess = ( resolve: (r:any) => void): (c: any)=> void => {
            return async (cts:any) => {
                // now that we know the payload matches the shape of the data required, run additional validation
                // such as regex pattern matching on string payloads
                for(const key of this.keys) {
                    if(key.validation === null || key.validation === undefined) continue;

                    if(key.validation.min || key.validation.max) {
                        if(key.validation.min !== undefined || input[key.property_name] < key.validation.min!) {
                            resolve(Result.Failure(`validation of ${key.property_name} failed, less than min`))
                        }

                        if(key.validation.max !== undefined || input[key.property_name] > key.validation.max!) {
                            resolve(Result.Failure(`validation of ${key.property_name} failed, more than max`))
                        }
                    }

                    if(key.validation && key.validation.regex) {
                        const matcher = new RegExp(key.validation.regex)

                        if(!matcher.test(input[key.property_name])) {
                            resolve(Result.Failure(`validation of ${key.property_name} failed, regex mismatch `))
                        }
                    }

                }

                resolve(Result.Success(cts))
            }
        };

        return new Promise((resolve) => {
            pipe(compiledType.decode(input), fold(this.onDecodeError(resolve), onValidateSuccess(resolve)))
        })
    }

}
