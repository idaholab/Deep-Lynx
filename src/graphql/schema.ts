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
    GraphQLNonNull, graphql,
} from 'graphql';
import MetatypeRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import Result from '../common_classes/result';
import GraphQLJSON from 'graphql-type-json';
import Metatype from '../domain_objects/data_warehouse/ontology/metatype';
import MetatypeRelationship from '../domain_objects/data_warehouse/ontology/metatype_relationship';
import {dataTypeToParquetType, stringToValidPropertyName} from '../services/utilities';
import NodeRepository from '../data_access_layer/repositories/data_warehouse/data/node_repository';
import Logger from '../services/logger';
import MetatypeRelationshipPairRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_pair_repository';
import EdgeRepository from '../data_access_layer/repositories/data_warehouse/data/edge_repository';
import MetatypeRelationshipRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_repository';
import NodeLeafRepository from '../data_access_layer/repositories/data_warehouse/data/node_leaf_repository';
import OntologyVersionRepository from '../data_access_layer/repositories/data_warehouse/ontology/versioning/ontology_version_repository';
import {plainToClass} from "class-transformer";
import Node from "../domain_objects/data_warehouse/data/node";
import {Transform} from "stream";
import Edge from "../domain_objects/data_warehouse/data/edge";
import pMap from "p-map";
import gql from "graphql-tag";
import MetatypeRelationshipPair from "../domain_objects/data_warehouse/ontology/metatype_relationship_pair";
import {isMainThread, Worker} from "worker_threads";
import OntologyVersion from '../domain_objects/data_warehouse/ontology/versioning/ontology_version';
import {Repository} from "../data_access_layer/repositories/repository";

// GraphQLSchemaGenerator takes a container and generates a valid GraphQL schema for all contained metatypes. This will
// allow users to query and filter data based on node type, the various properties that type might have, and other bits
// of metadata.
export default class GraphQLRunner {
    #metatypeRepo: MetatypeRepository;
    #metatypePairRepo: MetatypeRelationshipPairRepository;
    #relationshipRepo: MetatypeRelationshipRepository;
    #ontologyRepo: OntologyVersionRepository;

    constructor() {
        this.#metatypeRepo = new MetatypeRepository();
        this.#metatypePairRepo = new MetatypeRelationshipPairRepository();
        this.#relationshipRepo = new MetatypeRelationshipRepository();
        this.#ontologyRepo = new OntologyVersionRepository();
    }

    // RunQuery is a simple wrapper over the schema generation followed by running the actual query
    async RunQuery(containerID: string, query: Query, options: ResolverOptions): Promise<any> {
        if(isMainThread){
            options.metatypes = this.metatypesFromQuery(query.query)
            options.relationships = this.relationshipsFromQuery(query.query)
            const isNodesQuery = this.isNodesQuery(query.query)

            if(options.metatypes.length > 0 || options.relationships.length > 0 || isNodesQuery) {
                const schema = await this.ForContainer(containerID, options)
                if(schema.isError) return Promise.reject(schema.error)

                const queryResult = await graphql({
                    schema: schema.value,
                    source: query.query,
                    variableValues: query.variables
                })

                // override default error message with something more useful
                if (queryResult.errors) {
                    const errors = queryResult.errors.map((error: any) => error.message as string)
                    const mtIndex = errors.findIndex(e => e === 'Cannot query field "metatypes" on type "Query".')
                    const relIndex = errors.findIndex(e => e === 'Cannot query field "relationships" on type "Query".')
                    if (mtIndex !== -1) {
                        queryResult.errors[mtIndex].message = `Cannot query metatype(s) "${options.metatypes.join(', ')}" on type "metatypes"`
                    } else if (relIndex !== -1) {
                        queryResult.errors[relIndex].message = `Cannot query relationship(s) "${options.relationships.join(', ')}" on type "relationships"`
                    }
                }

                return queryResult
            } else {
                options.fullSchema = true;
                const worker = new Worker(__dirname+'/schema_worker.js', {
                    workerData: {
                        containerID,
                        query,
                        options
                    }
                })

                return new Promise((resolve, reject) => {
                    worker.on('error', (err) => {
                        reject(`worker error for graphql generation ${err}`)
                    })

                    worker.on('message', (message:string) => {
                        resolve(JSON.parse(message))
                    })
                } )
            }

            // if we're not the main thread then this is an introspective query which needs
            // the entire object
        } else {
            const schema = await this.ForContainer(containerID, options)
            if(schema.isError) return Promise.reject(schema.error)

            return graphql({
                schema: schema.value,
                source: query.query,
                variableValues: query.variables
            })
        }

    }

