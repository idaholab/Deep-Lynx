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
    GraphQLInputObjectType,
    GraphQLInt,
} from 'graphql';
import MetatypeRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import Result from '../common_classes/result';
import GraphQLJSON from 'graphql-type-json';
import Metatype from '../domain_objects/data_warehouse/ontology/metatype';
import {stringToValidPropertyName} from '../services/utilities';
import NodeRepository from '../data_access_layer/repositories/data_warehouse/data/node_repository';
import Logger from '../services/logger';

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
        const recordInputType = new GraphQLInputObjectType({
            name: 'record_input',
            fields: {
                data_source_id: {type: GraphQLString},
                original_id: {type: GraphQLJSON}, // since the original ID might be a number, treat it as valid JSON
                import_id: {type: GraphQLString},
                limit: {type: GraphQLInt, defaultValue: 10000},
                page: {type: GraphQLInt, defaultValue: 1},
            },
        });

        const recordInfo = new GraphQLObjectType({
            name: 'recordInfo',
            fields: {
                id: {type: GraphQLString},
                data_source_id: {type: GraphQLString},
                original_id: {type: GraphQLJSON}, // since the original ID might be a number, treat it as valid JSON
                import_id: {type: GraphQLString},
                metatype_id: {type: GraphQLString},
                metatype_name: {type: GraphQLString},
                created_at: {type: GraphQLString},
                created_by: {type: GraphQLString},
                modified_at: {type: GraphQLString},
                modified_by: {type: GraphQLString},
                metadata: {type: GraphQLJSON},
                count: {type: GraphQLInt},
                page: {type: GraphQLInt},
            },
        });

        metatypeResults.value.forEach((metatype) => {
            metatypeGraphQLObjects[stringToValidPropertyName(metatype.name)] = {
                args: {...this.inputFieldsForMetatype(metatype), _record: {type: recordInputType}},
                description: metatype.description,
                type: new GraphQLList(
                    new GraphQLObjectType({
                        name: stringToValidPropertyName(metatype.name),
                        // needed because the return type accepts an object, but throws a fit about it
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        fields: () => {
                            const output: {[key: string]: {[key: string]: GraphQLNamedType | GraphQLList<any>}} = {};
                            output._record = {type: recordInfo};

                            metatype.keys?.forEach((metatypeKey) => {
                                // keys must match the regex format of /^[_a-zA-Z][_a-zA-Z0-9]*$/ in order to be considered
                                // valid graphql property names. While we force the user to meet these requirements at key
                                // creation, we can't guarantee that legacy data will conform to these standards
                                const propertyName = stringToValidPropertyName(metatypeKey.property_name);

                                switch (metatypeKey.data_type) {
                                    // because we have no specification on our internal number type, we
                                    // must set this as a float for now
                                    case 'number': {
                                        output[propertyName] = {
                                            type: GraphQLFloat,
                                        };
                                        break;
                                    }

                                    case 'boolean': {
                                        output[propertyName] = {
                                            type: GraphQLBoolean,
                                        };
                                        break;
                                    }

                                    case 'string' || 'date' || 'file': {
                                        output[propertyName] = {
                                            type: GraphQLString,
                                        };
                                        break;
                                    }

                                    case 'list': {
                                        output[propertyName] = {
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

                                        output[propertyName] = {
                                            type: new GraphQLEnumType({
                                                name: stringToValidPropertyName(`${metatype.name}_${metatypeKey.name}_Enum_TypeA`),
                                                values: enumMap,
                                            }),
                                        };
                                        break;
                                    }

                                    default: {
                                        output[propertyName] = {
                                            type: GraphQLString,
                                        };
                                    }
                                }
                            });

                            return output;
                        },
                    }),
                ),
                resolve: this.resolverForMetatype(containerID, metatype),
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

    resolverForMetatype(containerID: string, metatype: Metatype): (_: any, {input}: {input: any}) => any {
        return async (_, input: {[key: string]: any}) => {
            let repo = new NodeRepository();
            repo = repo.where().containerID('eq', containerID).and().metatypeID('eq', metatype.id);

            // you might notice that metatype_id and metatype_name are missing as filters - these are not
            // needed as we've already dictated what metatype to look for based on the query itself
            if (input._record) {
                if (input._record.data_source_id) {
                    const query = this.breakQuery(input._record.data_source_id);
                    repo = repo.and().dataSourceID(query[0], query[1]);
                }

                if (input._record.original_id) {
                    const query = this.breakQuery(input._record.original_id);
                    repo = repo.and().originalDataID(query[0], query[1]);
                }

                if (input._record.import_id) {
                    const query = this.breakQuery(input._record.import_id);
                    repo = repo.and().importDataID(query[0], query[1]);
                }
            }

            // we must map out what the graphql refers to a metatype's keys are vs. what they actually are so
            // that we can map the query properly
            const propertyMap: {
                [key: string]: {
                    name: string;
                    data_type: string;
                };
            } = {};

            metatype.keys?.forEach((key) => {
                propertyMap[stringToValidPropertyName(key.property_name)] = {
                    name: key.property_name,
                    data_type: key.data_type,
                };
            });

            // iterate through the input object, ignoring reserved properties and adding all others to
            // the query as property queries
            Object.keys(input).forEach((key) => {
                if (key === '_record') return;

                const query = this.breakQuery(String(input[key]));
                repo = repo.and().property(propertyMap[key].name, query[0], query[1], propertyMap[key].data_type);
            });

            // wrapping the end resolver in a promise insures that we don't return prior to all results being
            // fetched
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            return new Promise((resolve) =>
                repo
                    .list(true, {limit: 10000})
                    .then((results) => {
                        if (results.isError) {
                            Logger.error(`unable to list nodes ${results.error?.error}`);
                            resolve([]);
                        }

                        const nodeOutput: {[key: string]: any}[] = [];

                        results.value.forEach((node) => {
                            const properties: {[key: string]: any} = {};
                            if (node.properties) {
                                Object.keys(node.properties).forEach((key) => {
                                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                    // @ts-ignore
                                    properties[stringToValidPropertyName(key)] = node.properties[key];
                                });
                            }

                            nodeOutput.push({
                                ...properties,
                                _record: {
                                    id: node.id,
                                    data_source_id: node.data_source_id,
                                    original_id: node.original_data_id,
                                    import_id: node.import_data_id,
                                    metatype_id: node.metatype_id,
                                    metatype_name: node.metatype_name,
                                    metadata: node.metadata,
                                    created_at: node.created_at?.toISOString(),
                                    created_by: node.created_by,
                                    modified_at: node.modified_at?.toISOString(),
                                    modified_by: node.modified_by,
                                },
                            });
                        });

                        resolve(nodeOutput);
                    })
                    .catch((e) => {
                        resolve(e);
                    }),
            );
        };
    }

    // each key in the metatype should be included on the input object as a field to be filtered on
    inputFieldsForMetatype(metatype: Metatype): {[key: string]: any} {
        const fields: {[key: string]: any} = {};

        metatype.keys?.forEach((metatypeKey) => {
            const propertyName = stringToValidPropertyName(metatypeKey.property_name);

            switch (metatypeKey.data_type) {
                // because we have no specification on our internal number type, we
                // must set this as a float for now
                case 'number': {
                    fields[propertyName] = {
                        type: GraphQLFloat,
                    };
                    break;
                }

                case 'boolean': {
                    fields[propertyName] = {
                        type: GraphQLBoolean,
                    };
                    break;
                }

                case 'string' || 'date' || 'file': {
                    fields[propertyName] = {
                        type: GraphQLString,
                    };
                    break;
                }

                case 'list': {
                    fields[propertyName] = {
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
                    fields[propertyName] = {
                        type: new GraphQLEnumType({
                            name: stringToValidPropertyName(`${metatype.name}_${metatypeKey.name}_Enum_Type_B`),
                            values: enumMap,
                        }),
                    };
                    break;
                }

                default: {
                    fields[propertyName] = {
                        type: GraphQLString,
                    };
                }
            }
        });

        return fields;
    }

    // breakQuery takes a string query and breaks off the operator from the rest of the query if present, if not present
    // defaults to the 'eq' operator
    private breakQuery(query: string): string[] {
        const parts = query.split(' ');

        // check to see if we have an operator, if not, return the 'eq' operator and the value
        if (!['eq', 'neq', 'like', 'in', '<', '>'].includes(parts[0])) {
            return ['eq', query];
        }

        const operator = parts.shift();

        return [operator as string, parts.join(' ')];
    }
}
