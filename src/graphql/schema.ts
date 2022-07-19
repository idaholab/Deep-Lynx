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
    GraphQLNonNull,
} from 'graphql';
import MetatypeRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import Result from '../common_classes/result';
import GraphQLJSON from 'graphql-type-json';
import Metatype from '../domain_objects/data_warehouse/ontology/metatype';
import MetatypeRelationship from '../domain_objects/data_warehouse/ontology/metatype_relationship';
import {stringToValidPropertyName} from '../services/utilities';
import NodeRepository from '../data_access_layer/repositories/data_warehouse/data/node_repository';
import Logger from '../services/logger';
import MetatypeRelationshipPairRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_pair_repository';
import EdgeRepository from '../data_access_layer/repositories/data_warehouse/data/edge_repository';
import MetatypeRelationshipRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_repository';
import NodeLeafRepository from '../data_access_layer/repositories/data_warehouse/data/node_leaf_repository';
import OntologyVersionRepository from '../data_access_layer/repositories/data_warehouse/ontology/versioning/ontology_version_repository';
import TypeTransformationMapper from '../data_access_layer/mappers/data_warehouse/etl/type_transformation_mapper';
import {plainToClass} from "class-transformer";
import Node from "../domain_objects/data_warehouse/data/node";
import {Transform} from "stream";
import Edge from "../domain_objects/data_warehouse/data/edge";

// GraphQLSchemaGenerator takes a container and generates a valid GraphQL schema for all contained metatypes. This will
// allow users to query and filter data based on node type, the various properties that type might have, and other bits
// of metadata.
export default class GraphQLSchemaGenerator {
    #metatypeRepo: MetatypeRepository;
    #metatypePairRepo: MetatypeRelationshipPairRepository;
    #relationshipRepo: MetatypeRelationshipRepository;
    #ontologyRepo: OntologyVersionRepository;
    #nodeRepo: NodeRepository;
    #transformationMapper: TypeTransformationMapper;

    constructor() {
        this.#metatypeRepo = new MetatypeRepository();
        this.#metatypePairRepo = new MetatypeRelationshipPairRepository();
        this.#relationshipRepo = new MetatypeRelationshipRepository();
        this.#ontologyRepo = new OntologyVersionRepository();
        this.#nodeRepo = new NodeRepository();
        this.#transformationMapper = TypeTransformationMapper.Instance;
    }

