import {BaseDomainClass} from '../../../common_classes/base_domain_class';
import {IsBoolean, IsDate, IsNotEmpty, IsOptional, IsString, MinLength, registerDecorator, ValidationArguments, ValidationOptions} from 'class-validator';
import MetatypeKey from './metatype_key';
import * as t from 'io-ts';
import Result from '../../../common_classes/result';
import {pipe} from 'fp-ts/lib/function';
import {fold} from 'fp-ts/Either';
import {Type} from 'class-transformer';

/*
    Metatype represents a metatype record in the Deep Lynx database and the various
    validations required for said record to be considered valid. It also contains
    operations for managing the metatype's keys and validating an unknown object
    against all keys.
 */
export default class Metatype extends BaseDomainClass {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    container_id?: string;

    @IsOptional()
    @IsBoolean()
    archived?: boolean;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    name = '';

    @IsNotEmpty()
    @IsString()
    description = '';

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    deleted_at?: Date;

    @IsOptional()
    @IsString()
    ontology_version?: string;

    @Type(() => MetatypeKey)
    keys: MetatypeKey[] | undefined;
    // for tracking removed keys for update
    #removedKeys: MetatypeKey[] | undefined;

    constructor(input: {container_id?: string; name: string; description: string; keys?: MetatypeKey[]}) {
        super();

        // we have to do this because class-transformer doesn't know to create
        // an object with our specifications for the parameter
        if (input) {
            if (input.container_id) this.container_id = input.container_id;
            if (input.keys) this.keys = input.keys;
            this.name = input.name;
            this.description = input.description;
        }
    }

    get removedKeys() {
        return this.#removedKeys;
    }

    // Please use these operations when manipulating the keys of a metatype
    // even though the MetatypeKey property is not private, avoid mutating it - it's
    // not private due to limitations with the class-transformer package
    addKey(...keys: MetatypeKey[]) {
        if (!this.keys) this.keys = [];
        this.keys.push(...keys);
    }

    replaceKeys(keys: MetatypeKey[], removedKeys?: MetatypeKey[]) {
        this.keys = keys;
        if (removedKeys) this.#removedKeys = removedKeys;
    }

