/*
The query layer is a GraphQL layer which is dynamically built based on a user's current ontology. This schema file contains
most of the code to make this happen.
 */
import {
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLString,
    GraphQLNamedType,
    GraphQLFloat,
    GraphQLBoolean,
    GraphQLList,
    GraphQLEnumType,
    GraphQLEnumValueConfig,
    GraphQLInputType,
    GraphQLInputObjectType,
} from 'graphql';
import MetatypeRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import Result from '../common_classes/result';
import GraphQLJSON from 'graphql-type-json';
import Metatype from '../domain_objects/data_warehouse/ontology/metatype';
import {stringToValidPropertyName} from '../services/utilities';
import {v4 as uuidv4} from 'uuid';

// GraphQLSchemaGenerator takes a container and generates a valid GraphQL schema for all contained metatypes. This will
// allow users to query and filter data based on node type, the various properties that type might have, and other bits
// of metadata.
export default class GraphQLSchemaGenerator {
    #metatypeRepo: MetatypeRepository;

    constructor() {
        this.#metatypeRepo = new MetatypeRepository();
    }

    // generate requires a containerID because the schema it generates is based on a user's ontology and ontologies are
    // separated by containers
    async ForContainer(containerID: string): Promise<Result<GraphQLSchema>> {
        // fetch all metatypes for the container, with their keys - the single most expensive call of this function
        const metatypeResults = await this.#metatypeRepo.where().containerID('eq', containerID).list(true);
        if (metatypeResults.isError) return Promise.resolve(Result.Pass(metatypeResults));

        const metatypeGraphQLObjects: {[key: string]: any} = {};

        // we must declare the metadata input object beforehand so we can include it in the final schema entry for each
        // metatype
        const metadataType = new GraphQLInputObjectType({
            name: 'metadata',
            fields: {
                data_source_id: {type: GraphQLString},
                metatype_id: {type: GraphQLString},
                metatype_name: {type: GraphQLString},
                original_id: {type: GraphQLJSON}, // since the original ID might be a number, treat it as valid JSON
                import_id: {type: GraphQLString},
            },
        });

        metatypeResults.value.forEach((metatype) => {
            metatypeGraphQLObjects[metatype.name] = {
                args: {...this.inputFieldsForMetatype(metatype), metadata: {type: metadataType}},
                description: metatype.description,
                type: new GraphQLList(
                    new GraphQLObjectType({
                        name: metatype.name,
                        // needed because the return type accepts an object, but throws a fit about it
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        fields: () => {
                            const output: {[key: string]: {[key: string]: GraphQLNamedType | GraphQLList<any>}} = {};

                            metatype.keys?.forEach((metatypeKey) => {
                                // keys must match the regex format of /^[_a-zA-Z][_a-zA-Z0-9]*$/ in order to be considered
                                // valid graphql property names. While we force the user to meet these requirements at key
                                // creation, we can't guarantee that legacy data will conform to these standards
                                metatypeKey.property_name = stringToValidPropertyName(metatypeKey.property_name);

                                switch (metatypeKey.data_type) {
                                    // because we have no specification on our internal number type, we
                                    // must set this as a float for now
                                    case 'number': {
                                        output[metatypeKey.property_name] = {
                                            type: GraphQLFloat,
                                        };
                                        break;
                                    }

                                    case 'boolean': {
                                        output[metatypeKey.property_name] = {
                                            type: GraphQLBoolean,
                                        };
                                        break;
                                    }

                                    case 'string' || 'date' || 'file': {
                                        output[metatypeKey.property_name] = {
                                            type: GraphQLString,
                                        };
                                        break;
                                    }

                                    case 'list': {
                                        output[metatypeKey.property_name] = {
                                            type: new GraphQLList(GraphQLJSON),
                                        };
                                        break;
                                    }

                                    case 'enumeration': {
                                        const enumMap: {[key: string]: GraphQLEnumValueConfig} = {};

                                        if (metatypeKey.options) {
                                            metatypeKey.options.forEach((option) => {
                                                enumMap[option] = {
                                                    value: option,
                                                };
                                            });
                                        }

                                        output[metatypeKey.property_name] = {
                                            type: new GraphQLEnumType({
                                                name: `${metatype.name}-${metatypeKey.name}_Enum_Type_${uuidv4().replace('-', '')}`,
                                                values: enumMap,
                                            }),
                                        };
                                        break;
                                    }

                                    default: {
                                        output[metatypeKey.property_name] = {
                                            type: GraphQLString,
                                        };
                                    }
                                }
                            });

                            return output;
                        },
                    }),
                ),
                resolve: this.resolverForMetatype(metatype),
            };
        });

        return Promise.resolve(
            Result.Success(
                new GraphQLSchema({
                    query: new GraphQLObjectType({
                        name: 'Query',
                        fields: metatypeGraphQLObjects,
                    }),
                }),
            ),
        );
    }

