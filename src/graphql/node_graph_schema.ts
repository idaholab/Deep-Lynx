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
import Config from '../services/config';
import MetatypeRelationshipPairRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_pair_repository';
import EdgeRepository from '../data_access_layer/repositories/data_warehouse/data/edge_repository';
import MetatypeRelationshipRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_repository';
import NodeLeafRepository from '../data_access_layer/repositories/data_warehouse/data/node_leaf_repository';
import OntologyVersionRepository from '../data_access_layer/repositories/data_warehouse/ontology/versioning/ontology_version_repository';
import TypeTransformationMapper from '../data_access_layer/mappers/data_warehouse/etl/type_transformation_mapper';
import TypeTransformation from '../domain_objects/data_warehouse/etl/type_transformation';
import TimeseriesEntryRepository from '../data_access_layer/repositories/data_warehouse/data/timeseries_entry_repository';
import {plainToClass} from 'class-transformer';
import Node from '../domain_objects/data_warehouse/data/node';
import {Transform} from 'stream';
import Edge from '../domain_objects/data_warehouse/data/edge';

// GraphQLSchemaGenerator takes a container and generates a valid GraphQL schema for all contained metatypes. This will
// allow users to query and filter data based on node type, the various properties that type might have, and other bits
// of metadata.
export default class NodeGraphQLSchemaGenerator {
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