    // generate requires a containerID because the schema it generates is based on a user's ontology and ontologies are
    // separated by containers
    async ForContainer(containerID: string, options: ResolverOptions): Promise<Result<GraphQLSchema>> {
        // fetch the currently published ontology if the versionID wasn't provided
        if (!options.ontologyVersionID) {
            const ontResults = await this.#ontologyRepo
                .where()
                .containerID('eq', containerID)
                .and()
                .status('eq', 'published')
                .list({sortBy: 'id', sortDesc: true});
            if (ontResults.isError || ontResults.value.length === 0) {
                Logger.error('unable to fetch current ontology, or no currently published ontology');
            } else {
                options.ontologyVersionID = ontResults.value[0].id;
            }
        }

        // fetch all metatypes for the container, with their keys - the single most expensive call of this function
        const metatypeResults = await this.#metatypeRepo
            .where()
            .containerID('eq', containerID)
            .and()
            .ontologyVersion('eq', options.ontologyVersionID)
            .list(true);
        if (metatypeResults.isError) {
            return Promise.resolve(Result.Pass(metatypeResults));
        }

        // fetch all metatype relationship pairs - used for _relationship queries.
        const metatypePairResults = await this.#metatypePairRepo
            .where()
            .containerID('eq', containerID)
            .and()
            .ontologyVersion('eq', options.ontologyVersionID)
            .list();
        if (metatypePairResults.isError) {
            return Promise.resolve(Result.Pass(metatypePairResults));
        }

        // fetch all relationship types. Used for relationship wrapper queries.
        const relationshipResults = await this.#relationshipRepo
            .where()
            .containerID('eq', containerID)
            .and()
            .ontologyVersion('eq', options.ontologyVersionID)
            .list(true);
        if (relationshipResults.isError) {
            return Promise.resolve(Result.Pass(relationshipResults));
        }

        // used for querying edges based on node (see input._relationship resolver)
        const metatypePairObjects: {[key: string]: any} = {};
        metatypePairResults.value.forEach((pair) => {
            const origin = stringToValidPropertyName(pair.origin_metatype_name!);
            const rel = stringToValidPropertyName(pair.relationship_name!);
            const dest = stringToValidPropertyName(pair.destination_metatype_name!);
            // populate list for forward searching
            if (!(origin in metatypePairObjects)) {
                metatypePairObjects[origin] = {};
            }
            if (!(rel in metatypePairObjects[origin])) {
                metatypePairObjects[origin][rel] = {};
            }
            if (!(dest in metatypePairObjects[origin][rel])) {
                metatypePairObjects[origin][rel][dest] = {type: GraphQLString};
            }
        });

        const metatypeGraphQLObjects: {[key: string]: any} = {};

        // we must declare the metadata input object beforehand so we can include it in the final schema entry for each
        // metatype
        const recordInputType = new GraphQLInputObjectType({
            name: 'record_input',
            fields: {
                id: {type: new GraphQLInputObjectType({
                    name: "record_input_id",
                    fields: {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
                data_source_id: {type: new GraphQLInputObjectType({
                    name: "record_input_data_source_id",
                    fields : {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},

                original_id: {type: new GraphQLInputObjectType({
                    name: "record_input_original_id",
                    fields : {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLJSON)}
                    }
                })}, // since the original ID might be a number, treat it as valid JSON
                import_id: {type: new GraphQLInputObjectType({
                    name: "record_input_import_id",
                    fields : {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
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
                properties: {type: GraphQLJSON},
                count: {type: GraphQLInt},
                page: {type: GraphQLInt},
            },
        });

        // needed when a user decides they want the results as a file vs. a raw return
        const fileInfo = new GraphQLObjectType({
            name: 'fileInfo',
            fields: {
                id: {type: GraphQLString},
                file_name: {type: GraphQLString},
                file_size: {type: GraphQLFloat},
                md5hash: {type: GraphQLString},
                metadata: {type: GraphQLJSON},
                url: {type: GraphQLString},
            },
        });

        metatypeResults.value.forEach((metatype) => {
            if (!metatype.keys || metatype.keys.length === 0) return;

            // the following 4 input/object types are used for querying or introspection on _relationship
            const destinationInputType = new GraphQLInputObjectType({
                name: `${stringToValidPropertyName(metatype.name)}_destination_input`,
                // needed because the return type accepts an object, but throws a fit about it
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                fields: () => {
                    const fields: {[key: string]: {[key: string]: any}} = {};
                    if (metatypePairObjects[stringToValidPropertyName(metatype.name)]) {
                        Object.keys(metatypePairObjects[stringToValidPropertyName(metatype.name)]).forEach((pair) => {
                            Object.keys(metatypePairObjects[stringToValidPropertyName(metatype.name)][pair]).forEach((dest) => {
                                fields[dest] = {type: GraphQLBoolean};
                            });
                        });
                    }
                    return fields;
                },
            });

            const relationshipInputType = new GraphQLInputObjectType({
                name: `${stringToValidPropertyName(metatype.name)}_relationship_input`,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                fields: () => {
                    const fields: {[key: string]: {[key: string]: GraphQLNamedType | GraphQLList<any>}} = {};
                    if (metatypePairObjects[metatype.name]) {
                        Object.keys(metatypePairObjects[metatype.name]).forEach((rel) => {
                            fields[rel] = {type: new GraphQLList(destinationInputType)};
                        });
                    } else {
                        // if no relationships exists, set relationship to _none: true
                        fields._none = {type: GraphQLBoolean};
                    }
                    return fields;
                },
            });

            const destinationInfo = new GraphQLObjectType({
                name: `${stringToValidPropertyName(metatype.name)}_destinationInfo`,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                fields: () => {
                    const fields: {[key: string]: any} = {};
                    if (metatypePairObjects[metatype.name]) {
                        Object.keys(metatypePairObjects[metatype.name]).forEach((pair) => {
                            Object.keys(metatypePairObjects[metatype.name][pair]).forEach((dest) => {
                                fields[dest] = {type: GraphQLString};
                            });
                        });
                    }
                    return fields;
                },
            });

            const relationshipInfo = new GraphQLObjectType({
                name: `${stringToValidPropertyName(metatype.name)}_relationshipInfo`,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                fields: () => {
                    const fields: {[key: string]: any} = {};
                    if (metatypePairObjects[metatype.name]) {
                        Object.keys(metatypePairObjects[metatype.name]).forEach((pair) => {
                            fields[pair] = {type: destinationInfo};
                        });
                    } else {
                        // if no relationships exists, set relationship to _none: true
                        fields._none = {type: GraphQLBoolean};
                    }
                    return fields;
                },
            });

            metatypeGraphQLObjects[stringToValidPropertyName(metatype.name)] = {
                args: {
                    ...this.inputFieldsForMetatype(metatype),
                    _record: {type: recordInputType},
                    _relationship: {type: relationshipInputType},
                },
                description: metatype.description,
                type: options.returnFile
                    ? fileInfo
                    : new GraphQLList(
                        new GraphQLObjectType({
                            name: stringToValidPropertyName(metatype.name),
                            // needed because the return type accepts an object, but throws a fit about it
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            fields: () => {
                                const output: {[key: string]: {[key: string]: GraphQLNamedType | GraphQLList<any>}} = {};
                                output._record = {type: recordInfo};
                                output._relationship = {type: relationshipInfo};
                                output._file = {type: fileInfo};

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
                resolve: this.resolverForMetatype(containerID, metatype, options),
            };
        });

        const relationshipGraphQLObjects: {[key: string]: any} = {};

        // metadata objects for edges (metatype relationships)
        const edgeRecordInputType = new GraphQLInputObjectType({
            name: 'edge_record_input',
            fields: {
                id: {type: new GraphQLInputObjectType({
                    name: "edge_record_input_id",
                    fields: {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
                pair_id: {type: new GraphQLInputObjectType({
                    name: "edge_record_input_pair_id",
                    fields: {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
                data_source_id: {type: new GraphQLInputObjectType({
                    name: "edge_record_data_source_id",
                    fields: {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
                import_id: {type: new GraphQLInputObjectType({
                    name: "edge_record_input_import_id",
                    fields: {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
                origin_id: {type: new GraphQLInputObjectType({
                    name: "edge_record_input_origin_id",
                    fields: {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
                destination_id: {type: new GraphQLInputObjectType({
                    name: "edge_record_input_destination_id",
                    fields: {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
                limit: {type: GraphQLInt, defaultValue: 10000},
                page: {type: GraphQLInt, defaultValue: 1},
            },
        });

        const edgeRecordInfo = new GraphQLObjectType({
            name: 'edge_recordInfo',
            fields: {
                id: {type: GraphQLString},
                pair_id: {type: GraphQLString},
                data_source_id: {type: GraphQLString},
                import_id: {type: GraphQLString},
                origin_id: {type: GraphQLString},
                origin_metatype_id: {type: GraphQLString},
                destination_id: {type: GraphQLString},
                destination_metatype_id: {type: GraphQLString},
                relationship_name: {type: GraphQLString},
                created_at: {type: GraphQLString},
                created_by: {type: GraphQLString},
                modified_at: {type: GraphQLString},
                modified_by: {type: GraphQLString},
                metadata: {type: GraphQLJSON},
                count: {type: GraphQLInt},
                page: {type: GraphQLInt},
            },
        });

        relationshipResults.value.forEach((relationship) => {
            relationshipGraphQLObjects[stringToValidPropertyName(relationship.name)] = {
                args: {
                    ...this.inputFieldsForRelationship(relationship),
                    _record: {type: edgeRecordInputType},
                },
                description: relationship.description,
                type: (options.returnFile) ? fileInfo : new GraphQLList(
                    new GraphQLObjectType({
                        name: stringToValidPropertyName(relationship.name),
                        // needed because the return type accepts an object, but throws a fit about it
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        fields: () => {
                            const output: {[key: string]: {[key: string]: GraphQLNamedType | GraphQLList<any>}} = {};
                            output._record = {type: edgeRecordInfo};

                            relationship.keys?.forEach((relationshipKey) => {
                                const propertyName = stringToValidPropertyName(relationshipKey.property_name);

                                switch (relationshipKey.data_type) {
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

                                        if (relationshipKey.options) {
                                            relationshipKey.options.forEach((option) => {
                                                enumMap[option] = {
                                                    value: option,
                                                };
                                            });
                                        }

                                        output[propertyName] = {
                                            type: new GraphQLEnumType({
                                                name: stringToValidPropertyName(`${relationship.name}_${relationshipKey.name}_Enum_TypeA`),
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
                resolve: this.resolverForRelationships(containerID, relationship, options),
            };
        });

        const metatypeObjects = new GraphQLObjectType({
            name: 'metatypes',
            fields: metatypeGraphQLObjects,
        });

        const relationshipObjects = new GraphQLObjectType({
            name: 'relationships',
            fields: relationshipGraphQLObjects,
        });

        // nodeType and edgeType for flexibility in filtering graph return
        const nodeInputType = new GraphQLInputObjectType({
            name: 'node_input',
            fields: {
                name: {type: GraphQLString},
                id: {type: GraphQLString},
                origin_name: {type: GraphQLString},
                origin_id: {type: GraphQLString},
                destination_name: {type: GraphQLString},
                destination_id: {type: GraphQLString},
            },
        });

        const edgeInputType = new GraphQLInputObjectType({
            name: 'edge_input',
            fields: {
                name: {type: GraphQLString},
                id: {type: GraphQLString},
            },
        });

        // the fields on which a user can filter the graph return
        const graphInput: {[key: string]: any} = {
            root_node: {type: new GraphQLNonNull(GraphQLString)}, // root node must be specified
            node_type: {type: nodeInputType},
            edge_type: {type: edgeInputType},
            depth: {type: new GraphQLNonNull(GraphQLString)}, // depth must be specified
        };

        const graphType = new GraphQLList(
            new GraphQLObjectType({
                name: 'graph_type',
                fields: {
                    // For more advanced querying these may become an Object type of their own
                    // to retrieve only specific properties from origin, edge and destination.
                    // For now json will do.
                    origin_properties: {type: GraphQLJSON},
                    edge_properties: {type: GraphQLJSON},
                    destination_properties: {type: GraphQLJSON},
                    // origin data
                    origin_id: {type: GraphQLString},
                    origin_metatype_name: {type: GraphQLString},
                    origin_metatype_id: {type: GraphQLString},
                    origin_data_source: {type: GraphQLString},
                    origin_metadata: {type: GraphQLJSON},
                    origin_created_by: {type: GraphQLString},
                    origin_created_at: {type: GraphQLString},
                    origin_modified_by: {type: GraphQLString},
                    origin_modified_at: {type: GraphQLString},
                    // edge data
                    edge_id: {type: GraphQLString},
                    relationship_name: {type: GraphQLString},
                    relationship_pair_id: {type: GraphQLString},
                    relationship_id: {type: GraphQLString},
                    edge_data_source: {type: GraphQLString},
                    edge_metadata: {type: GraphQLJSON},
                    edge_created_by: {type: GraphQLString},
                    edge_created_at: {type: GraphQLString},
                    edge_modified_by: {type: GraphQLString},
                    edge_modified_at: {type: GraphQLString},
                    // destination data
                    destination_id: {type: GraphQLString},
                    destination_metatype_name: {type: GraphQLString},
                    destination_metatype_id: {type: GraphQLString},
                    destination_data_source: {type: GraphQLString},
                    destination_metadata: {type: GraphQLJSON},
                    destination_created_by: {type: GraphQLString},
                    destination_created_at: {type: GraphQLString},
                    destination_modified_by: {type: GraphQLString},
                    destination_modified_at: {type: GraphQLString},
                    // graph metadata
                    depth: {type: GraphQLInt},
                    path: {type: GraphQLList(GraphQLString)},
                },
            }),
        );

        const fields: {[key: string]: any} = {};

        if (Object.keys(metatypeGraphQLObjects).length > 0) {
            fields.metatypes = {
                type: metatypeObjects,
                resolve: () => {
                    return metatypeGraphQLObjects;
                },
            };
        }

        if (Object.keys(relationshipGraphQLObjects).length > 0) {
            fields.relationships = {
                type: relationshipObjects,
                resolve: () => {
                    return relationshipGraphQLObjects;
                },
            };
        }

        fields.graph = {
            args: {...graphInput},
            type: (options.returnFile) ? fileInfo : graphType,
            resolve: this.resolverForGraph(containerID, options) as any,
        };

        fields.nodes = {
            args: {id: {type: new GraphQLInputObjectType({
                name: "node_input_id",
                fields: {
                    operator: {type: GraphQLString},
                    value: {type: new GraphQLList(GraphQLString)}
                }
            })},
            data_source_id: {type: new GraphQLInputObjectType({
                name: "node_input_data_source_id",
                fields : {
                    operator: {type: GraphQLString},
                    value: {type: new GraphQLList(GraphQLString)}
                }
            })},
            metatype_id: {type: new GraphQLInputObjectType({
                name: "node_input_metatype_id",
                fields : {
                    operator: {type: GraphQLString},
                    value: {type: new GraphQLList(GraphQLString)}
                }
            })},
            metatype_name: {type: new GraphQLInputObjectType({
                name: "node_input_metatype_name",
                fields : {
                    operator: {type: GraphQLString},
                    value: {type: new GraphQLList(GraphQLString)}
                }
            })},
            original_id: {type: new GraphQLInputObjectType({
                name: "node_input_original_id",
                fields : {
                    operator: {type: GraphQLString},
                    value: {type: new GraphQLList(GraphQLJSON)}
                }
            })},
            properties:{type: new GraphQLList( new GraphQLInputObjectType({
                name: "node_input_properties",
                fields : {
                    key: {type: GraphQLString},
                    operator: {type: GraphQLString},
                    value: {type: new GraphQLList(GraphQLJSON)}
                }
            }))}, // since the original ID might be a number, treat it as valid JSON
            import_id: {type: new GraphQLInputObjectType({
                name: "node_input_import_id",
                fields : {
                    operator: {type: GraphQLString},
                    value: {type: new GraphQLList(GraphQLString)}
                }
            })},
            limit: {type: GraphQLInt, defaultValue: 10000},
            page: {type: GraphQLInt, defaultValue: 1},},
            type: (options.returnFile) ? fileInfo : new GraphQLList(recordInfo),
            resolve: this.resolverForNodes(containerID, options) as any
        };

        return Promise.resolve(
            Result.Success(
                new GraphQLSchema({
                    query: new GraphQLObjectType({
                        name: 'Query',
                        fields,
                    }),
                }),
            ),
        );
    }

    resolverForMetatype(containerID: string, metatype: Metatype, resolverOptions?: ResolverOptions): (_: any, {input}: {input: any}) => any {
        return async (_, input: {[key: string]: any}) => {
            let repo = new NodeRepository();
            repo = repo.where().containerID('eq', containerID).and().metatypeID('eq', metatype.id);

            // you might notice that metatype_id and metatype_name are missing as filters - these are not
            // needed as we've already dictated what metatype to look for based on the query itself
            if (input._record) {
                if (input._record.id) {
                    if(Array.isArray(input._record.id.value) && input._record.id.value.length === 1) {
                        input._record.id.value = input._record.id.value[0];
                    }

                    repo = repo.and().id(input._record.id.operator, input._record.id.value);
                }

                if (input._record.data_source_id) {
                    if(Array.isArray(input._record.data_source_id.value) && input._record.data_source_id.value.length === 1) {
                        input._record.data_source_id.value = input._record.data_source_id.value[0];
                    }

                    repo = repo.and().dataSourceID(input._record.data_source_id.operator, input._record.data_source_id.value);
                }

                if (input._record.original_id) {
                    if(Array.isArray(input._record.original_id.value) && input._record.original_id.value.length === 1) {
                        input._record.original_id.value = input._record.original_id.value[0];
                    }

                    repo = repo.and().originalDataID(input._record.original_id.operator, input._record.original_id.value);
                }

                if (input._record.import_id) {
                    if(Array.isArray(input._record.import_id.value) && input._record.import_id.value.length === 1) {
                        input._record.import_id.value = input._record.import_id.value[0];
                    }

                    repo = repo.and().importDataID(input._record.import_id.operator, input._record.import_id.value);
                }
            }

            // variable to store results of edge DB call if _relationship input
            let edgeResults: {[key: string]: any} = {};
            if (input._relationship) {
                const edgeRepo = new EdgeRepository();

                // since _none only appears when no relationships exist, ignore it if filtered on
                if (Object.keys(input._relationship)[0] !== '_none') {
                    // check input for the relationship type and destination metatype
                    const relationship = Object.keys(input._relationship)[0];
                    const destination = Object.keys(input._relationship[relationship][0])[0];

                    // query to find all edges with specified relationship
                    edgeResults = await edgeRepo.findByRelationship(metatype.name, relationship, destination);
                    if (edgeResults.value.length) {
                        // store nodes connected as the origin of this relationship
                        const edge_ids: string[] = [];
                        edgeResults.value.forEach((edge: any) => {
                            edge_ids.push(edge.origin_id);
                        });
                        // query these matching nodes
                        repo = repo.and().id('in', edge_ids);
                    } else {
                        // nothing is returned if no such relationships exist
                        repo = repo.and().id('eq', 0);
                    }
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
                if (key === '_record' || key === '_relationship') {
                    return;
                }

                // values will come in as an array, separate them out
                if (Array.isArray(input[key].value) && input[key].value.length === 1) {
                    input[key].value = input[key].value[0];
                }

                repo = repo.and().property(propertyMap[key].name, input[key].operator, input[key].value, propertyMap[key].data_type);
            })

            // wrapping the end resolver in a promise ensures that we don't return prior to all results being
            // fetched
            if(resolverOptions && resolverOptions.returnFile) {
                // first we build a transform stream so that the raw node return is formatted correctly
                // note that we know that originating stream is in object mode so we're able to cast correctly
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const transform = new Transform({objectMode: true, transform: (chunk: object, _: any, done: (o: any, a: any) => any ) => {
                    const node = plainToClass(Node, chunk)


                    done(null, {
                        ...node.properties,
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
                    })
                }})


                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                return new Promise((resolve, reject) =>
                    repo
                        .listAllToFile({
                            file_type: (resolverOptions && resolverOptions.returnFileType) ? resolverOptions.returnFileType : 'json',
                            file_name: `${metatype.name}-${new Date().toDateString()}`,
                            transformStreams: [transform],
                            containerID})
                        .then((result) => {
                            if (result.isError) {
                                reject(`unable to list nodes to file ${result.error?.error}`);
                            }

                            resolve(result.value);
                        })
                        .catch((e) => {
                            reject(e);
                        }),
                );
            } else {
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                return new Promise((resolve) =>
                    repo
                        .list(true, {
                            limit: input._record?.limit ? input._record.limit : 10000,
                            offset: input._record?.page ? input._record.limit * (input._record.page > 0 ? input._record.page - 1 : 0) : undefined,
                        })
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
            }

        };
    }

    resolverForNodes(containerID: string, resolverOptions?: ResolverOptions): (_: any, {input}: {input: any}) => any {
        return async (_, input: {[key: string]: any}) => {
            let repo = new NodeRepository();
            repo = repo.where().containerID('eq', containerID);

            // you might notice that metatype_id and metatype_name are missing as filters - these are not
            // needed as we've already dictated what metatype to look for based on the query itself
            if (input.id) {
                if(Array.isArray(input.id.value) && input.id.value.length === 1) {
                    input.id.value = input.id.value[0];
                }

                repo = repo.and().id(input.id.operator, input.id.value);
            }

            if (input.data_source_id) {
                if(Array.isArray(input.data_source_id.value) && input.data_source_id.value.length === 1) {
                    input.data_source_id.value = input.data_source_id.value[0];
                }

                repo = repo.and().dataSourceID(input.data_source_id.operator, input.data_source_id.value);
            }

            if (input.metatype_id) {
                if(Array.isArray(input.metatype_id.value) && input.metatype_id.value.length === 1) {
                    input.metatype_id.value = input.metatype_id.value[0];
                }

                repo = repo.and().metatypeID(input.metatype_id.operator, input.metatype_id.value);
            }

            if (input.metatype_name) {
                if(Array.isArray(input.metatype_name.value) && input.metatype_name.value.length === 1) {
                    input.metatype_name.value = input.metatype_name.value[0];
                }

                repo = repo.and().metatypeName(input.metatype_name.operator, input.metatype_name.value);
            }

            if (input.original_id) {
                if(Array.isArray(input.original_id.value) && input.original_id.value.length === 1) {
                    input.original_id.value = input.original_id.value[0];
                }

                repo = repo.and().originalDataID(input.original_id.operator, input.original_id.value);
            }

            if (input.import_id) {
                if(Array.isArray(input.import_id.value) && input.import_id.value.length === 1) {
                    input.import_id.value = input.import_id.value[0];
                }

                repo = repo.and().importDataID(input.import_id.operator, input.import_id.value);
            }

            if (input.properties && Array.isArray(input.properties)) {
                input.properties.forEach((prop) => {
                    if(Array.isArray(prop.value) && prop.value.length === 1) {
                        prop.value = prop.value[0];
                    }

                    repo = repo.and().property(prop.key, prop.operator, prop.value);
                })
            }

            // wrapping the end resolver in a promise ensures that we don't return prior to all results being
            // fetched
            if(resolverOptions && resolverOptions.returnFile) {
                // first we build a transform stream so that the raw node return is formatted correctly
                // note that we know that originating stream is in object mode so we're able to cast correctly
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const transform = new Transform({objectMode: true, transform: (chunk: object, _: any, done: (o: any, a: any) => any ) => {
                    const node = plainToClass(Node, chunk)


                    done(null, {
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
                        properties: node.properties,
                    })
                }})


                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                return new Promise((resolve, reject) =>
                    repo
                        .listAllToFile({
                            file_type: (resolverOptions && resolverOptions.returnFileType) ? resolverOptions.returnFileType : 'json',
                            file_name: `${new Date().toDateString()}`,
                            transformStreams: [transform],
                            containerID})
                        .then((result) => {
                            if (result.isError) {
                                reject(`unable to list nodes to file ${result.error?.error}`);
                            }

                            resolve(result.value);
                        })
                        .catch((e) => {
                            reject(e);
                        }),
                );
            } else {
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                return new Promise((resolve) =>
                    repo
                        .list(true, {
                            limit: input._record?.limit ? input.limit : 10000,
                            offset: input._record?.page ? input.limit * (input.page > 0 ? input.page - 1 : 0) : undefined,
                        })
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
                                    properties: node.properties,
                                });
                            });

                            resolve(nodeOutput);
                        })
                        .catch((e) => {
                            resolve(e);
                        }),
                );
            }

        };
    }

    // each key in the metatype should be included on the input object as a field to be filtered on
    inputFieldsForMetatype(metatype: Metatype): {[key: string]: any} {
        const fields: {[key: string]: any} = {};

        metatype.keys?.forEach((metatypeKey) => {
            const propertyName = stringToValidPropertyName(metatypeKey.property_name);

            switch (metatypeKey.data_type) {
                case 'number': {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`z_${metatype.id}` + metatypeKey.property_name),
                            fields: {
                                operator: {type: GraphQLString},
                                value: {type: new GraphQLList(GraphQLInt)},
                            },
                        }),
                    };
                    break;
                }

                case 'float': {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`z_${metatype.id}` + metatypeKey.property_name),
                            fields: {
                                operator: {type: GraphQLString},
                                value: {type: new GraphQLList(GraphQLFloat)},
                            },
                        }),
                    };
                    break;
                }


                case 'boolean': {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`z_${metatype.id}` + metatypeKey.property_name),
                            fields: {
                                operator: {type: GraphQLString},
                                value: {type: new GraphQLList(GraphQLBoolean)},
                            },
                        }),
                    };
                    break;
                }

                case 'string' || 'date' || 'file': {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`z_${metatype.id}` + metatypeKey.property_name),
                            fields: {
                                operator: {type: GraphQLString},
                                value: {type: new GraphQLList(GraphQLString)},
                            },
                        }),
                    };
                    break;
                }

                case 'list': {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`z_${metatype.id}` + metatypeKey.property_name),
                            fields: {
                                operator: {type: GraphQLString},
                                value: {type: new GraphQLList(GraphQLJSON)},
                            },
                        }),
                    };
                    break;
                }

                default: {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`z_${metatype.id}` + metatypeKey.property_name),
                            fields: {
                                operator: {type: GraphQLString},
                                value: {type: new GraphQLList(GraphQLString)},
                            },
                        }),
                    };
                }
            }
        });

        return fields;
    }

    resolverForRelationships(containerID: string, relationship: MetatypeRelationship, options?: ResolverOptions): (_: any, {input}: {input: any}) => any {
        return async (_, input: {[key: string]: any}) => {
            let repo = new EdgeRepository();
            repo = repo.where().containerID('eq', containerID).and().relationshipName('eq', relationship.name);

            if (input._record) {
                if (input._record.id) {
                    if(Array.isArray(input._record.id.value) && input._record.id.value.length === 1) {
                        input._record.id.value = input._record.id.value[0];
                    }

                    repo = repo.and().id(input._record.id.operator, input._record.id.value);
                }

                if (input._record.pair_id) {
                    if(Array.isArray(input._record.pair_id.value) && input._record.pair_id.value.length === 1) {
                        input._record.pair_id.value = input._record.pair_id.value[0];
                    }

                    repo = repo.and().relationshipPairID(input._record.pair_id.operator, input._record.pair_id.value);
                }

                if (input._record.data_source_id) {
                    if(Array.isArray(input._record.data_source_id.value) && input._record.data_source_id.value.length === 1) {
                        input._record.data_source_id.value = input._record.data_source_id.value[0];
                    }

                    repo = repo.and().dataSourceID(input._record.data_source_id.operator, input._record.data_source_id.value);
                }

                if (input._record.import_id) {
                    if(Array.isArray(input._record.import_id.value) && input._record.import_id.value.length === 1) {
                        input._record.import_id.value = input._record.import_id.value[0];
                    }

                    repo = repo.and().importDataID(input._record.import_id.operator, input._record.import_id.value);
                }

                if (input._record.origin_id) {
                    if(Array.isArray(input._record.origin_id.value) && input._record.origin_id.value.length === 1) {
                        input._record.origin_id.value = input._record.origin_id.value[0];
                    }

                    repo = repo.and().origin_node_id(input._record.origin_id.operator, input._record.origin_id.value);
                }

                if (input._record.destination_id) {
                    if(Array.isArray(input._record.destination_id.value) && input._record.destination_id.value.length === 1) {
                        input._record.destination_id.value = input._record.destination_id.value[0];
                    }

                    repo = repo.and().destination_node_id(input._record.destination_id.operator, input._record.destination_id.value);
                }
            }

            // we must map out what the graphql refers to a relationship's keys are
            // vs. what they actually are so that we can map the query properly
            const propertyMap: {
                [key: string]: {
                    name: string;
                    data_type: string;
                };
            } = {};

            relationship.keys?.forEach((key) => {
                propertyMap[stringToValidPropertyName(key.property_name)] = {
                    name: key.property_name,
                    data_type: key.data_type,
                };
            });

            // iterate through the input object, ignoring reserved properties
            // and adding all others to the query as property queries
            Object.keys(input).forEach((key) => {
                if (key === '_record') {
                    return;
                }

                // values will come in as an array, separate them out
                if (Array.isArray(input[key].value) && input[key].value.length === 1) {
                    input[key].value = input[key].value[0];
                }

                repo = repo.and().property(propertyMap[key].name, input[key].operator, input[key].value, propertyMap[key].data_type);
            });

            if(options && options.returnFile) {
                // first we build a transform stream so that the raw edge return is formatted correctly
                // note that we know that originating stream is in object mode, so we're able to cast correctly
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const transform = new Transform({objectMode: true, transform: (chunk: object, _: any, done: (o: any, a: any) => any ) => {
                    const edge = plainToClass(Edge, chunk)


                    done(null, {
                        ...edge.properties,
                        _record: {
                            id: edge.id,
                            pair_id: edge.relationship_pair_id,
                            data_source_id: edge.data_source_id,
                            import_id: edge.import_data_id,
                            origin_id: edge.origin_id,
                            origin_metatype_id: edge.origin_metatype_id,
                            destination_id: edge.destination_id,
                            destination_metatype_id: edge.destination_metatype_id,
                            relationship_name: edge.metatype_relationship_name,
                            metadata: edge.metadata,
                            created_at: edge.created_at?.toISOString(),
                            created_by: edge.created_by,
                            modified_at: edge.modified_at?.toISOString(),
                            modified_by: edge.modified_by,
                        },
                    })
                }})


                // wrapping the end resolver in a promise ensures that we don't return prior to all results being
                // fetched
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                return new Promise((resolve, reject) =>
                    repo
                        .listAllToFile({
                            file_type: (options && options.returnFileType) ? options.returnFileType : 'json',
                            file_name: `${relationship.name}-${new Date().toDateString()}`,
                            transformStreams: [transform],
                            containerID})
                        .then((result) => {
                            if (result.isError) {
                                reject(`unable to list edges to file ${result.error?.error}`);
                            }

                            resolve(result.value);
                        })
                        .catch((e) => {
                            reject(e);
                        }),
                );
            } else {
                // wrapping the end resolver in a promise ensures that we don't return prior to all results being
                // fetched
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                return new Promise((resolve) =>
                    repo
                        .list(true, {limit: 10000})
                        .then((results) => {
                            if (results.isError) {
                                Logger.error(`unable to list edges ${results.error?.error}`);
                                resolve([]);
                            }

                            const edgeOutput: {[key: string]: any}[] = [];

                            results.value.forEach((edge) => {
                                const properties: {[key: string]: any} = {};
                                if (edge.properties) {
                                    Object.keys(edge.properties).forEach((key) => {
                                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
                                        properties[stringToValidPropertyName(key)] = edge.properties[key];
                                    });
                                }

                                edgeOutput.push({
                                    ...properties,
                                    _record: {
                                        id: edge.id,
                                        pair_id: edge.relationship_pair_id,
                                        data_source_id: edge.data_source_id,
                                        import_id: edge.import_data_id,
                                        origin_id: edge.origin_id,
                                        origin_metatype_id: edge.origin_metatype_id,
                                        destination_id: edge.destination_id,
                                        destination_metatype_id: edge.destination_metatype_id,
                                        relationship_name: edge.metatype_relationship_name,
                                        metadata: edge.metadata,
                                        created_at: edge.created_at?.toISOString(),
                                        created_by: edge.created_by,
                                        modified_at: edge.modified_at?.toISOString(),
                                        modified_by: edge.modified_by,
                                    },
                                });
                            });

                            resolve(edgeOutput);
                        })
                        .catch((e) => {
                            resolve(e);
                        }),
                );
            }
        };
    }

    // each key in the relationship should be included on the input object as a field to be filtered on
    inputFieldsForRelationship(relationship: MetatypeRelationship): {[key: string]: any} {
        const fields: {[key: string]: any} = {};

        relationship.keys?.forEach((relationshipKey) => {
            const propertyName = stringToValidPropertyName(relationshipKey.property_name);

            switch (relationshipKey.data_type) {
                case 'number': {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`z_${relationship.id}` + relationshipKey.property_name),
                            fields: {
                                operator: {type: GraphQLString},
                                value: {type: new GraphQLList(GraphQLInt)},
                            },
                        }),
                    };
                    break;
                }

                case 'float': {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`z_${relationship.id}` + relationshipKey.property_name),
                            fields: {
                                operator: {type: GraphQLString},
                                value: {type: new GraphQLList(GraphQLFloat)},
                            },
                        }),
                    };
                    break;
                }


                case 'boolean': {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`z_${relationship.id}` + relationshipKey.property_name),
                            fields: {
                                operator: {type: GraphQLString},
                                value: {type: new GraphQLList(GraphQLBoolean)},
                            },
                        }),
                    };
                    break;
                }

                case 'string' || 'date' || 'file': {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`z_${relationship.id}` + relationshipKey.property_name),
                            fields: {
                                operator: {type: GraphQLString},
                                value: {type: new GraphQLList(GraphQLString)},
                            },
                        }),
                    };
                    break;
                }

                case 'list': {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`z_${relationship.id}` + relationshipKey.property_name),
                            fields: {
                                operator: {type: GraphQLString},
                                value: {type: new GraphQLList(GraphQLJSON)},
                            },
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

    resolverForGraph(containerID: string, options?: ResolverOptions): (_: any, {input}: {input: any}) => any {
        return async (_, input: {[key: string]: any}) => {
            let repo = new NodeLeafRepository(input.root_node, containerID, input.depth);

            if (input.edge_type) {
                if (input.edge_type.name) {
                    const query = this.breakQuery(input.edge_type.name);
                    repo = repo.and().relationshipName(query[0], query[1]);
                } else if (input.edge_type.id) {
                    const query = this.breakQuery(input.edge_type.id);
                    repo = repo.and().relationshipId(query[0], query[1]);
                }
            }

            if (input.node_type) {
                if (input.node_type.id) {
                    const query = this.breakQuery(input.node_type.id);
                    repo = repo.and().metatypeId(query[0], query[1]);
                } else if (input.node_type.name) {
                    const query = this.breakQuery(input.node_type.name);
                    repo = repo.and().metatypeName(query[0], query[1]);
                }

                if (input.node_type.origin_id) {
                    const query = this.breakQuery(input.node_type.origin_id);
                    repo = repo.and().originMetatypeId(query[0], query[1]);
                } else if (input.node_type.origin_name) {
                    const query = this.breakQuery(input.node_type.origin_name);
                    repo = repo.and().originMetatypeName(query[0], query[1]);
                }

                if (input.node_type.destination_id) {
                    const query = this.breakQuery(input.node_type.destination_id);
                    repo = repo.and().destinationMetatypeId(query[0], query[1]);
                } else if (input.node_type.destination_name) {
                    const query = this.breakQuery(input.node_type.destination_name);
                    repo = repo.and().destinationMetatypeName(query[0], query[1]);
                }
            }

            if(options && options.returnFile) {
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                return new Promise((resolve, reject) =>
                    repo
                        .listAllToFile({
                            file_type: (options && options.returnFileType) ? options.returnFileType : 'json',
                            file_name: `GraphResults-${new Date().toDateString()}`,
                            containerID})
                        .then((result) => {
                            if (result.isError) {
                                reject(`unable to list graph results to file ${result.error?.error}`);
                            }

                            resolve(result.value);
                        })
                        .catch((e) => {
                            reject(e);
                        }),
                );
            } else {
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                return new Promise((resolve) =>
                    repo
                        .list({sortBy: 'depth'})
                        .then((results) => {
                            if (results.isError) {
                                Logger.error(`unable to list nodeLeaf objects ${results.error?.error}`);
                                resolve([]);
                            }

                            const nodeLeafOutput: {[key: string]: any}[] = [];

                            results.value.forEach((nodeLeaf: any) => {
                                nodeLeafOutput.push({...nodeLeaf});
                            });

                            resolve(nodeLeafOutput);
                        })
                        .catch((e) => {
                            resolve(e);
                        }),
                );
            }
        };
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

export type ResolverOptions = {
    ontologyVersionID?: string;
    returnFile?: boolean;
    returnFileType?: 'json' | 'csv' | string;
}