    // removeKeys will remove the first matching key, you must save the object
    // for changes to take place
    removeKey(...keys: MetatypeKey[] | string[]) {
        if (!this.keys) this.keys = [];
        if (!this.#removedKeys) this.#removedKeys = [];
        for (const key of keys) {
            if (typeof key === 'string') {
                this.keys = this.keys.filter((k) => {
                    if (k.id !== key) {
                        return true;
                    }
                    this.#removedKeys!.push(k);
                    return false;
                }, this);
            } else {
                // if it's not a string, we can safely assume it's the type
                this.keys = this.keys.filter((k) => {
                    // to avoid accidentally removing keys with no id check the name
                    // as well, it's a unique identifier for the combo of metatype/keys
                    if (k.id !== key.id && k.name !== key.name) {
                        return true;
                    }
                    this.#removedKeys!.push(k);
                    return false;
                }, this);
            }
        }
    }

    // CompileMetatypeKeys creates an io-ts runtime type decoder out of them.
    // This single function is extremely important, and is the driving force
    // behind the dynamic type generation and being able to type-check user payloads.
    compileKeys() {
        const output: {[key: string]: any} = {};
        const partialOutput: {[key: string]: any} = {};

        // the handled key types here can become more complex as the application evolves
        if (this.keys)
            this.keys.map((key) => {
                switch (key.data_type) {
                    case 'number': {
                        key.required ? (output[key.property_name] = t.number) : (partialOutput[key.property_name] = t.union([t.number, t.null]));
                        break;
                    }

                    case 'date': {
                        key.required ? (output[key.property_name] = t.string) : (partialOutput[key.property_name] = t.union([t.null, t.string]));
                        break;
                    }

                    case 'string': {
                        key.required ? (output[key.property_name] = t.string) : (partialOutput[key.property_name] = t.union([t.null, t.string]));
                        break;
                    }

                    case 'boolean': {
                        key.required ? (output[key.property_name] = t.boolean) : (partialOutput[key.property_name] = t.union([t.null, t.boolean]));
                        break;
                    }

                    case 'list': {
                        key.required
                            ? (output[key.property_name] = t.array(t.unknown))
                            : (partialOutput[key.property_name] = t.union([t.null, t.array(t.unknown)]));
                        break;
                    }

                    case 'enumeration': {
                        // if we don't have options, enum will default to a string value
                        if (key.options === undefined) {
                            output[key.property_name] = t.union([t.null, t.string]);
                            break;
                        }

                        const toUnion: {[key: string]: any} = {};

                        // options must be represented by strings, as defined in the MetatypeKey type definitions. As such, we can
                        // dynamically create a union using keyof
                        for (const option of key.options) {
                            toUnion[option] = null;
                        }

                        key.required ? (output[key.property_name] = t.keyof(toUnion)) : (partialOutput[key.property_name] = t.keyof(toUnion));

                        break;
                    }

                    default: {
                        partialOutput[key.property_name] = t.unknown;
                    }
                }
            });

        // First iteration of the core is built to accept any additional user properties, change to t.exact later on
        return t.intersection([t.type(output), t.partial(partialOutput)]);
    }

    // validateAndTransformProperties will compile an io-ts type to run a provided
    // input against. You use this method to insure that the provided input's structure
    // and values match the expected structure and values defined in the ontology
    // as well as run any validations that might be required on a given key
    // this will return a valid payload with default values set if needed
    async validateAndTransformProperties(input: any): Promise<Result<any>> {
        // easiest way to create type for callback func
        const compiledType = this.compileKeys();

        // before we attempt to validate we need to insure that any keys with default values have that applied to the payload
        if (this.keys)
            for (const key of this.keys) {
                if (key.property_name in input || key.default_value === null) continue;

                switch (key.data_type) {
                    case 'number': {
                        input[key.property_name] = +key.default_value!;
                        break;
                    }

                    case 'boolean': {
                        input[key.property_name] = key.default_value === 'true' || key.default_value === 't';
                        break;
                    }

                    default: {
                        input[key.property_name] = key.default_value;
                        break;
                    }
                }
            }

        const onValidateSuccess = (resolve: (r: any) => void): ((c: any) => void) => {
            return (cts: any) => {
                const errorStrings: string[] = [];
                // now that we know the payload matches the shape of the data required, run additional validation
                // such as regex pattern matching on string payloads
                if (this.keys)
                    for (const key of this.keys) {
                        if (key.validation === null || key.validation === undefined) continue;

                        if (key.validation.min || key.validation.max) {
                            // count the number of matching properties passed
                            let count = 0;
                            if (input.hasOwnProperty(key.property_name)) {
                                count++;
                            }

                            if (key.validation.min !== undefined && key.validation.min > count) {
                                errorStrings.push(
                                    `Validation of ${key.property_name} failed, this key is required. ` +
                                        `${count} provided, less than min (${key.validation.min}).`,
                                );
                            }

                            if (key.validation.max !== undefined && key.validation.max < count) {
                                errorStrings.push(
                                    `Validation of ${key.property_name} failed, too many of this key provided. ` +
                                        `${count} provided, more than max (${key.validation.max}).`,
                                );
                            }
                        }

                        if (key.validation && key.validation.regex) {
                            const matcher = new RegExp(key.validation.regex);

                            if (!matcher.test(input[key.property_name])) {
                                errorStrings.push(`Validation of ${key.property_name} failed, regex mismatch. Should match ${key.validation.regex}.`);
                            }
                        }
                    }

                if (errorStrings.length > 0) {
                    resolve(Result.Failure(errorStrings.join(' ')));
                } else {
                    resolve(Result.Success(cts));
                }
            };
        };

        return new Promise((resolve) => {
            pipe(compiledType.decode(input), fold(this.onDecodeError(resolve), onValidateSuccess(resolve)));
        });
    }
}

export function MetatypeID(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'MetatypeID',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return value instanceof Metatype && typeof value.id! === 'string';
                },
            },
        });
    };
}