    // generate requires a containerID because the schema it generates is based on a user's ontology and ontologies are
    // separated by containers
    async ForContainer(containerID: string, options: ResolverOptions): Promise<Result<GraphQLSchema>> {
        let metatypes: Metatype[] = []
        let relationships: MetatypeRelationship[] = []
        let metatypePairs: MetatypeRelationshipPair[] = []
        let ontResults: any = null

        // if pointInTime is supplied, fetch the ontology version that was active at that time
        if(options.pointInTime && options.ontologyVersionID) {
            // if ontology version and pointInTime are both passed, ensure version is valid otherwise return error

            ontResults = await this.#ontologyRepo
                .where()
                .containerID('eq', containerID)
                .and()
                .status('eq', 'published')
                .and()
                .publishedAt('<', new Date(options.pointInTime))
                .list({sortBy: 'id', sortDesc: true});

            let ontVersionFound = false;
            ontResults.value.forEach((ontVersion: OntologyVersion) => {
                if(ontVersion.id === options.ontologyVersionID) {
                    ontVersionFound = true;
                }
            });

            if (ontResults.isError || ontResults.value.length === 0 || !ontVersionFound) {
                const error = 'unable to fetch ontology for the point in time and ontology version provided, or no currently published ontology';
                Logger.error(error);
                return Promise.reject(error);
            }

        } else if (options.pointInTime) {
            // if pointInTime is supplied, fetch the ontology version that was active at that time

            ontResults = await this.#ontologyRepo
                .where()
                .containerID('eq', containerID)
                .and()
                .status('eq', 'published')
                .and()
                .createdAt('<', options.pointInTime)
                .list({sortBy: 'id', sortDesc: true});

            if (ontResults.isError || ontResults.value.length === 0) {
                const error = 'unable to fetch ontology for the point in time provided, or no currently published ontology';
                Logger.error(error);
                return Promise.reject(error);
            } else {
                options.ontologyVersionID = ontResults.value[0].id;
            }

        } else if (!options.ontologyVersionID) {
            // fetch the currently published ontology if the versionID wasn't provided

            ontResults = await this.#ontologyRepo
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

        let metatypeIDs: string[] = []
        if(options.fullSchema || (options.metatypes && options.metatypes.length > 0)) {
            let metatypeRepo = this.#metatypeRepo
                .where()
                .containerID('eq', containerID)
                .and()
                .ontologyVersion('eq', options.ontologyVersionID)

            if(options.metatypes && options.metatypes.length > 0) {
                metatypeRepo = metatypeRepo.and().name("%", options.metatypes)
            }

            // load metatypes with the keys loaded from the materialized view for speed's sake
            const metatypeResults = await metatypeRepo.list(true, {sortBy: 'id', loadFromView: true});
            if (metatypeResults.isError) {
                return Promise.resolve(Result.Pass(metatypeResults));
            }

            metatypes= metatypeResults.value
            metatypeIDs = metatypeResults.value.map((m) => m.id!);
        }

        // fetch all metatype relationship pairs - used for _relationship queries.
        if(metatypeIDs.length > 0) {
            const metatypePairResults = await this.#metatypePairRepo
                .where()
                .containerID('eq', containerID)
                .and()
                .ontologyVersion('eq', options.ontologyVersionID)
                .and(new MetatypeRelationshipPairRepository()
                    .origin_metatype_id('in', metatypeIDs)
                    .or()
                    .destination_metatype_id('in', metatypeIDs)
                )
                .list();

            if (metatypePairResults.isError) {
                return Promise.resolve(Result.Pass(metatypePairResults));
            }

            metatypePairs = metatypePairResults.value
        } else if (options.fullSchema) {
            const metatypePairResults = await this.#metatypePairRepo
                .where()
                .containerID('eq', containerID)
                .and()
                .ontologyVersion('eq', options.ontologyVersionID)
                .list();

            if (metatypePairResults.isError) {
                return Promise.resolve(Result.Pass(metatypePairResults));
            }

            metatypePairs = metatypePairResults.value
        }


        if(options.fullSchema || (options.relationships && options.relationships.length > 0)) {
            // fetch all relationship types. Used for relationship wrapper queries.
            let relationshipRepo = this.#relationshipRepo
                .where()
                .containerID('eq', containerID)
                .and()
                .ontologyVersion('eq', options.ontologyVersionID)

            if(options.relationships && options.relationships.length > 0) {
                relationshipRepo = relationshipRepo.and()
                    .name("%", options.relationships)
            }

            const relationshipResults = await relationshipRepo.list(true);
            if (relationshipResults.isError) {
                return Promise.resolve(Result.Pass(relationshipResults));
            }

            relationships = relationshipResults.value
        }


        // used for querying edges based on node (see input._relationship resolver)
        const metatypePairObjects: {[key: string]: any} = {};
        metatypePairs.forEach((pair) => {
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
                created_at: {type: new GraphQLInputObjectType({
                    name: "record_input_created_at",
                    fields : {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
                modified_at: {type: new GraphQLInputObjectType({
                    name: "record_input_modified_at",
                    fields : {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
                metatype_uuid: {type: new GraphQLInputObjectType({
                    name: "record_input_metatype_uuid",
                    fields: {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
                sortBy: {type: GraphQLString},
                sortDesc: {type: GraphQLBoolean},
                sortProp: {type: GraphQLBoolean},
                limit: {type: GraphQLInt, defaultValue: 10000},
                page: {type: GraphQLInt, defaultValue: 1},
            },
        });

        const recordInfo = new GraphQLObjectType({
            name: 'recordInfo',
            fields: {
                id: {type: GraphQLString},
                container_id: {type: GraphQLString},
                data_source_id: {type: GraphQLString},
                original_id: {type: GraphQLJSON}, // since the original ID might be a number, treat it as valid JSON
                import_id: {type: GraphQLString},
                metatype_id: {type: GraphQLString},
                metatype_name: {type: GraphQLString},
                metatype_uuid: {type: GraphQLString},
                created_at: {type: GraphQLString},
                deleted_at: {type: GraphQLString},
                created_by: {type: GraphQLString},
                modified_at: {type: GraphQLString},
                modified_by: {type: GraphQLString},
                metadata: {type: GraphQLJSON},
                metadata_properties: {type: GraphQLJSON},
                properties: {type: GraphQLJSON},
                count: {type: GraphQLInt},
                page: {type: GraphQLInt},
            },
        });

        const recordInfoWithRawData = new GraphQLObjectType({
            name: 'recordInfoWithRawData',
            fields: {
                id: {type: GraphQLString},
                container_id: {type: GraphQLString},
                data_source_id: {type: GraphQLString},
                original_id: {type: GraphQLJSON}, // since the original ID might be a number, treat it as valid JSON
                import_id: {type: GraphQLString},
                metatype_id: {type: GraphQLString},
                metatype_name: {type: GraphQLString},
                metatype_uuid: {type: GraphQLString},
                created_at: {type: GraphQLString},
                deleted_at: {type: GraphQLString},
                created_by: {type: GraphQLString},
                modified_at: {type: GraphQLString},
                modified_by: {type: GraphQLString},
                metadata: {type: GraphQLJSON},
                metadata_properties: {type: GraphQLJSON},
                properties: {type: GraphQLJSON},
                count: {type: GraphQLInt},
                page: {type: GraphQLInt},
                raw_data_properties: {type: GraphQLJSON},
                raw_data_history: {type: GraphQLJSON},
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

        const rawDataInputType = new GraphQLList(
            new GraphQLInputObjectType({
                name: 'raw_data_input',
                fields: {
                    key: {type: GraphQLString},
                    operator: {type: GraphQLString},
                    value: {type: GraphQLString},
                    historical: {type: GraphQLBoolean}, // used to specify query type
                }
            })
        );

        const metadataInputType = new GraphQLList(
            new GraphQLInputObjectType({
                name: 'metadata_input',
                fields: {
                    key: {type: GraphQLString},
                    operator: {type: GraphQLString},
                    value: {type: GraphQLString},
                }
            })
        );

        const metatypeMapper = (metatype: Metatype) => {
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

            return [stringToValidPropertyName(metatype.name), {
                args: {
                    ...this.inputFieldsForMetatype(metatype),
                    _record: {type: recordInputType},
                    _relationship: {type: relationshipInputType},
                    raw_data_properties: {type: rawDataInputType},
                    metadata_properties: {type: metadataInputType},
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
                                output.metadata_properties = {type: GraphQLJSON};
                                if (options.rawMetadataEnabled) {
                                    output.raw_data_properties = {type: GraphQLJSON};
                                    output.raw_data_history = {type: GraphQLJSON};
                                }
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

                                output._deep_lynx_id = {
                                    type: GraphQLString
                                }

                                return output;
                            },
                        }),
                    ),
                resolve: this.resolverForMetatype(containerID, metatype, options),
            }];
        };
        const results = await pMap(metatypes, metatypeMapper, {concurrency: 10})

        results.forEach((result) => {
            if(result) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
                metatypeGraphQLObjects[result[0]] = result[1]
            }

        })

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
                created_at: {type: new GraphQLInputObjectType({
                    name: "edge_record_input_created_at",
                    fields : {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
                modified_at: {type: new GraphQLInputObjectType({
                    name: "edge_record_input_modified_at",
                    fields : {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
                relationship_pair_uuid: {type: new GraphQLInputObjectType({
                    name: "edge_record_relationship_pair_uuid",
                    fields: {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
                origin_metatype_uuid: {type: new GraphQLInputObjectType({
                    name: "edge_record_origin_metatype_uuid",
                    fields: {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLString)}
                    }
                })},
                destination_metatype_uuid: {type: new GraphQLInputObjectType({
                    name: "edge_record_destination_metatype_uuid",
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
                origin_metatype_uuid: {type: GraphQLString},
                destination_id: {type: GraphQLString},
                destination_metatype_id: {type: GraphQLString},
                destination_metatype_uuid: {type: GraphQLString},
                relationship_name: {type: GraphQLString},
                relationship_pair_uuid: {type: GraphQLString},
                created_at: {type: GraphQLString},
                created_by: {type: GraphQLString},
                modified_at: {type: GraphQLString},
                modified_by: {type: GraphQLString},
                metadata: {type: GraphQLJSON},
                count: {type: GraphQLInt},
                page: {type: GraphQLInt},
            },
        });

        const relationshipMapper = (relationship: MetatypeRelationship) => {
            return [stringToValidPropertyName(relationship.name), {
                args: {
                    ...this.inputFieldsForRelationship(relationship),
                    _record: {type: edgeRecordInputType},
                    raw_data_properties: {type: rawDataInputType},
                    metadata_properties: {type: metadataInputType},
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
                            output.metadata_properties = {type: GraphQLJSON};
                            if (options.rawMetadataEnabled) {
                                output.raw_data_properties = {type: GraphQLJSON};
                                output.raw_data_history = {type: GraphQLJSON};
                            }

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
            }];
        };

        const rResults= await pMap(relationships, relationshipMapper, {concurrency: 10})
        rResults.forEach((result) => {
            if(result) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
                relationshipGraphQLObjects[result[0]] = result[1]
            }
        })

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
                uuid: {type: GraphQLString},
                origin_name: {type: GraphQLString},
                origin_id: {type: GraphQLString},
                origin_uuid: {type: GraphQLString},
                destination_name: {type: GraphQLString},
                destination_id: {type: GraphQLString},
                destination_uuid: {type: GraphQLString},
            },
        });

        const edgeInputType = new GraphQLInputObjectType({
            name: 'edge_input',
            fields: {
                name: {type: GraphQLString},
                id: {type: GraphQLString},
                uuid: {type: GraphQLString},
            },
        });

        // the fields on which a user can filter the graph return
        const graphInput: {[key: string]: any} = {
            root_node: {type: new GraphQLNonNull(GraphQLString)}, // root node must be specified
            node_type: {type: nodeInputType},
            edge_type: {type: edgeInputType},
            depth: {type: new GraphQLNonNull(GraphQLString)}, // depth must be specified
            use_original_id: {type: GraphQLBoolean},
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
                    origin_metatype_uuid: {type: GraphQLString},
                    origin_data_source: {type: GraphQLString},
                    origin_metadata: {type: GraphQLJSON},
                    origin_metadata_properties: {type: GraphQLJSON},
                    origin_created_by: {type: GraphQLString},
                    origin_created_at: {type: GraphQLString},
                    origin_modified_by: {type: GraphQLString},
                    origin_modified_at: {type: GraphQLString},
                    // edge data
                    edge_id: {type: GraphQLString},
                    relationship_name: {type: GraphQLString},
                    relationship_pair_id: {type: GraphQLString},
                    relationship_pair_uuid: {type: GraphQLString},
                    relationship_id: {type: GraphQLString},
                    relationship_uuid: {type: GraphQLString},
                    edge_data_source: {type: GraphQLString},
                    edge_metadata: {type: GraphQLJSON},
                    edge_metadata_properties: {type: GraphQLJSON},
                    edge_created_by: {type: GraphQLString},
                    edge_created_at: {type: GraphQLString},
                    edge_modified_by: {type: GraphQLString},
                    edge_modified_at: {type: GraphQLString},
                    // destination data
                    destination_id: {type: GraphQLString},
                    destination_metatype_name: {type: GraphQLString},
                    destination_metatype_id: {type: GraphQLString},
                    destination_metatype_uuid: {type: GraphQLString},
                    destination_data_source: {type: GraphQLString},
                    destination_metadata: {type: GraphQLJSON},
                    destination_metadata_properties: {type: GraphQLJSON},
                    destination_created_by: {type: GraphQLString},
                    destination_created_at: {type: GraphQLString},
                    destination_modified_by: {type: GraphQLString},
                    destination_modified_at: {type: GraphQLString},
                    // graph metadata
                    edge_direction: {type: GraphQLString},
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
            args: {
                id: {type: new GraphQLInputObjectType({
                    name: "node_input_id",
                    fields: {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLJSON)}
                    }
                })},
                data_source_id: {type: new GraphQLInputObjectType({
                    name: "node_input_data_source_id",
                    fields : {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLJSON)}
                    }
                })},
                metatype_id: {type: new GraphQLInputObjectType({
                    name: "node_input_metatype_id",
                    fields : {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLJSON)}
                    }
                })},
                metatype_uuid: {type: new GraphQLInputObjectType({
                    name: "node_input_metatype_uuid",
                    fields : {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLJSON)}
                    }
                })},
                metatype_name: {type: new GraphQLInputObjectType({
                    name: "node_input_metatype_name",
                    fields : {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLJSON)}
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
                        value: {type: new GraphQLList(GraphQLJSON)}
                    }
                })},
                created_at: {type: new GraphQLInputObjectType({
                    name: "node_record_input_created_at",
                    fields : {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLJSON)}
                    }
                })},
                modified_at: {type: new GraphQLInputObjectType({
                    name: "node_record_input_modified_at",
                    fields : {
                        operator: {type: GraphQLString},
                        value: {type: new GraphQLList(GraphQLJSON)}
                    }
                })},
                metadata_properties: {type: metadataInputType},
                limit: {type: GraphQLInt, defaultValue: 10000},
                page: {type: GraphQLInt, defaultValue: 1},
            },
            type: (options.returnFile) ? fileInfo : (options.rawMetadataEnabled ? new GraphQLList(recordInfoWithRawData) : new GraphQLList(recordInfo)),
            resolve: this.resolverForNodes(containerID, options) as any
        };

        if (options.rawMetadataEnabled) {
            fields.nodes.args.raw_data_properties = {type: rawDataInputType}
        }

        const schema = new GraphQLSchema({
            query: new GraphQLObjectType({
                name: 'Query',
                fields
            })
        })

        return Promise.resolve(Result.Success(schema));
    }

    resolverForMetatype(containerID: string, metatype: Metatype, resolverOptions?: ResolverOptions): (_: any, {input}: {input: any}) => any {
        return async (_, input: {[key: string]: any}) => {
            const nodeRepo = new NodeRepository();
            let repo: NodeRepository;

            // apply subquery if looking at historical view
            if (resolverOptions?.pointInTime) {
                // filter on provided pointInTime
                const sub = nodeRepo.subquery(
                    new Repository('nodes')
                        .select(['id', 'MAX(created_at) AS created_at'], 'sub_nodes')
                        .from('nodes', 'sub_nodes')
                        .where()
                        .query('created_at', '<', new Date(resolverOptions.pointInTime), {dataType: 'date'})
                        .and()
                        .query('container_id', 'eq', containerID)
                        .and(new Repository('nodes')
                            .query('deleted_at', '>', new Date(resolverOptions.pointInTime), {dataType: 'date'})
                            .or()
                            .query('deleted_at', 'is null'))
                        .groupBy('id', 'nodes'));

                repo = nodeRepo
                    .join(sub, [
                        {origin_col: 'id', destination_col: 'id'},
                        {origin_col: 'created_at', destination_col: 'created_at'}
                    ], {destination_alias: 'sub', join_type: 'INNER'})
                    .join('metatypes', {origin_col: 'metatype_id', destination_col: 'id'})
                    .addFields({name: 'metatype_name', uuid: 'metatype_uuid'}, 'metatypes')
                    .where()
                    .containerID('eq', containerID)
                    .and()
                    .metatypeUUID('eq', metatype.uuid);

            } else {
                repo = nodeRepo.where()
                    .containerID('eq', containerID)
                    .and()
                    .metatypeUUID('eq', metatype.uuid);
            }

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

                if (input._record.created_at) {
                    if(Array.isArray(input._record.created_at.value) && input._record.created_at.value.length === 1) {
                        input._record.created_at.value = input._record.created_at.value[0];
                    }

                    repo = repo.and().createdAt(input._record.created_at.operator, input._record.created_at.value);
                }

                if (input._record.modified_at) {
                    if(Array.isArray(input._record.modified_at.value) && input._record.modified_at.value.length === 1) {
                        input._record.modified_at.value = input._record.modified_at.value[0];
                    }

                    repo = repo.and().modifiedAt(input._record.modified_at.operator, input._record.modified_at.value);
                }

                // metatype_id can be used to filter on a specific ontolgy version's metatype ID instead of global metatype UUID
                if (input._record.metatype_id) {
                    if(Array.isArray(input._record.metatype_id.value) && input._record.metatype_id.value.length === 1) {
                        input._record.metatype_id.value = input._record.metatype_id.value[0];
                    }

                    repo = repo.and().metatypeID(input._record.metatype_id.operator, input._record.metatype_id.value);
                }
            }

            // only do this if metadata is enabled
            if (resolverOptions?.rawMetadataEnabled && input.raw_data_properties && Array.isArray(input.raw_data_properties)) {
                let joinTable: string | undefined;
                input.raw_data_properties.forEach((prop) => {
                    // TODO: find a way to check array for historical and only perform joins once
                    // apply conditions only if historical is specified
                    if (prop.historical) {
                        joinTable = 'nodes' // override table that we are joining with
                        repo = repo.join('nodes', {origin_col: 'id', destination_col: 'id'})
                    }
                    // join to data staging to get raw data
                    repo = repo
                        .join('data_staging', {origin_col: 'data_staging_id', destination_col: 'id'}, {origin: joinTable})
                    repo = repo.and().queryJsonb(
                        prop.key, 'data',
                        prop.operator, prop.value,
                        {tableName: 'data_staging'}
                    )
                    // reset join table
                    joinTable = undefined;
                })
            }

            if (input.metadata_properties && Array.isArray(input.metadata_properties)) {
                input.metadata_properties.forEach((prop) => {
                    repo = repo.and().queryJsonb(
                        prop.key, 'metadata_properties',
                        prop.operator, prop.value
                    )
                })
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

            // build parquet schema as a just in case, so we don't have to iterate keys again, building first the
            // record portion which is a nested schema
            const parquet_schema: {[key: string]: any} = {}
            parquet_schema._deep_lynx_id = {type: 'INT64'}
            parquet_schema._record = {
                fields :{
                    id: {type: 'INT64'},
                    data_source_id: {type: 'INT64', optional: true},
                    original_id: {type: 'UTF8', optional: true},
                    import_id: {type: 'INT64', optional: true},
                    metatype_id: {type: 'INT64'},
                    metatype_name: {type: 'UTF8'},
                    metatype_uuid: {type: 'UTF8'},
                    metadata: {type: 'JSON', optional: true},
                    created_at: {type: 'TIMESTAMP_MILLIS'},
                    created_by: {type: 'UTF8'},
                    modified_at: {type: 'TIMESTAMP_MILLIS'},
                    modified_by: {type: 'UTF8', optional: true},
                    deleted_at: {type: 'TIMESTAMP_MILLIS', optional: true},
                }
            }
            parquet_schema.metadata_properties = {type: 'JSON', optional: true};
            if (resolverOptions?.rawMetadataEnabled) {
                parquet_schema.raw_data_properties = {type: 'JSON'}
                parquet_schema.raw_data_history = {type: 'JSON'}
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

                parquet_schema[key.property_name] = {type: dataTypeToParquetType(key.data_type)}
            });

            // iterate through the input object, ignoring reserved properties and adding all others to
            // the query as property queries,
            Object.keys(input).forEach((key) => {
                if (key === '_record' || key === '_relationship' || key === 'raw_data_properties' || key === 'metadata_properties') {
                    return;
                }

                // values will come in as an array, separate them out
                if (Array.isArray(input[key].value) && input[key].value.length === 1) {
                    input[key].value = input[key].value[0];
                }

                repo = repo.and().property(propertyMap[key].name, input[key].operator, input[key].value, propertyMap[key].data_type);
            })

            let sortBy: string | undefined = input._record?.sortBy
            if(input._record?.sortProp) {
                sortBy = `properties->${sortBy}`;
            }

            // complete any metadata joins only as needed
            if (resolverOptions?.rawMetadataEnabled) {
                // subquery for historical raw data
                const history = repo.subquery(
                    new Repository('nodes')
                        .select('id', 'sub_nodes')
                        .addFields('jsonb_agg(data) AS history', 'raw_data')
                        .from('nodes', 'sub_nodes')
                        .join('data_staging',
                            {origin_col: 'data_staging_id', destination_col: 'id'},
                            {destination_alias: 'raw_data'})
                        .groupBy('id', 'sub_nodes')
                )

                // join to subquery
                repo = repo
                    .join('data_staging', {destination_col: 'id', origin_col: 'data_staging_id'})
                    .addFields('data', 'data_staging')
                    .join(history,
                        {origin_col: 'id', destination_col: 'id'},
                        {destination_alias: 'raw_data_history'})
                    .addFields('history', 'raw_data_history')
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

                    if (resolverOptions.rawMetadataEnabled) {
                        done(null, {
                            _deep_lynx_id: node.id,
                            ...node.properties,
                            _record: {
                                id: node.id,
                                data_source_id: node.data_source_id,
                                original_id: node.original_data_id,
                                import_id: node.import_data_id,
                                metatype_id: node.metatype_id,
                                metatype_uuid: node.metatype_uuid,
                                metatype_name: node.metatype_name,
                                metadata: node.metadata,
                                created_at: node.created_at?.toISOString(),
                                created_by: node.created_by,
                                modified_at: node.modified_at?.toISOString(),
                                modified_by: node.modified_by,
                                deleted_at: node.deleted_at,
                            },
                            metadata_properties: node.metadata_properties,
                            raw_data_properties: node['data' as keyof object],
                            raw_data_history: node['history' as keyof object],
                        });
                    } else {
                        done(null, {
                            _deep_lynx_id: node.id,
                            ...node.properties,
                            _record: {
                                id: node.id,
                                data_source_id: node.data_source_id,
                                original_id: node.original_data_id,
                                import_id: node.import_data_id,
                                metatype_id: node.metatype_id,
                                metatype_uuid: node.metatype_uuid,
                                metatype_name: node.metatype_name,
                                metadata: node.metadata,
                                created_at: node.created_at?.toISOString(),
                                created_by: node.created_by,
                                modified_at: node.modified_at?.toISOString(),
                                modified_by: node.modified_by,
                                deleted_at: node.deleted_at,
                            },
                            metadata_properties: node.metadata_properties,
                        });
                    }
                }})


                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                return new Promise((resolve, reject) =>
                    repo
                        .listAllToFile({
                            file_type: (resolverOptions && resolverOptions.returnFileType) ? resolverOptions.returnFileType : 'json',
                            file_name: `${metatype.name}-${new Date().toDateString()}`,
                            transformStreams: [transform],
                            parquet_schema,
                            containerID}, {
                            sortBy,
                            sortDesc: input._record?.sortDesc,
                            distinct: true,
                            distinct_on: {table: 'current_nodes', column: 'id'}
                        })
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
                            sortBy,
                            sortDesc: input._record?.sortDesc,
                            distinct: true,
                            distinct_on: {table: 'current_nodes', column: 'id'}
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

                                const toPush: {[key: string]: any} = {
                                    _deep_lynx_id: node.id,
                                    ...properties,
                                    _record: {
                                        id: node.id,
                                        data_source_id: node.data_source_id,
                                        original_id: node.original_data_id,
                                        import_id: node.import_data_id,
                                        metatype_id: node.metatype_id,
                                        metatype_uuid: node.metatype_uuid,
                                        metatype_name: node.metatype_name,
                                        metadata: node.metadata,
                                        created_at: node.created_at?.toISOString(),
                                        created_by: node.created_by,
                                        modified_at: node.modified_at?.toISOString(),
                                        modified_by: node.modified_by,
                                    },
                                    metadata_properties: node.metadata_properties,
                                }

                                if (resolverOptions?.rawMetadataEnabled) {
                                    toPush.raw_data_properties = node['data' as keyof object],
                                    toPush.raw_data_history = node['history' as keyof object]
                                };

                                nodeOutput.push(toPush);
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
            const nodeRepo = new NodeRepository();
            let repo: NodeRepository;

            // apply subquery if looking at historical view
            if (resolverOptions?.pointInTime) {
                // filter on provided pointInTime
                const sub = nodeRepo.subquery(
                    new Repository('nodes')
                        .select(['id', 'MAX(created_at) AS created_at'], 'sub_nodes')
                        .from('nodes', 'sub_nodes')
                        .where()
                        .query('created_at', '<', new Date(resolverOptions.pointInTime), {dataType: 'date'})
                        .and()
                        .query('container_id', 'eq', containerID)
                        .and(new Repository('nodes')
                            .query('deleted_at', '>', new Date(resolverOptions.pointInTime), {dataType: 'date'})
                            .or()
                            .query('deleted_at', 'is null'))
                        .groupBy('id', 'nodes'));

                repo = nodeRepo
                    .join(sub,
                        [
                            {origin_col: 'id', destination_col: 'id'},
                            {origin_col: 'created_at', destination_col: 'created_at'}
                        ],
                        {destination_alias: 'sub', join_type: 'INNER', origin: 'nodes'})
                    .join('metatypes', {origin_col: 'metatype_id', destination_col: 'id'})
                    .where().containerID('eq', containerID)

            } else {
                repo = nodeRepo.where().containerID('eq', containerID);
            }

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

            if (input.metatype_uuid) {
                if(Array.isArray(input.metatype_uuid.value) && input.metatype_uuid.value.length === 1) {
                    input.metatype_uuid.value = input.metatype_uuid.value[0];
                }

                repo = repo.and().metatypeUUID(input.metatype_uuid.operator, input.metatype_uuid.value);
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

            // disallow this filter if pointInTime is supplied
            if (input.created_at && !resolverOptions?.pointInTime) {
                if(Array.isArray(input.created_at.value) && input.created_at.value.length === 1) {
                    input.created_at.value = input.created_at.value[0];
                }

                repo = repo.and().createdAt(input.created_at.operator, input.created_at.value);
            }

            if (input.modified_at) {
                if(Array.isArray(input.modified_at.value) && input.modified_at.value.length === 1) {
                    input.modified_at.value = input.modified_at.value[0];
                }

                repo = repo.and().modifiedAt(input.modified_at.operator, input.modified_at.value);
            }

            if (input.properties && Array.isArray(input.properties)) {
                input.properties.forEach((prop) => {
                    if(Array.isArray(prop.value) && prop.value.length === 1) {
                        prop.value = prop.value[0];
                    }

                    repo = repo.and().property(prop.key, prop.operator, prop.value);
                })
            }

            if (resolverOptions?.rawMetadataEnabled && input.raw_data_properties && Array.isArray(input.raw_data_properties)) {
                let joinTable: string | undefined;
                input.raw_data_properties.forEach((prop) => {
                    // apply conditions only if historical is specified
                    if (prop.historical) {
                        joinTable = 'nodes' // override table that we are joining with
                        repo = repo.join('nodes', {origin_col: 'id', destination_col: 'id'})
                    }
                    // join to data staging to get raw data
                    repo = repo
                        .join('data_staging', {origin_col: 'data_staging_id', destination_col: 'id'}, {origin: joinTable})
                    repo = repo.and().queryJsonb(
                        prop.key, 'data',
                        prop.operator, prop.value,
                        {tableName: 'data_staging'}
                    )
                    // reset join table
                    joinTable = undefined;
                })
            }

            if (input.metadata_properties && Array.isArray(input.metadata_properties)) {
                input.metadata_properties.forEach((prop) => {
                    repo = repo.and().queryJsonb(
                        prop.key, 'metadata_properties',
                        prop.operator, prop.value
                    )
                })
            }

            let sortBy: string | undefined = input._record?.sortBy
            if(input._record?.sortProp) {
                sortBy = `properties->${sortBy}`;
            }

            // complete any metadata joins only as needed
            if (resolverOptions?.rawMetadataEnabled) {
                // subquery for historical raw data
                const history = repo.subquery(
                    new Repository('nodes')
                        .select('id', 'sub_nodes')
                        .addFields('jsonb_agg(data) AS history', 'raw_data')
                        .from('nodes', 'sub_nodes')
                        .join(
                            'data_staging',
                            {origin_col: 'data_staging_id', destination_col: 'id'},
                            {destination_alias: 'raw_data'}
                        )
                        .groupBy('id', 'sub_nodes')
                )

                repo = repo
                    .join('data_staging', {destination_col: 'id', origin_col: 'data_staging_id'})
                    .addFields('data', 'data_staging')
                    .join(history,
                        {origin_col: 'id', destination_col: 'id'},
                        {destination_alias: 'raw_data_history'})
                    .addFields('history', 'raw_data_history')
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

                    if (resolverOptions.rawMetadataEnabled) {
                        done(null, {
                            id: node.id,
                            data_source_id: node.data_source_id,
                            original_id: node.original_data_id,
                            import_id: node.import_data_id,
                            metatype_id: node.metatype_id,
                            metatype_name: node.metatype_name,
                            metatype_uuid: node.metatype_uuid,
                            metadata: node.metadata,
                            created_at: node.created_at?.toISOString(),
                            created_by: node.created_by,
                            modified_at: node.modified_at?.toISOString(),
                            modified_by: node.modified_by,
                            properties: node.properties,
                            metadata_properties: node.metadata_properties,
                            raw_data_properties: node['data' as keyof object],
                            raw_data_history: node['history' as keyof object],
                        })
                    } else {
                        done(null, {
                            id: node.id,
                            data_source_id: node.data_source_id,
                            original_id: node.original_data_id,
                            import_id: node.import_data_id,
                            metatype_id: node.metatype_id,
                            metatype_name: node.metatype_name,
                            metatype_uuid: node.metatype_uuid,
                            metadata: node.metadata,
                            created_at: node.created_at?.toISOString(),
                            created_by: node.created_by,
                            modified_at: node.modified_at?.toISOString(),
                            modified_by: node.modified_by,
                            properties: node.properties,
                            metadata_properties: node.metadata_properties,
                        })
                    }
                }})

                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                return new Promise((resolve, reject) =>
                    repo
                        .listAllToFile({
                            file_type: (resolverOptions && resolverOptions.returnFileType) ? resolverOptions.returnFileType : 'json',
                            file_name: `${new Date().toDateString()}`,
                            transformStreams: [transform],
                            containerID}, {
                            sortBy,
                            sortDesc: input._records?.sortDesc,
                            distinct: true,
                            distinct_on: {table: 'current_nodes', column: 'id'}
                        })
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
                            limit: input.limit ? input.limit : 10000,
                            offset: input.page ? input.limit * (input.page > 0 ? input.page - 1 : 0) : undefined,
                            sortBy,
                            sortDesc: input._record?.sortDesc,
                            distinct: true,
                            distinct_on: {table: 'current_nodes', column: 'id'}
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

                                const toPush: {[key: string]: any} = {
                                    id: node.id,
                                    container_id: node.container_id,
                                    data_source_id: node.data_source_id,
                                    original_id: node.original_data_id,
                                    import_id: node.import_data_id,
                                    metatype_id: node.metatype_id,
                                    metatype_name: node.metatype_name,
                                    metatype_uuid: node.metatype_uuid,
                                    metadata: node.metadata,
                                    created_at: node.created_at?.toISOString(),
                                    created_by: node.created_by,
                                    modified_at: node.modified_at?.toISOString(),
                                    modified_by: node.modified_by,
                                    properties: node.properties,
                                    metadata_properties: node.metadata_properties,
                                }

                                if (resolverOptions?.rawMetadataEnabled) {
                                    toPush.raw_data_properties = node['data' as keyof object],
                                    toPush.raw_data_history = node['history' as keyof object]
                                }

                                nodeOutput.push(toPush);
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

                if (input._record.relationship_pair_uuid) {
                    if(Array.isArray(input._record.relationship_pair_uuid.value) && input._record.relationship_pair_uuid.value.length === 1) {
                        input._record.relationship_pair_uuid.value = input._record.relationship_pair_uuid.value[0];
                    }

                    repo = repo.and().metatypeRelationshipUUID(input._record.relationship_pair_uuid.operator, input._record.relationship_pair_uuid.value);
                }

                if (input._record.destination_metatype_uuid) {
                    if(Array.isArray(input._record.destination_metatype_uuid.value) && input._record.destination_metatype_uuid.value.length === 1) {
                        input._record.destination_metatype_uuid.value = input._record.destination_metatype_uuid.value[0];
                    }

                    repo = repo.and().destinationMetatypeUUID(input._record.destination_metatype_uuid.operator, input._record.destination_metatype_uuid.value);
                }

                if (input._record.origin_metatype_uuid) {
                    if(Array.isArray(input._record.origin_metatype_uuid.value) && input._record.origin_metatype_uuid.value.length === 1) {
                        input._record.origin_metatype_uuid.value = input._record.origin_metatype_uuid.value[0];
                    }

                    repo = repo.and().originMetatypeUUID(input._record.origin_metatype_uuid.operator, input._record.origin_metatype_uuid.value);
                }
            }

            if (options?.rawMetadataEnabled && input.raw_data_properties && Array.isArray(input.raw_data_properties)) {
                let joinTable: string | undefined;
                input.raw_data_properties.forEach((prop) => {
                    // apply conditions only if historical is specified
                    if (prop.historical) {
                        joinTable = 'edges' // override table that we are joining with
                        repo = repo.join('edges', {origin_col: 'id', destination_col: 'id'})
                    }
                    // join to data staging to get raw data
                    repo = repo
                        .join('data_staging', {origin_col: 'data_staging_id', destination_col: 'id'}, {origin: joinTable})
                    repo = repo.and().queryJsonb(
                        prop.key, 'data',
                        prop.operator, prop.value,
                        {tableName: 'data_staging'}
                    )
                    // reset join table
                    joinTable = undefined;
                })
            }

            if (input.metadata_properties && Array.isArray(input.metadata_properties)) {
                input.metadata_properties.forEach((prop) => {
                    repo = repo.and().queryJsonb(
                        prop.key, 'metadata_properties',
                        prop.operator, prop.value
                    )
                })
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
                if (key === '_record' || key === 'raw_data_properties' || key === 'metadata_properties') {
                    return;
                }

                // values will come in as an array, separate them out
                if (Array.isArray(input[key].value) && input[key].value.length === 1) {
                    input[key].value = input[key].value[0];
                }

                repo = repo.and().property(propertyMap[key].name, input[key].operator, input[key].value, propertyMap[key].data_type);
            });

            // complete any metadata joins only as needed
            if (options?.rawMetadataEnabled) {
                // subquery for historical raw data
                const history = repo.subquery(
                    new Repository('nodes')
                        .select('id', 'sub_edges')
                        .addFields('jsonb_agg(data) AS history', 'raw_data')
                        .from('edges', 'sub_edges')
                        .join(
                            'data_staging',
                            {origin_col: 'data_staging_id', destination_col: 'id'},
                            {destination_alias: 'raw_data'}
                        )
                        .groupBy('id', 'sub_edges')
                )

                repo = repo
                    .join('data_staging', {destination_col: 'id', origin_col: 'data_staging_id'})
                    .addFields('data', 'data_staging')
                    .join(history,
                        {origin_col: 'id', destination_col: 'id'},
                        {destination_alias: 'raw_data_history'})
                    .addFields('history', 'raw_data_history')
            }

            if(options && options.returnFile) {
                // first we build a transform stream so that the raw edge return is formatted correctly
                // note that we know that originating stream is in object mode, so we're able to cast correctly
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const transform = new Transform({objectMode: true, transform: (chunk: object, _: any, done: (o: any, a: any) => any ) => {
                    const edge = plainToClass(Edge, chunk)

                    if (options.rawMetadataEnabled) {
                        done(null, {
                            ...edge.properties,
                            _record: {
                                id: edge.id,
                                pair_id: edge.relationship_pair_id,
                                data_source_id: edge.data_source_id,
                                import_id: edge.import_data_id,
                                origin_id: edge.origin_id,
                                origin_metatype_id: edge.origin_metatype_id,
                                origin_metatype_uuid: edge.origin_metatype_uuid,
                                destination_id: edge.destination_id,
                                destination_metatype_id: edge.destination_metatype_id,
                                destination_metatype_uuid: edge.destination_metatype_uuid,
                                relationship_name: edge.metatype_relationship_name,
                                relationship_pair_uuid: edge.metatype_relationship_uuid,
                                metadata: edge.metadata,
                                created_at: edge.created_at?.toISOString(),
                                created_by: edge.created_by,
                                modified_at: edge.modified_at?.toISOString(),
                                modified_by: edge.modified_by,
                            },
                            metadata_properties: edge.metadata_properties,
                            raw_data_properties: edge['data' as keyof object],
                            raw_data_history: edge['history' as keyof object],
                        });
                    } else {
                        done(null, {
                            ...edge.properties,
                            _record: {
                                id: edge.id,
                                pair_id: edge.relationship_pair_id,
                                data_source_id: edge.data_source_id,
                                import_id: edge.import_data_id,
                                origin_id: edge.origin_id,
                                origin_metatype_id: edge.origin_metatype_id,
                                origin_metatype_uuid: edge.origin_metatype_uuid,
                                destination_id: edge.destination_id,
                                destination_metatype_id: edge.destination_metatype_id,
                                destination_metatype_uuid: edge.destination_metatype_uuid,
                                relationship_name: edge.metatype_relationship_name,
                                relationship_pair_uuid: edge.metatype_relationship_uuid,
                                metadata: edge.metadata,
                                created_at: edge.created_at?.toISOString(),
                                created_by: edge.created_by,
                                modified_at: edge.modified_at?.toISOString(),
                                modified_by: edge.modified_by,
                            },
                            metadata_properties: edge.metadata_properties,
                        });
                    }
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

                                const toPush: {[key: string]: any} = {
                                    ...properties,
                                    _record: {
                                        id: edge.id,
                                        pair_id: edge.relationship_pair_id,
                                        data_source_id: edge.data_source_id,
                                        import_id: edge.import_data_id,
                                        origin_id: edge.origin_id,
                                        origin_metatype_id: edge.origin_metatype_id,
                                        origin_metatype_uuid: edge.origin_metatype_uuid,
                                        destination_id: edge.destination_id,
                                        destination_metatype_id: edge.destination_metatype_id,
                                        destination_metatype_uuid: edge.destination_metatype_uuid,
                                        relationship_name: edge.metatype_relationship_name,
                                        relationship_pair_uuid: edge.metatype_relationship_uuid,
                                        metadata: edge.metadata,
                                        created_at: edge.created_at?.toISOString(),
                                        created_by: edge.created_by,
                                        modified_at: edge.modified_at?.toISOString(),
                                        modified_by: edge.modified_by,
                                    },
                                    metadata_properties: edge.metadata_properties,
                                }

                                if (options?.rawMetadataEnabled) {
                                    toPush.raw_data_properties = edge['data' as keyof object],
                                    toPush.raw_data_history = edge['history' as keyof object]
                                }

                                edgeOutput.push(toPush);
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
            let repo = new NodeLeafRepository(input.root_node, containerID, input.depth, input.use_original_id);

            if (input.edge_type) {
                if (input.edge_type.name) {
                    const query = this.breakQuery(input.edge_type.name);
                    repo = repo.and().relationshipName(query[0], query[1]);
                } else if (input.edge_type.id) {
                    const query = this.breakQuery(input.edge_type.id);
                    repo = repo.and().relationshipId(query[0], query[1]);
                } else if (input.edge_type.uuid) {
                    const query = this.breakQuery(input.edge_type.uuid);
                    repo = repo.and().relationshipUUID(query[0], query[1]);
                }
            }

            if (input.node_type) {
                if (input.node_type.id) {
                    const query = this.breakQuery(input.node_type.id);
                    repo = repo.and((new NodeLeafRepository('','',''))
                        .originMetatypeId(query[0], query[1])
                        .or()
                        .destinationMetatypeId(query[0], query[1])
                    );
                } else if (input.node_type.name) {
                    const query = this.breakQuery(input.node_type.name);
                    repo = repo.and((new NodeLeafRepository('','',''))
                        .originMetatypeName(query[0], query[1])
                        .or()
                        .destinationMetatypeName(query[0], query[1])
                    );
                } else if (input.node_type.uuid) {
                    const query = this.breakQuery(input.node_type.uuid);
                    repo = repo.and((new NodeLeafRepository('','',''))
                        .originMetatypeUUID(query[0], query[1])
                        .or()
                        .destinationMetatypeUUID(query[0], query[1])
                    );
                }

                if (input.node_type.origin_id) {
                    const query = this.breakQuery(input.node_type.origin_id);
                    repo = repo.and().originMetatypeId(query[0], query[1]);
                } else if (input.node_type.origin_name) {
                    const query = this.breakQuery(input.node_type.origin_name);
                    repo = repo.and().originMetatypeName(query[0], query[1]);
                } else if (input.node_type.origin_uuid) {
                    const query = this.breakQuery(input.node_type.origin_uuid);
                    repo = repo.and().originMetatypeUUID(query[0], query[1]);
                }

                if (input.node_type.destination_id) {
                    const query = this.breakQuery(input.node_type.destination_id);
                    repo = repo.and().destinationMetatypeId(query[0], query[1]);
                } else if (input.node_type.destination_name) {
                    const query = this.breakQuery(input.node_type.destination_name);
                    repo = repo.and().destinationMetatypeName(query[0], query[1]);
                } else if (input.node_type.destination_uuid) {
                    const query = this.breakQuery(input.node_type.destination_uuid);
                    repo = repo.and().destinationMetatypeUUID(query[0], query[1]);
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

    // metatypeFromQuery breaks down a query, parsing it into an object, and then checking that object to see if there
    // are metatypes it needs to build into the schema
    private metatypesFromQuery(query: string | undefined): string[] {
        if(!query) return [];
        const results: string[] = [];

        const search = (root: {[key: string]: any} | undefined, r: string[]) => {
            if(!root) return r;
            // if root object or non-field send in the definitions
            if(root.kind === 'Document') {
                root.definitions.forEach((def: any) => search(def, r))
            }

            if(root.kind === 'OperationDefinition') {
                search(root.selectionSet, r)
            }

            if(root.kind === 'Field' && root.name?.value === 'metatypes') {
                search(root.selectionSet, r)
            }

            if(root.kind === 'SelectionSet') {
                root.selections?.forEach((selection: {[key: string]: any}) => {
                    if(selection.name?.value === 'metatypes') {
                        search(selection.selectionSet, r)
                    } else if (selection.name.value === '__type') {
                        selection.arguments.forEach((argument: any) => {
                            if (argument.name.value === 'name') {
                                search(argument, r)
                            }
                        })
                    } else if(selection.name?.value !== '__schema' && selection.name?.value !== 'relationships') {
                        if(selection.name?.value) r.push(selection.name.value);
                    }
                })
            }

            if(root.kind === 'Argument') {
                if(root.value.value){r.push(root.value.value)};
            }

            return r
        }

        return search(gql(query),results)
    }

    private relationshipsFromQuery(query: string | undefined): string[] {
        if(!query) return [];
        const results: string[] = [];

        const search = (root: {[key: string]: any} | undefined, r: string[]) => {
            if(!root) return r;
            // if root object or non-field send in the definitions
            if(root.kind === 'Document') {
                root.definitions.forEach((def: any) => search(def, r))
            }

            if(root.kind === 'OperationDefinition') {
                search(root.selectionSet, r)
            }

            if(root.kind === 'Field' && root.name?.value === 'relationships') {
                search(root.selectionSet, r)
            }

            if(root.kind === 'SelectionSet') {
                root.selections?.forEach((selection: {[key: string]: any}) => {
                    if(selection.name?.value === 'relationships') {
                        search(selection.selectionSet, r)
                    } else if (selection.name.value === '__type') {
                        selection.arguments.forEach((argument: any) => {
                            if (argument.name.value === 'name') {
                                search(argument, r)
                            }
                        })
                    } else if(selection.name?.value !== '__schema' && selection.name?.value !== 'metatypes') {
                        if(selection.name?.value) r.push(selection.name.value);
                    }
                })
            }

            if(root.kind === 'Argument') {
                if(root.value.value){r.push(root.value.value)};
            }

            return r
        }

        return search(gql(query),results)
    }

    private isNodesQuery(query: string | undefined): boolean {
        if(!query) return false;
        const results: boolean[] = [];

        const search = (root: {[key: string]: any} | undefined, r: boolean[]) => {
            if(!root) return r;
            // if root object or non-field send in the definitions
            if(root.kind === 'Document') {
                root.definitions.forEach((def: any) => search(def, r))
            }

            if(root.kind === 'OperationDefinition') {
                search(root.selectionSet, r)
            }

            if(root.kind === 'SelectionSet') {
                root.selections?.forEach((selection: any) => {
                    if(selection.name?.value === 'nodes') {
                        r.push(true)
                    }
                })
            }

            if(root.kind === 'Field' && root.name?.value === 'nodes') {
                r.push(true)
            }

            return r
        }

        // if search has any results it indicates we found nodes in the query
        return search(gql(query), results).length > 0
    }
}

export type Query = {
    query: string;
    variables?: any
}

export type ResolverOptions = {
    ontologyVersionID?: string;
    returnFile?: boolean;
    returnFileType?: 'json' | 'csv' | 'parquet' | string;
    query?: string; // passing in the query allows us to pare down the schema we generate
    metatypes?: string[] // metatype names to search
    relationships?: string[] // relationship names to search
    fullSchema?: boolean;
    pointInTime?: string; // timestamp for use in retrieving historical data and ontology versions
    rawMetadataEnabled?: boolean;
}
