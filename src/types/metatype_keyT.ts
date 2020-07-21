import * as t from 'io-ts'
import {MetatypeRelationshipKeyT} from "./metatype_relationship_keyT";
import {recordMetaT} from "./recordMetaT";

const metatypeKeyRequired = t.type({
    name: t.string,
    property_name: t.string,
    required: t.boolean,
    description: t.string,
    data_type: t.union([
        t.literal('number'),
        t.literal('date'),
        t.literal('string'),
        t.literal('boolean'),
        t.literal('enumeration'),
        t.literal('file')
    ]),
});

const metatypeKeyOptional = t.partial({
    id: t.string,
    archived: t.boolean,
    metatype_id: t.string,
    cardinality: t.number,
    validation: t.partial({
        regex: t.string,
        min: t.number,
        max: t.number
    }),
    unique: t.boolean,
    options: t.array(t.string),
    default_value: t.union([
        t.string,
        t.boolean,
        t.number,
        t.UnknownArray
    ])
});

export const metatypeKeyT = t.exact(t.intersection([metatypeKeyRequired, metatypeKeyOptional, recordMetaT]));
export const metatypeKeysT = t.array(metatypeKeyT);

export type MetatypeKeyT = t.TypeOf<typeof metatypeKeyT>
export type MetatypeKeysT = t.TypeOf<typeof metatypeKeysT>


// CompileMetatypeKeys accepts an array of keys and creates an io-ts runtime type decoder out of them. This single function
// is extremely important, and is the driving force behind the dynamic type generation and being able to type-check user
// payloads.
export function CompileMetatypeKeys (mKeys: MetatypeKeyT[] | MetatypeRelationshipKeyT[]){
    const output : {[key:string]:any} = {};
    const partialOutput : {[key:string]:any} = {};

    // the handled key types here can become more complex as the application evolves
    (mKeys as (MetatypeKeyT| MetatypeRelationshipKeyT)[]).map((key) => {
        switch(key.data_type) {
            case "number": {
                (key.required) ? output[key.property_name] = t.number : partialOutput[key.property_name] = t.number;
                break;
            }

            case "date" : {
                (key.required) ?  output[key.property_name] = t.string : partialOutput[key.property_name] = t.string;
                break;
            }

            case "string" : {
                (key.required) ? output[key.property_name] = t.string : partialOutput[key.property_name] = t.string;
                break;
            }

            case "boolean": {
                (key.required) ? output[key.property_name] = t.boolean : partialOutput[key.property_name] = t.boolean;
                break;
            }

            case "enumeration": {
                // if we don't have options, enum will default to a string value
                if (key.options === undefined) {
                    output[key.property_name] = t.string;
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
