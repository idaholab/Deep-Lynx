/* eslint-disable @typescript-eslint/ban-ts-comment */
import Result from '../../../common_classes/result';
import MetatypeKeyMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import MetatypeRelationshipKeyMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_key_mapper';
import Logger from '../../../services/logger';
import Node, {NodeMetadata} from '../data/node';
import Edge, {EdgeMetadata} from '../data/edge';
import {BaseDomainClass, NakedDomainClass} from '../../../common_classes/base_domain_class';
import {IsDefined, IsEnum, IsIn, IsOptional, IsString, IsUUID, ValidateIf, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';
import {DataStaging} from '../import/import';
import MetatypeRelationshipKey from '../ontology/metatype_relationship_key';
import MetatypeKey from '../ontology/metatype_key';

import {toDate, parse} from 'date-fns';

/*
   Condition represents a logical operation which can determine whether or not
   Deep Lynx should apply this transformation to a given payload.
   We extend the naked class here because we don't need the metadata id, just
   the class for validation
 */
export class Condition extends NakedDomainClass {
    @IsOptional()
    @IsIn(['AND', 'OR'])
    expression?: string;

    @IsString()
    key?: string;

    @IsString()
    @IsIn(['==', '!=', 'in', 'contains', '>', '>=', '<', '<='])
    operator?: string;

    @IsDefined()
    value?: any;

    @ValidateNested()
    subexpressions: Condition[] = [];

    constructor(input: {expression?: string; key: string; operator: string; value: any; subexpressions?: Condition[]}) {
        super();

        if (input) {
            if (input.expression) this.expression = input.expression;
            this.key = input.key;
            this.operator = input.operator;
            this.value = input.value;
            if (input.subexpressions) this.subexpressions = input.subexpressions;
        }
    }
}

/*
   KeyMapping contains fields for both metatype and metatype relationship in order
   to handle a type mapping that results in both a Node and Edge final product.
 */
export class KeyMapping extends NakedDomainClass {
    @IsOptional()
    @IsString()
    key?: string;

    @ValidateIf((o) => o.metatype_relationship_key_id === null && typeof o.metatype_relationship_key_id === 'undefined')
    @IsUUID()
    metatype_key_id?: string;

    // generally only present when we're exporting the transformations out, must be populated using repository method
    @IsOptional()
    metatype_key?: MetatypeKey;

    @ValidateIf((o) => o.metatype_key_id === null && typeof o.metatype_key_id === 'undefined')
    @IsUUID()
    metatype_relationship_key_id?: string;

    // generally only present when we're exporting the transformations out, must be populated using repository method
    @IsOptional()
    metatype_relationship_key?: MetatypeRelationshipKey;

    @IsOptional()
    value?: any;

    @IsOptional()
    @IsString()
    @IsIn(['number', 'date', 'string', 'boolean', 'enumeration', 'file'])
    value_type?: string;

    @IsOptional()
    @IsString()
    date_conversion_format_string?: string;

    constructor(input: {
        key?: string;
        metatype_key_id?: string;
        metatype_relationship_key_id?: string;
        value?: string;
        value_type?: string;
        date_conversion_format_string?: string;
    }) {
        super();

        if (input) {
            if (input.key) this.key = input.key;
            if (input.metatype_key_id) this.metatype_key_id = input.metatype_key_id;
            if (input.metatype_relationship_key_id) this.metatype_relationship_key_id = input.metatype_relationship_key_id;
            if (input.value) this.value = input.value;
            if (input.value_type) this.value_type = input.value_type;
            if (input.date_conversion_format_string) this.date_conversion_format_string = input.date_conversion_format_string;
        }
    }
}

// Actions that can be performed when a transformation encounters an error
export type TransformationErrorAction = 'ignore' | 'fail on required' | 'fail';
export const TransformationErrorActions: TransformationErrorAction[] = ['ignore', 'fail on required', 'fail'];

/*
    TransformationConfiguration represents configuration options that the type transformation process
    relies on. Use cases include dictating whether or not automatic type conversion should be attempted
    and the action to take if it fails
 */
export class TransformationConfiguration {
    @IsEnum(TransformationErrorActions)
    on_conversion_error: TransformationErrorAction = 'fail on required';

    @IsEnum(TransformationErrorActions)
    on_key_extraction_error: TransformationErrorAction = 'fail on required';
}

/*
    TypeTransformation represents a data type transformation record in the
    Deep Lynx database and the various validations required for said record to
    be considered valid. It also contains all functions necessary for converting
    an object to an Edge or Node class depending on the transformation's properties
 */
export default class TypeTransformation extends BaseDomainClass {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    type_mapping_id?: string;

    @ValidateNested()
    @Type(() => Condition)
    conditions: Condition[] = [];

    @ValidateNested()
    @Type(() => KeyMapping)
    keys: KeyMapping[] = [];

    @ValidateIf((o) => o.metatype_relationship_pair_id === null && typeof o.metatype_relationship_pair_id === 'undefined')
    @IsString()
    metatype_id?: string;

    @ValidateIf((o) => o.metatype_id === null && typeof o.metatype_id === 'undefined')
    @IsString()
    metatype_relationship_pair_id?: string;

    @ValidateIf((o) => o.metatype_relationship_pair_id === null && typeof o.metatype_relationship_pair_id === 'undefined')
    @IsString()
    origin_id_key?: string;

    @ValidateIf((o) => o.metatype_relationship_pair_id === null && typeof o.metatype_relationship_pair_id === 'undefined')
    @IsString()
    origin_metatype_id?: string;

    @ValidateIf((o) => o.metatype_relationship_pair_id === null && typeof o.metatype_relationship_pair_id === 'undefined')
    @IsString()
    origin_data_source_id?: string;

    @ValidateIf((o) => o.metatype_relationship_pair_id === null && typeof o.metatype_relationship_pair_id === 'undefined')
    @IsString()
    destination_id_key?: string;

    @ValidateIf((o) => o.metatype_relationship_pair_id === null && typeof o.metatype_relationship_pair_id === 'undefined')
    @IsString()
    destination_metatype_id?: string;

    @ValidateIf((o) => o.metatype_relationship_pair_id === null && typeof o.metatype_relationship_pair_id === 'undefined')
    @IsString()
    destination_data_source_id?: string;

    @IsOptional()
    @IsString()
    root_array?: string;

    @IsOptional()
    @IsString()
    unique_identifier_key?: string;

    // these values are not saved on the transformation object, but are fetched
    // when this is pulled from the database. They're for ease of use when working
    // with the domain object and help us avoid having to make extra database calls
    // or to fetch unrelated data. I'd love to make these readonly, but the class-transformer
    // package currently cannot set readonly properties on transform
    @IsOptional()
    @IsString()
    container_id?: string;

    @IsOptional()
    data_source_id?: string;

    @IsOptional()
    metatype_name?: string;

    @IsOptional()
    metatype_relationship_pair_name?: string;

    @IsOptional()
    shape_hash?: string;

    @IsOptional()
    archived?: boolean;

    @ValidateNested()
    @Type(() => TransformationConfiguration)
    config: TransformationConfiguration = new TransformationConfiguration();

    constructor(input: {
        type_mapping_id: string;
        conditions?: Condition[];
        keys?: KeyMapping[];
        metatype_id?: string;
        metatype_relationship_pair_id?: string;
        origin_id_key?: string;
        origin_metatype_id?: string;
        origin_data_source_id?: string;
        destination_id_key?: string;
        destination_metatype_id?: string;
        destination_data_source_id?: string;
        root_array?: string;
        unique_identifier_key?: string;
        container_id?: string;
        data_source_id?: string;
        config?: TransformationConfiguration;
    }) {
        super();

        if (input) {
            this.type_mapping_id = input.type_mapping_id;
            if (input.conditions) this.conditions = input.conditions;
            if (input.keys) this.keys = input.keys;
            if (input.metatype_id) this.metatype_id = input.metatype_id;
            if (input.metatype_relationship_pair_id) this.metatype_relationship_pair_id = input.metatype_relationship_pair_id;
            if (input.origin_id_key) this.origin_id_key = input.origin_id_key;
            if (input.origin_metatype_id) this.origin_metatype_id = input.origin_metatype_id;
            if (input.origin_data_source_id) this.origin_data_source_id = input.origin_data_source_id;
            if (input.destination_id_key) this.destination_id_key = input.destination_id_key;
            if (input.destination_metatype_id) this.destination_metatype_id = input.destination_metatype_id;
            if (input.destination_data_source_id) this.destination_data_source_id = input.destination_data_source_id;
            if (input.root_array) this.root_array = input.root_array;
            if (input.unique_identifier_key) this.unique_identifier_key = input.unique_identifier_key;
            if (input.container_id) this.container_id = input.container_id;
            if (input.data_source_id) this.data_source_id = input.data_source_id;
            if (input.config) this.config = input.config;
        }
    }

    // applyTransformation will take a mapping, a transformation, and a data record
    // in order to generate an array of nodes or edges based on the transformation type
    async applyTransformation(data: DataStaging): Promise<Result<Node[] | Edge[]>> {
        return this.transform(data);
    }

    // transform is used to recursively generate node/edges based on the transformation
    // this allows us to handle the root array portion of type transformations and to
    // generate nodes/edges based on nested data.
    private async transform(data: DataStaging, index?: number[]): Promise<Result<Node[] | Edge[]>> {
        let results: Node[] | Edge[] = [];
        // if no root array, act normally
        if (!this.root_array) {
            const results = await this.generateResults(data);

            if (results.isError) {
                return new Promise((resolve) => resolve(Result.Pass(results)));
            }

            return new Promise((resolve) => resolve(Result.Success(results.value)));
        }

        // lets see how nested the array we're dealing with is - number directly corresponds to the index argument
        const arrays = this.root_array.split('[]');

        // we're at the root
        if (!index || index.length === 0) {
            // fetch the root array
            const key = arrays[0].charAt(arrays[0].length - 1) === '.' ? arrays[0].substr(0, arrays[0].length - 1) : arrays[0];

            const rootArray = TypeTransformation.getNestedValue(key, data.data);

            if (!Array.isArray(rootArray))
                return new Promise((resolve) => resolve(Result.Failure('provided root array key does not extract array from payload')));

            for (let i = 0; i < rootArray.length; i++) {
                const result = await this.transform(data, [i]);

                if (result.isError) {
                    Logger.error(`unable to apply transformation ${result.error}`);
                    continue;
                }

                if (!result.isError) {
                    // @ts-ignore
                    results = [...results, ...result.value];
                }
            }

            return new Promise((resolve) => resolve(Result.Success(results)));
        }

        // more arrays that index indicate we must dive deeper into the nested arrays
        if (index && index.length < arrays.length) {
            const rawKey = arrays.slice(0, index.length + 1).join('[]');
            const key = rawKey.charAt(rawKey.length - 1) === '.' ? rawKey.substr(0, rawKey.length - 1) : rawKey;

            const nestedArray = TypeTransformation.getNestedValue(key, data.data, [...index]);

            if (!Array.isArray(nestedArray))
                return new Promise((resolve) => resolve(Result.Failure('provided nested array key does not extract array from payload')));

            for (let i = 0; i < nestedArray.length; i++) {
                const newIndex: number[] = index ? [...index] : [];
                newIndex.push(i);
                const result = await this.transform(data, newIndex);

                if (result.isError) {
                    Logger.error(`unable to apply transformation ${result.error}`);
                    continue;
                }

                if (!result.isError) {
                    // @ts-ignore
                    results = [...results, ...result.value];
                }
            }

            return new Promise((resolve) => resolve(Result.Success(results)));
        }

        // same number of arrays as indices indicate we can now build the node/edge
        if (index && index.length === arrays.length) {
            // validate the transformation now that we've run it down into the index
            let valid = false;

            // no conditions immediately equals true
            if (!this.conditions || this.conditions.length === 0) valid = true;

            if (this.conditions) {
                for (const condition of this.conditions) {
                    const isValid = TypeTransformation.validTransformationCondition(condition, data.data as {[key: string]: any}, [...index]);

                    if (isValid) {
                        valid = true;
                        break;
                    }
                }
            }

            // we don't error out on a non-matching condition, simply pass the transformation by
            if (!valid) return new Promise((resolve) => resolve(Result.Success([])));

            const results = await this.generateResults(data, [...index]);

            if (results.isError) {
                return new Promise((resolve) => resolve(Result.Pass(results)));
            }

            return new Promise((resolve) => resolve(Result.Success(results.value)));
        }

        return new Promise((resolve) => resolve(Result.Success(results)));
    }

    // generate results is the actual node/edge creation. While this only ever returns
    // a single node/edge, it returns it in an array for ease of use in the recursive
    // transform function
    private async generateResults(data: DataStaging, index?: number[]): Promise<Result<Node[] | Edge[]>> {
        const newPayload: {[key: string]: any} = {};
        const newPayloadRelationship: {[key: string]: any} = {};
        const failedConversions: Conversion[] = [];
        const conversions: Conversion[] = [];

        if (this.keys) {
            for (const k of this.keys) {
                // separate the metatype and metatype relationship keys from each other
                // the type mapping _should_ have easily handled the combination of keys
                if (k.metatype_key_id) {
                    const fetched = await MetatypeKeyMapper.Instance.Retrieve(k.metatype_key_id);
                    if (fetched.isError) return Promise.resolve(Result.Failure('unable to fetch keys to map payload'));

                    newPayload[fetched.value.property_name] = k.value;
                    if (k.key) {
                        const value = TypeTransformation.getNestedValue(k.key, data.data, index);

                        if (typeof value === 'undefined') {
                            switch (this.config.on_key_extraction_error) {
                                case 'fail': {
                                    break;
                                }

                                // continue only if the key is not required
                                case 'fail on required': {
                                    if (fetched.value.required) {
                                        return Promise.resolve(Result.Failure('unable to fetch data from payload for a required key'));
                                    } else continue;
                                }

                                // ignore means we can skip this key
                                case 'ignore': {
                                    continue;
                                }
                            }
                        }

                        const conversion = TypeTransformation.convertValue(fetched.value, value);
                        if (conversion === null) {
                            newPayload[fetched.value.property_name] = value;
                        } else {
                            if (conversion.errors) {
                                failedConversions.push(conversion);

                                switch (this.config.on_conversion_error) {
                                    case 'fail': {
                                        break;
                                    }

                                    // continue only if the key is not required
                                    case 'fail on required': {
                                        if (fetched.value.required) {
                                            return Promise.resolve(Result.Failure('unable to fetch data from payload for a required key'));
                                        } else continue;
                                    }

                                    // ignore means we can skip this key
                                    case 'ignore': {
                                        continue;
                                    }
                                }
                            } else {
                                newPayload[fetched.value.property_name] = conversion.converted_value;
                                conversions.push(conversion);
                            }
                        }
                    }
                }

                if (k.metatype_relationship_key_id) {
                    const fetched = await MetatypeRelationshipKeyMapper.Instance.Retrieve(k.metatype_relationship_key_id);
                    if (fetched.isError) return Promise.resolve(Result.Failure('unable to fetch keys to map payload'));

                    newPayloadRelationship[fetched.value.property_name] = k.value;
                    if (k.key) {
                        const value = TypeTransformation.getNestedValue(k.key, data.data, index);

                        if (typeof value === 'undefined') {
                            switch (this.config.on_key_extraction_error) {
                                case 'fail': {
                                    break;
                                }

                                // continue only if the key is not required
                                case 'fail on required': {
                                    if (fetched.value.required) {
                                        return Promise.resolve(Result.Failure('unable to fetch data from payload for a required key'));
                                    } else {
                                        continue;
                                    }
                                }

                                // ignore means we can skip this key
                                case 'ignore': {
                                    continue;
                                }
                            }
                        }

                        const conversion = TypeTransformation.convertValue(fetched.value, value);
                        if (conversion === null) {
                            newPayload[fetched.value.property_name] = value;
                        } else {
                            if (conversion.errors) {
                                failedConversions.push(conversion);

                                switch (this.config.on_conversion_error) {
                                    case 'fail': {
                                        break;
                                    }

                                    // continue only if the key is not required
                                    case 'fail on required': {
                                        if (fetched.value.required) {
                                            return Promise.resolve(Result.Failure('unable to fetch data from payload for a required key'));
                                        } else {
                                            continue;
                                        }
                                    }

                                    // ignore means we can skip this key
                                    case 'ignore': {
                                        continue;
                                    }
                                }
                            } else {
                                newPayload[fetched.value.property_name] = conversion.converted_value;
                                conversions.push(conversion);
                            }
                        }
                    }
                }
            }
        }

        // create a node if metatype id is set
        if (this.metatype_id && !this.metatype_relationship_pair_id) {
            const node = new Node({
                metatype: this.metatype_id,
                properties: newPayload,
                type_mapping_transformation_id: this.id,
                data_source_id: data.data_source_id,
                container_id: this.container_id!,
                data_staging_id: data.id,
                import_data_id: data.import_id,
                created_at: data.created_at,
                metadata: new NodeMetadata({
                    conversions,
                    failed_conversions: failedConversions,
                }),
            });

            if (this.unique_identifier_key) {
                node.original_data_id = `${TypeTransformation.getNestedValue(this.unique_identifier_key, data.data, index)}`;
            }

            return new Promise((resolve) => resolve(Result.Success([node])));
        }

        // create an edge if the relationship id is set
        if (this.metatype_relationship_pair_id && !this.metatype_id) {
            const edge = new Edge({
                metatype_relationship_pair: this.metatype_relationship_pair_id,
                properties: newPayloadRelationship,
                type_mapping_transformation_id: this.id,
                data_source_id: data.data_source_id,
                container_id: this.container_id!,
                data_staging_id: data.id,
                import_data_id: data.import_id,
                origin_original_id: `${TypeTransformation.getNestedValue(this.origin_id_key!, data.data, index)}`,
                origin_metatype_id: this.origin_metatype_id,
                origin_data_source_id: this.origin_data_source_id,
                destination_original_id: `${TypeTransformation.getNestedValue(this.destination_id_key!, data.data, index)}`,
                destination_metatype_id: this.destination_metatype_id,
                destination_data_source_id: this.destination_data_source_id,
                metadata: new EdgeMetadata({
                    conversions,
                    failed_conversions: failedConversions,
                }),
                created_at: data.created_at,
            });

            return new Promise((resolve) => resolve(Result.Success([edge])));
        }

        return new Promise((resolve) => resolve(Result.Failure('unable to generate either node or edge')));
    }

    // will return whether or not a transformation condition is valid for a given payload
    static validTransformationCondition(condition: Condition, payload: {[key: string]: any}, index?: number[]): boolean {
        const value = this.getNestedValue(condition.key!, payload, index);

        if (!value) return false;
        let rootExpressionResult = TypeTransformation.compare(condition.operator!, value, condition.value);

        // handle subexpressions
        if (condition.subexpressions && condition.subexpressions.length > 0) {
            for (const sub of condition.subexpressions) {
                const subValue = this.getNestedValue(sub.key!, payload, index);

                if (sub.expression === 'OR' && !rootExpressionResult) {
                    rootExpressionResult = TypeTransformation.compare(sub.operator!, subValue, sub.value);
                }

                if (sub.expression === 'AND' && rootExpressionResult) {
                    rootExpressionResult = TypeTransformation.compare(sub.operator!, subValue, sub.value);
                }
            }
        }

        return rootExpressionResult;
    }

    private static compare(operator: string, value: any, expected?: any): boolean {
        switch (operator) {
            case '==': {
                return value === expected;
            }

            case '!=': {
                return value !== expected;
            }

            case 'in': {
                const expectedValues = expected.split(',');

                return expectedValues.includes(value);
            }

            case 'contains': {
                return String(value).includes(expected);
            }

            case 'exists': {
                return typeof value !== 'undefined';
            }

            case '>': {
                return value > expected;
            }

            case '<': {
                return value < expected;
            }

            case '<=': {
                return value <= expected;
            }

            case '>=': {
                return value >= expected;
            }

            default: {
                return false;
            }
        }
    }

    static getNestedValue(key: string, payload: any, index?: number[]): any {
        try {
            const copiedIndex = index ? [...index] : undefined;
            if (key.split('.').length > 1) {
                const keys = key.split('.');
                const parent = keys.shift();

                if (Array.isArray(payload)) {
                    const currentIndex = copiedIndex?.shift();

                    return this.getNestedValue(keys.join('.'), payload[currentIndex!], copiedIndex);
                }

                return this.getNestedValue(keys.join('.'), payload[parent!], copiedIndex);
            }

            return payload[key];
        } catch {
            return undefined;
        }
    }

    // convertValue will return a Conversion on successful or unsuccessful conversion, and null
    // on values that need no conversion
    static convertValue(key: MetatypeKey | MetatypeRelationshipKey, value: any, date_conversion_format?: string): Conversion | null {
        if (typeof value === 'undefined' || value === null || value === 'null') {
            return new Conversion({original_value: value, errors: 'unable to convert value, value is null or undefined'});
        }

        switch (key.data_type) {
            case 'number': {
                if (typeof value === 'number') {
                    return null;
                }

                const convertedValue = parseInt(value, 10);
                if (isNaN(convertedValue)) {
                    return new Conversion({original_value: value, errors: 'unable to convert value to number'});
                }

                return convertedValue % 1 === 0
                    ? new Conversion({original_value: value, converted_value: Math.floor(convertedValue)})
                    : new Conversion({original_value: value, converted_value: convertedValue});
            }

            case 'float': {
                if (typeof value === 'number') {
                    return null;
                }

                const convertedValue = parseFloat(value);
                if (isNaN(convertedValue)) {
                    return new Conversion({original_value: value, errors: 'unable to convert value to float'});
                }

                return convertedValue % 1 === 0
                    ? new Conversion({original_value: value, converted_value: Math.floor(convertedValue)})
                    : new Conversion({original_value: value, converted_value: convertedValue});
            }

            case 'number64' || 'float64': {
                if (typeof value === 'string') {
                    return null;
                }

                return new Conversion({original_value: value, converted_value: String(value)});
            }

            // because dates can be formatted in various ways, all we can really do for conversion is to
            // set it to string - Deep Lynx only checks to see if dates are strings currently
            case 'date': {
                if (value instanceof Date) {
                    return new Conversion({original_value: value, converted_value: value.toISOString()});
                }

                // if it's a number we assume we're dealing with unix time
                if (typeof value === 'number') {
                    return new Conversion({original_value: value, converted_value: toDate(value).toISOString()});
                }

                if (typeof value === 'string') {
                    try {
                        const convertedDate = date_conversion_format ? parse(value, date_conversion_format, new Date()) : new Date(value);
                        return new Conversion({original_value: value, converted_value: convertedDate.toISOString()});
                    } catch (e) {
                        return new Conversion({original_value: value, errors: `unable to convert value to date using format string: ${e}`});
                    }
                }

                return new Conversion({original_value: value, errors: 'unable to convert value to date, value is not string or number'});
            }

            case 'string': {
                if (typeof value === 'string') {
                    return null;
                }

                return new Conversion({original_value: value, converted_value: String(value)});
            }

            case 'boolean': {
                if (typeof value === 'boolean') {
                    return null;
                }

                if (typeof value === 'string') {
                    return new Conversion({
                        original_value: value,
                        converted_value: value.includes('true') || value.includes('TRUE') || value.includes('True') || value.includes('1'),
                    });
                }

                // only 1 dictates true here
                if (typeof value === 'number') {
                    const converted_value = value === 1;
                    return new Conversion({original_value: value, converted_value});
                }

                // anything else dictates failure
                return new Conversion({original_value: value, errors: 'unable to convert boolean, must be a boolean, string, or number to attempt conversion'});
            }

            // enumerations are currently string only values
            case 'enumeration': {
                if (typeof value === 'string') {
                    return null;
                }
                return new Conversion({original_value: value, converted_value: String(value)});
            }

            // files are generally filenames or URLs - as such, convert to string
            case 'file': {
                if (typeof value === 'string') {
                    return null;
                }
                return new Conversion({original_value: value, converted_value: String(value)});
            }

            case 'list': {
                if (Array.isArray(value)) {
                    return null;
                }
                return new Conversion({original_value: value, converted_value: [value]});
            }

            // covers the "unknown" type where no conversion is necessary
            default: {
                return null;
            }
        }
    }
}

// Conversion represents a type transformations attempt to convert a value from a payload to the proper type
export class Conversion {
    @IsDefined()
    original_value: any;

    @IsOptional()
    converted_value?: any;

    @IsOptional()
    @IsString()
    errors?: string;

    constructor(input: {original_value: any; converted_value?: any; errors?: string}) {
        if (input) {
            this.original_value = input.original_value;
            if (typeof input.converted_value !== 'undefined') this.converted_value = input.converted_value;
            if (input.errors) this.errors = input.errors;
        }
    }
}