    async ForNode(nodeID: string, options: ResolverOptions): Promise<Result<GraphQLSchema>> {
        // first we declare the needed,nested graphql types for record info
        const recordInputType = new GraphQLInputObjectType({
            name: 'record_input',
            fields: {
                limit: {type: GraphQLInt, defaultValue: Config.limit_default},
                page: {type: GraphQLInt},
                sortBy: {type: GraphQLString},
                sortDesc: {type: GraphQLBoolean},
            },
        });

        const recordInfo = new GraphQLObjectType({
            name: 'recordInfo',
            fields: {
                nodes: {type: new GraphQLList(GraphQLString)},
                metadata: {type: GraphQLJSON},
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

        // histogram specific arguments, currently we only allow one histogram
        const histogramInputType = new GraphQLInputObjectType({
            name: 'histogram_input',
            fields: {
                column: {type: GraphQLString},
                min: {type: GraphQLInt},
                max: {type: GraphQLInt},
                nbuckets: {type: GraphQLInt},
            },
        });

        const transformationGraphQLObjects: {[key: string]: any} = {};

        // fetch all transformations that this node is associated with - these represent all timeseries tables connected
        // to the node and the data contained therein
        const nodeTransformations = await this.#nodeRepo.listTransformations(nodeID);
        if (nodeTransformations.isError) {
            return Promise.resolve(Result.Failure(`error retrieving transformations for node`));
        }

        // we don't want to fail if no tables are attached,but we can't return anything more than a blank schema basically
        if (nodeTransformations.value.length === 0) {
            return Promise.resolve(
                Result.Success(
                    new GraphQLSchema({
                        query: new GraphQLObjectType({
                            name: 'Query',
                            fields: {},
                        }),
                    }),
                ),
            );
        }

        // loop through the transformations, ignoring if they're not timeseries, and building a GraphQL object if they
        // are
        const transformations = await this.#transformationMapper.ListFromIDs(nodeTransformations.value.map((t) => t.transformation_id!));
        if (transformations.isError) {
            return Promise.resolve(Result.Failure(`unable to list transformations for node ${transformations.error?.error}`));
        }

        transformations.value.forEach((transformation, index) => {
            let name = transformation.name;
            if (!name) {
                name = `z_${transformation.id}`;
            }

            // if this object already exists, we need to append a counter onto the name, make it the index so we don't
            // have to do a recursive check
            if (transformationGraphQLObjects[stringToValidPropertyName(name)]) {
                name = `${name}_${index}`;
            }

            transformationGraphQLObjects[stringToValidPropertyName(name)] = {
                args: {
                    _record: {type: recordInputType},
                    _histogram: {type: histogramInputType},
                    ...this.inputFieldsForTransformation(transformation),
                },
                description: `Timeseries data from transformation ${name}`,
                type: options.returnFile
                    ? fileInfo
                    : new GraphQLList(
                          new GraphQLObjectType({
                              name,
                              // needed because the return type accepts an object, but throws a fit about it
                              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                              // @ts-ignore
                              fields: () => {
                                  const output: {[key: string]: {[key: string]: GraphQLNamedType | GraphQLList<any>}} = {};
                                  output._record = {type: recordInfo};

                                  transformation.keys.forEach((keyMapping) => {
                                      // if we're not a column mapping we need to skip to so we don't pollute the object
                                      if (!keyMapping.column_name || !keyMapping.value_type) {
                                          return;
                                      }

                                      const propertyName = stringToValidPropertyName(keyMapping.column_name);
                                      switch (keyMapping.value_type) {
                                          // because we have no specification on our internal number type, we
                                          // must set this as a float for now
                                          case 'number': {
                                              output[propertyName] = {
                                                  type: GraphQLInt,
                                              };
                                              break;
                                          }

                                          case 'float': {
                                              output[propertyName] = {
                                                  type: GraphQLFloat,
                                              };
                                              break;
                                          }

                                          case 'number64' || 'float64': {
                                              output[propertyName] = {
                                                  type: GraphQLString,
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
                resolve: this.resolverForNode(transformation, options),
            };
        });

        return Promise.resolve(
            Result.Success(
                new GraphQLSchema({
                    query: new GraphQLObjectType({
                        name: 'Query',
                        fields: transformationGraphQLObjects,
                    }),
                }),
            ),
        );
    }

    // resolverForNode takes a transformation because it's for querying timeseries data stored
    // in a database associated with the node and transformation. The transformation lets us use
    // the repository for querying timeseries data
    resolverForNode(transformation: TypeTransformation, options?: ResolverOptions): (_: any, {input}: {input: any}) => any {
        return async (_, input: {[key: string]: any}) => {
            let repo: TimeseriesEntryRepository;

            if (
                Object.keys(input).filter((key) => {
                    if (key === `_record` || key === `_histogram`) return false;
                    return true;
                }).length > 0
            ) {
                repo = new TimeseriesEntryRepository(transformation.id).where();
            } else {
                repo = new TimeseriesEntryRepository(transformation.id);
            }

            const propertyMap: {
                [key: string]: {
                    column_name: string;
                    value_type: string;
                };
            } = {};

            transformation.keys?.forEach((key) => {
                if (!key.column_name || !key.value_type) return;

                propertyMap[stringToValidPropertyName(key.column_name)] = {
                    column_name: key.column_name,
                    value_type: key.value_type,
                };
            });

            // check the input for a histogram argument - indicating a user wants the return value to contain a histogram
            if (input._histogram) {
                repo = repo.histogram(input._histogram.column, input._histogram.min, input._histogram.max, input._histogram.nbuckets).where();
            }

            // iterate through the input object, ignoring reserved properties and adding all others
            // to the query
            let i = 0; // iterator to keep track of when to include "and"
            Object.keys(input).forEach((key) => {
                if (key === `_record` || key === `_histogram`) return;

                // values will come in as an array, separate them out
                if (Array.isArray(input[key].value) && input[key].value.length === 1) {
                    input[key].value = input[key].value[0];
                }

                // same statement but we must add "and" in front of each subsequent call to "query" or else we'll get
                // sql statement errors
                if (i === 0) {
                    repo = repo.query(propertyMap[key].column_name, input[key].operator, input[key].value, propertyMap[key].value_type);
                    i++;
                } else {
                    repo = repo.and().query(propertyMap[key].column_name, input[key].operator, input[key].value, propertyMap[key].value_type);
                }
            });

            if (options && options.returnFile) {
                return new Promise(
                    (resolve, reject) =>
                        void repo
                            .listAllToFile({
                                file_type: options && options.returnFileType ? options.returnFileType : 'json',
                                file_name: `${transformation.name}-${new Date().toDateString()}`,
                                containerID: transformation.container_id!,
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
                return new Promise(
                    (resolve) =>
                        void repo
                            .list({
                                limit: input._record?.limit ? input._record.limit : 10000,
                                offset: input._record?.page ? input._record.limit * input._record.page : undefined,
                                sortBy: input._record?.sortBy ? input._record.sortBy : undefined,
                                sortDesc: input._record?.sortDesc ? input._record.sortDesc : undefined,
                            })
                            .then((results) => {
                                if (results.isError) {
                                    Logger.error(`unable to list time series data${results.error?.error}`);
                                    resolve([]);
                                }

                                const output: {[key: string]: any}[] = [];

                                results.value.forEach((entry) => {
                                    let nodes: any;
                                    let metadata: any;

                                    if (entry.nodes) {
                                        nodes = entry.nodes;
                                        delete entry.nodes;
                                    }

                                    if (entry.metadata) {
                                        metadata = entry.metadata;
                                        delete entry.metadata;
                                    }

                                    output.push({
                                        ...entry,
                                        _record: {nodes, metadata},
                                    });
                                });

                                resolve(output);
                            })
                            .catch((e) => resolve(e)),
                );
            }
        };
    }

    inputFieldsForTransformation(transformation: TypeTransformation): {[key: string]: any} {
        const fields: {[key: string]: any} = {};

        transformation.keys?.forEach((key) => {
            if (!key.column_name || !key.value_type) return;

            const propertyName = stringToValidPropertyName(key.column_name);

            switch (key.value_type) {
                // because we have no specification on our internal number type, we
                // must set this as a float for now
                case 'number': {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`z_${transformation.id}` + key.column_name),
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
                            name: stringToValidPropertyName(`z_${transformation.id}` + key.column_name),
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
                            name: stringToValidPropertyName(`z_${transformation.id}` + key.column_name),
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
                            name: stringToValidPropertyName(`z_${transformation.id}` + key.column_name),
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
                            name: stringToValidPropertyName(`z_${transformation.id}` + key.column_name),
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
                            name: stringToValidPropertyName(`z_${transformation.id}` + key.column_name),
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
}

export type ResolverOptions = {
    ontologyVersionID?: string;
    returnFile?: boolean;
    returnFileType?: 'json' | 'csv' | string;
};
