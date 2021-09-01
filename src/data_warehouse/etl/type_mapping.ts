import {BaseDomainClass, NakedDomainClass} from '../../common_classes/base_domain_class';
import {IsBoolean, IsDefined, IsOptional, IsString, IsUUID} from 'class-validator';
import TypeTransformation from './type_transformation';
import {Type} from 'class-transformer';

const crypto = require('crypto');
const flatten = require('flat');

/*
    TypeMapping represents a data type mapping record in the Deep Lynx database and the various
    validations required for said record to be considered valid. It also includes
    functions for managing a data type mapping's transformations.
 */
export default class TypeMapping extends BaseDomainClass {
    @IsOptional()
    @IsUUID()
    id?: string;

    @IsUUID()
    container_id?: string;

    @IsDefined()
    sample_payload?: any;

    @IsUUID()
    data_source_id?: string;

    @IsBoolean()
    active = false;

    @IsString()
    shape_hash?: string;

    @Type(() => TypeTransformation)
    transformations: TypeTransformation[] | undefined;
    // for tracking removed transformations
    #removedTransformations: TypeTransformation[] | undefined;

    constructor(input: {
        container_id: string;
        sample_payload: any;
        data_source_id: string;
        active?: boolean;
        shape_hash?: string;
        transformations?: TypeTransformation[];
    }) {
        super();

        if (input) {
            this.container_id = input.container_id;
            this.sample_payload = input.sample_payload;
            this.data_source_id = input.data_source_id;
            if (input.active) this.active = input.active;
            // allow for overriding the generated shape hash - this is not recommended
            if (input.shape_hash) this.shape_hash = input.shape_hash;
            else {
                this.shape_hash = TypeMapping.objectToShapeHash(input.sample_payload);
            }
            if (input.transformations) this.transformations = input.transformations;
        }
    }

    // creates a base64 encoded hash of an object's shape. An object shape is a combination
    // of its keys and the type of data those keys are in - this method is static so users
    // can access it to create type mapping shape hash without having to actually build
    // a mapping
    static objectToShapeHash(obj: any) {
        const keyTypes: string[] = [];
        // safe means that the flattened object will maintain arrays as they are,
        // not attempt to flatten them along with the rest of the object
        const flattened = flatten(obj, {safe: true});

        const extractPropsAndTypes = (obj: any, resultArray: string[]) => {
            for (const key of Object.keys(obj)) {
                if (Array.isArray(obj[key]) && obj[key].length > 0) {
                    if (typeof obj[key][0] === 'object' && obj[key][0] !== null) {
                        extractPropsAndTypes(obj[key][0], resultArray);
                    }
                }

                if (Array.isArray(obj[key])) {
                    resultArray.push(key + `:list`);
                } else {
                    resultArray.push(key + `:${typeof obj[key]}`);
                }
            }
        };

        extractPropsAndTypes(flattened, keyTypes);

        return crypto.createHash('sha256').update(keyTypes.sort().join('')).digest('base64');
    }

    get removedTransformations() {
        return this.#removedTransformations;
    }

    addTransformation(...transformations: TypeTransformation[]) {
        if (!this.transformations) this.transformations = [];
        this.transformations.push(...transformations);
    }

    replaceTransformations(transformations: TypeTransformation[], removedTransformations?: TypeTransformation[]) {
        this.transformations = transformations;
        if (removedTransformations) this.#removedTransformations = removedTransformations;
    }

    // removeTransformations will remove the first matching transformation, you must save the object
    // for changes to take place
    removeTransformation(...transformations: TypeTransformation[] | string[]) {
        if (!this.transformations) this.transformations = [];
        if (!this.#removedTransformations) this.#removedTransformations = [];
        for (const transformation of transformations) {
            if (typeof transformation === 'string') {
                this.transformations = this.transformations.filter((t) => {
                    if (t.id !== transformation) {
                        return true;
                    }
                    this.#removedTransformations!.push(t);
                    return false;
                }, this);
            } else {
                // if it's not a string, we can safely assume it's the type
                this.transformations = this.transformations.filter((t) => {
                    if (t.id !== transformation.id) {
                        return true;
                    }
                    this.#removedTransformations!.push(t);
                    return false;
                }, this);
            }
        }
    }
}

export class TypeMappingExportPayload extends NakedDomainClass {
    @IsOptional()
    mapping_ids: string[] = [];

    @IsUUID()
    target_data_source?: string;
}