    resolverForMetatype(metatype: Metatype): (_: any, {input}: {input: any}) => any {
        return (_, input) => {
            return [input];
        };
    }

    // each key in the metatype should be included on the input object as a field to be filtered on
    inputFieldsForMetatype(metatype: Metatype): {[key: string]: any} {
        const fields: {[key: string]: any} = {};

        metatype.keys?.forEach((metatypeKey) => {
            metatypeKey.property_name = stringToValidPropertyName(metatypeKey.property_name);

            switch (metatypeKey.data_type) {
                // because we have no specification on our internal number type, we
                // must set this as a float for now
                case 'number': {
                    fields[metatypeKey.property_name] = {
                        type: GraphQLFloat,
                    };
                    break;
                }

                case 'boolean': {
                    fields[metatypeKey.property_name] = {
                        type: GraphQLBoolean,
                    };
                    break;
                }

                case 'string' || 'date' || 'file': {
                    fields[metatypeKey.property_name] = {
                        type: GraphQLString,
                    };
                    break;
                }

                case 'list': {
                    fields[metatypeKey.property_name] = {
                        type: new GraphQLList(GraphQLJSON),
                    };
                    break;
                }

                case 'enumeration': {
                    const enumMap: {[key: string]: GraphQLEnumValueConfig} = {};

                    if (metatypeKey.options) {
                        metatypeKey.options.forEach((option) => {
                            enumMap[option] = {
                                value: option,
                            };
                        });
                    }

                    // we have to include a UUID here so that we can insure a uniquely named type
                    fields[metatypeKey.property_name] = {
                        type: new GraphQLEnumType({
                            name: `${metatype.name}-${metatypeKey.name}_Enum_Type_${uuidv4().replace('-', '')}`,
                            values: enumMap,
                        }),
                    };
                    break;
                }

                default: {
                    fields[metatypeKey.property_name] = {
                        type: GraphQLString,
                    };
                }
            }
        });

        // unfortunately we don't have a solid method of nesting these input types
        // and we really really really want the structure we're defining here. As such
        // the code is ugly because we're building an ugly structure
        const conditionalType = new GraphQLInputObjectType({
            name: metatype.name + '_Conditional',
            fields: {
                ...fields,
                AND: {
                    type: new GraphQLInputObjectType({
                        name: metatype.name + '_AND_A',
                        fields: {
                            ...fields,
                            AND: {
                                type: new GraphQLInputObjectType({
                                    name: metatype.name + '_AND_B',
                                    fields: {
                                        ...fields,
                                        AND: {
                                            type: new GraphQLInputObjectType({
                                                name: metatype.name + '_AND_C',
                                                fields,
                                            }),
                                        },
                                        OR: {
                                            type: new GraphQLInputObjectType({
                                                name: metatype.name + '_OR_D',
                                                fields,
                                            }),
                                        },
                                    },
                                }),
                            },
                            OR: {
                                type: new GraphQLInputObjectType({
                                    name: metatype.name + '_OR_E',
                                    fields: {
                                        ...fields,
                                        AND: {
                                            type: new GraphQLInputObjectType({
                                                name: metatype.name + '_AND_F',
                                                fields: {
                                                    ...fields,
                                                    AND: {
                                                        type: new GraphQLInputObjectType({
                                                            name: metatype.name + '_AND_O',
                                                            fields,
                                                        }),
                                                    },
                                                    OR: {
                                                        type: new GraphQLInputObjectType({
                                                            name: metatype.name + '_OR_P',
                                                            fields,
                                                        }),
                                                    },
                                                },
                                            }),
                                        },
                                        OR: {
                                            type: new GraphQLInputObjectType({
                                                name: metatype.name + '_OR_G',
                                                fields: {
                                                    ...fields,
                                                    AND: {
                                                        type: new GraphQLInputObjectType({
                                                            name: metatype.name + '_AND_Q',
                                                            fields,
                                                        }),
                                                    },
                                                    OR: {
                                                        type: new GraphQLInputObjectType({
                                                            name: metatype.name + '_OR_R',
                                                            fields,
                                                        }),
                                                    },
                                                },
                                            }),
                                        },
                                    },
                                }),
                            },
                        },
                    }),
                },
                OR: {
                    type: new GraphQLInputObjectType({
                        name: metatype.name + '_OR_H',
                        fields: {
                            ...fields,
                            AND: {
                                type: new GraphQLInputObjectType({
                                    name: metatype.name + '_AND_I',
                                    fields: {
                                        ...fields,
                                        AND: {
                                            type: new GraphQLInputObjectType({
                                                name: metatype.name + '_AND_J',
                                                fields: {
                                                    ...fields,
                                                    AND: {
                                                        type: new GraphQLInputObjectType({
                                                            name: metatype.name + '_AND_S',
                                                            fields,
                                                        }),
                                                    },
                                                    OR: {
                                                        type: new GraphQLInputObjectType({
                                                            name: metatype.name + '_OR_T',
                                                            fields,
                                                        }),
                                                    },
                                                },
                                            }),
                                        },
                                        OR: {
                                            type: new GraphQLInputObjectType({
                                                name: metatype.name + '_OR_K',
                                                fields: {
                                                    ...fields,
                                                    AND: {
                                                        type: new GraphQLInputObjectType({
                                                            name: metatype.name + '_AND_U',
                                                            fields,
                                                        }),
                                                    },
                                                    OR: {
                                                        type: new GraphQLInputObjectType({
                                                            name: metatype.name + '_OR_V',
                                                            fields,
                                                        }),
                                                    },
                                                },
                                            }),
                                        },
                                    },
                                }),
                            },
                            OR: {
                                type: new GraphQLInputObjectType({
                                    name: metatype.name + '_OR_L',
                                    fields: {
                                        ...fields,
                                        AND: {
                                            type: new GraphQLInputObjectType({
                                                name: metatype.name + '_AND_M',
                                                fields: {
                                                    ...fields,
                                                    AND: {
                                                        type: new GraphQLInputObjectType({
                                                            name: metatype.name + '_AND_W',
                                                            fields,
                                                        }),
                                                    },
                                                    OR: {
                                                        type: new GraphQLInputObjectType({
                                                            name: metatype.name + '_OR_X',
                                                            fields,
                                                        }),
                                                    },
                                                },
                                            }),
                                        },
                                        OR: {
                                            type: new GraphQLInputObjectType({
                                                name: metatype.name + '_OR_N',
                                                fields: {
                                                    ...fields,
                                                    AND: {
                                                        type: new GraphQLInputObjectType({
                                                            name: metatype.name + '_AND_Y',
                                                            fields,
                                                        }),
                                                    },
                                                    OR: {
                                                        type: new GraphQLInputObjectType({
                                                            name: metatype.name + '_OR_Z',
                                                            fields,
                                                        }),
                                                    },
                                                },
                                            }),
                                        },
                                    },
                                }),
                            },
                        },
                    }),
                },
            },
        });

        // all that nested stuff for a simple way of handling conditions in our input arguments :|
        fields.AND = {type: conditionalType};
        fields.OR = {type: conditionalType};

        return fields;
    }
}
