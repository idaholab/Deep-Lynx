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
    GraphQLInputObjectType,
    GraphQLInt,
} from 'graphql';
import MetatypeRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import Result from '../common_classes/result';
import GraphQLJSON from 'graphql-type-json';
import {stringToValidPropertyName, valueCompare} from '../services/utilities';
import NodeRepository from '../data_access_layer/repositories/data_warehouse/data/node_repository';
import Logger from '../services/logger';
import Config from '../services/config';
import MetatypeRelationshipPairRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_pair_repository';
import MetatypeRelationshipRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_repository';
import OntologyVersionRepository from '../data_access_layer/repositories/data_warehouse/ontology/versioning/ontology_version_repository';
import TypeTransformationMapper from '../data_access_layer/mappers/data_warehouse/etl/type_transformation_mapper';
import TypeTransformation from '../domain_objects/data_warehouse/etl/type_transformation';
import TimeseriesEntryRepository from '../data_access_layer/repositories/data_warehouse/data/timeseries_entry_repository';
import DataSourceRepository from "../data_access_layer/repositories/data_warehouse/import/data_source_repository";
import {DataSource} from "../interfaces_and_impl/data_warehouse/import/data_source";
import {TimeseriesDataSourceConfig} from "../domain_objects/data_warehouse/import/data_source";
import NodeMapper from "../data_access_layer/mappers/data_warehouse/data/node_mapper";

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
    #nodeMapper: NodeMapper;

    recordInputType = new GraphQLInputObjectType({
        name: 'record_input',
        fields: {
            limit: {type: GraphQLInt, defaultValue: Config.limit_default},
            page: {type: GraphQLInt},
            sortBy: {type: GraphQLString},
            sortDesc: {type: GraphQLBoolean},
        },
    });

    recordInfo = new GraphQLObjectType({
        name: 'recordInfo',
        fields: {
            nodes: {type: new GraphQLList(GraphQLString)},
            metadata: {type: GraphQLJSON},
            count: {type: GraphQLInt},
            page: {type: GraphQLInt},
        },
    });

    fileInfo = new GraphQLObjectType({
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

    histogramInputType = new GraphQLInputObjectType({
        name: 'histogram_input',
        fields: {
            column: {type: GraphQLString},
            min: {type: GraphQLInt},
            max: {type: GraphQLInt},
            nbuckets: {type: GraphQLInt},
        },
    });

    constructor() {
        this.#metatypeRepo = new MetatypeRepository();
        this.#metatypePairRepo = new MetatypeRelationshipPairRepository();
        this.#relationshipRepo = new MetatypeRelationshipRepository();
        this.#ontologyRepo = new OntologyVersionRepository();
        this.#nodeRepo = new NodeRepository();
        this.#transformationMapper = TypeTransformationMapper.Instance;
        this.#nodeMapper = NodeMapper.Instance;
    }


    async ForNode(containerID: string, nodeID: string, options: ResolverOptions): Promise<Result<GraphQLSchema>> {
        const node = await this.#nodeRepo.findByID(nodeID);
        if (node.isError) {
            return Promise.resolve(Result.Failure(`error retrieving node ${node.error?.error}`));
        }
        // fetch all transformations that this node is associated with - these represent all timeseries tables connected
        // to the node and the data contained therein
        const nodeTransformations = await this.#nodeMapper.ListTransformationsForNode(nodeID)
        if (nodeTransformations.isError) {
            return Promise.resolve(Result.Failure(`error retrieving transformations for node ${nodeTransformations.error?.error}`));
        }

        const dataSources = await new DataSourceRepository().where().containerID('eq', containerID).and().adapter_type("eq", "timeseries").list();
        if (dataSources.isError) {
            return Promise.resolve(Result.Failure(`unable to list datasources for timeseries for node ${dataSources.error?.error}`));
        }

        // there might be a better, and closer to the sql way of doing this - but for now there won't be so many data sources
        // that pulling and looping through them is going to cause issues
        const matchedDataSources = dataSources.value.filter(source => {
            if(!source) return false

            const config = source.DataSourceRecord!.config as TimeseriesDataSourceConfig
            for(const parameter of config.attachment_parameters) {
                // if we don't match this filter then we can assume we fail the rest as it's only AND conjunction at
                // this time
                switch(parameter.type) {
                    case 'data_source' : {
                        try {
                            return valueCompare(parameter.operator!, node.value.data_source_id, parameter.value)
                        } catch(e) {
                            Logger.error(`error comparing values for data source attachment parameters`)
                            return false
                        }
                    }
                    case 'metatype_id' : {
                        try {
                            return valueCompare(parameter.operator!, node.value.metatype_id, parameter.value)
                        } catch(e) {
                            Logger.error(`error comparing values for metatype id attachment parameters`)
                            return false
                        }
                    }

                    case 'metatype_name' : {
                        try {
                            return valueCompare(parameter.operator!, node.value.metatype_name, parameter.value)
                        } catch(e) {
                            Logger.error(`error comparing values for metatype name attachment parameters`)
                            return false
                        }
                    }

                    case 'original_id' : {
                        try {
                            return valueCompare(parameter.operator!, node.value.original_data_id, parameter.value)
                        } catch(e) {
                            Logger.error(`error comparing values for original id attachment parameters`)
                            return false
                        }
                    }

                    case 'property' : {
                        try {
                            type ObjectKey = keyof typeof node.value.properties;
                            return valueCompare(parameter.operator!, node.value.properties[parameter.key as ObjectKey], parameter.value)
                        } catch(e) {
                            Logger.error(`error comparing values for property attachment parameters`)
                            return false
                        }
                    }

                    case 'id' : {
                        try {
                            return valueCompare(parameter.operator!, node.value.id, parameter.value)
                        } catch(e) {
                            Logger.error(`error comparing values for id attachment parameters`)
                            return false
                        }
                    }
                }
            }

            return true;
        })

        // we don't want to fail if no tables are attached,but we can't return anything more than a blank schema basically
        if (nodeTransformations.value.length === 0 && matchedDataSources.length === 0) {
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

        const transformationGraphQLObjects = this.graphQLObjectsForTransformations(transformations.value, options)
        const dataSourceGraphQLObjects = this.graphQLObjectsForDataSources(matchedDataSources, options)

        return Promise.resolve(
            Result.Success(
                new GraphQLSchema({
                    query: new GraphQLObjectType({
                        name: 'Query',
                        // we want same names to be overwritten with data sources taken precedence - though no overlap
                        // should happen due to the legacy naming scheme of the transformations
                        fields: Object.assign(transformationGraphQLObjects, dataSourceGraphQLObjects)
                    }),
                }),
            ),
        );
    }

    // resolverForNode takes a transformation because it's for querying timeseries data stored
    // in a database associated with the node and transformation. The transformation lets us use
    // the repository for querying timeseries data
    /**
     * @deprecated The method should not be used
     */
    resolverForNodeLegacy(transformation: TypeTransformation, options?: ResolverOptions): (_: any, {input}: {input: any}) => any {
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
                    repo = repo.query(propertyMap[key].column_name, input[key].operator, input[key].value, {dataType: propertyMap[key].value_type});
                    i++;
                } else {
                    repo = repo.and().query(propertyMap[key].column_name, input[key].operator, input[key].value, {dataType: propertyMap[key].value_type});
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

    /**
     * @deprecated The method should not be used
     */
    graphQLObjectsForTransformations(transformations: TypeTransformation[], options: ResolverOptions): {[key:string]: any} {
        const transformationGraphQLObjects: {[key: string]: any} = {};

        transformations.forEach((transformation, index) => {
            let name = transformation.name;
            if (!name) {
                name = `z_${transformation.id}`;
            }

            // append legacy so we know that this system of storing timeseries is no longer used
            name = `${name}_legacy`

            // if this object already exists, we need to append a counter onto the name, make it the index so we don't
            // have to do a recursive check
            if (transformationGraphQLObjects[stringToValidPropertyName(name)]) {
                name = `${name}_${index})`;
            }

            transformationGraphQLObjects[stringToValidPropertyName(name)] = {
                args: {
                    _record: {type: this.recordInputType},
                    _histogram: {type: this.histogramInputType},
                    ...this.inputFieldsForTransformation(transformation),
                },
                description: `Timeseries data from transformation ${name}`,
                type: options.returnFile
                    ? this.fileInfo
                    : new GraphQLList(
                        new GraphQLObjectType({
                            name,
                            // needed because the return type accepts an object, but throws a fit about it
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-ignore
                            fields: () => {
                                const output: {[key: string]: {[key: string]: GraphQLNamedType | GraphQLList<any>}} = {};
                                output._record = {type: this.recordInfo};

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
                resolve: this.resolverForNodeLegacy(transformation, options),
            };
        });


        return transformationGraphQLObjects
    }

    /**
     * @deprecated The method should not be used
     */
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

    graphQLObjectsForDataSources(sources: (DataSource |undefined)[], options: ResolverOptions): {[key:string]: any} {
        const dataSourceGraphQLObjects: {[key: string]: any} = {};

        sources.forEach((source,index) => {
            if(!source || !source.DataSourceRecord) return;

            let name = source.DataSourceRecord.name
            if (!name) {
                name = `y_${source.DataSourceRecord.id}`
            }

            if(dataSourceGraphQLObjects[stringToValidPropertyName(name)]) {
                name = `${name}_${index}`
            }

            dataSourceGraphQLObjects[stringToValidPropertyName(name)] = {
                args: {
                    _record:  {type: this.recordInputType},
                    ...this.inputFieldsForDataSource(source)
                },
                description: `Timeseries data from the data source ${name}`,
                type: options.returnFile
                    ? this.fileInfo
                    : new GraphQLList(new GraphQLObjectType({
                        name: stringToValidPropertyName(name),
                        // needed because the return type accepts an object, but throws a fit about it
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        fields: () => {
                            const output: {[key: string]: {[key: string]: GraphQLNamedType | GraphQLList<any>}} = {};
                            output._record = {type: this.recordInfo};

                            (source.DataSourceRecord!.config as TimeseriesDataSourceConfig).columns.forEach((column) => {
                                // if we're not a column mapping we need to skip to so we don't pollute the object
                                if (!column.column_name || !column.type) {
                                    return;
                                }

                                const propertyName = stringToValidPropertyName(column.column_name);
                                switch (column.type) {
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

                                    default: {
                                        output[propertyName] = {
                                            type: GraphQLJSON,
                                        };
                                    }
                                }
                            });

                            return output;
                        },
                    })),
                resolve: this.resolverForNode(source, options)
            }
        })


        return dataSourceGraphQLObjects
    }

    inputFieldsForDataSource(source: DataSource): {[key: string]: any} {
        const fields: {[key: string]: any} = {};
        const config = source.DataSourceRecord!.config as TimeseriesDataSourceConfig

        config.columns.forEach((column) => {
            if (!column.column_name || !column.type) return;

            const propertyName = stringToValidPropertyName(column.column_name);

            switch (column.type) {
                // because we have no specification on our internal number type, we
                // must set this as a float for now
                case 'number': {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`y_${source.DataSourceRecord!.id}` + column.column_name),
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
                            name: stringToValidPropertyName(`y_${source.DataSourceRecord!.id}` + column.column_name),
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
                            name: stringToValidPropertyName(`y_${source.DataSourceRecord!.id}` + column.column_name),
                            fields: {
                                operator: {type: GraphQLString},
                                value: {type: new GraphQLList(GraphQLBoolean)},
                            },
                        }),
                    };
                    break;
                }

                case 'json' : {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`y_${source.DataSourceRecord!.id}` + column.column_name),
                            fields: {
                                operator: {type: GraphQLString},
                                key: {type: GraphQLString},
                                value: {type: new GraphQLList(GraphQLString)},
                            },
                        }),
                    };
                }

                default: {
                    fields[propertyName] = {
                        type: new GraphQLInputObjectType({
                            name: stringToValidPropertyName(`y_${source.DataSourceRecord!.id}` + column.column_name),
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

    resolverForNode(source: DataSource, options?: ResolverOptions): (_: any, {input}: {input: any}) => any {
        return async (_, input: {[key: string]: any}) => {
            let repo: DataSourceRepository;
            const config = source.DataSourceRecord?.config as TimeseriesDataSourceConfig

            if (
                Object.keys(input).filter((key) => {
                    if (key === `_record`) return false;
                    return true;
                }).length > 0
            ) {
                repo = new DataSourceRepository().where();
            } else {
                repo = new DataSourceRepository();
            }

            const propertyMap: {
                [key: string]: {
                    column_name: string;
                    type: string;
                };
            } = {};

            config.columns?.forEach((column) => {
                if (!column.column_name || !column.type) return;

                propertyMap[stringToValidPropertyName(column.column_name)] = {
                    column_name: column.column_name,
                    type: column.type,
                };
            });


            // iterate through the input object, ignoring reserved properties and adding all others
            // to the query
            let i = 0; // iterator to keep track of when to include "and"
            Object.keys(input).forEach((key) => {
                if (key === `_record`) return;

                // values will come in as an array, separate them out
                if (Array.isArray(input[key].value) && input[key].value.length === 1) {
                    input[key].value = input[key].value[0];
                }

                // same statement but we must add "and" in front of each subsequent call to "query"
                // otherwise we'll get sql statement errors
                if (i === 0) {
                    repo = repo.query(
                        propertyMap[key].column_name,
                        input[key].operator,
                        input[key].value,
                        {
                            dataType: propertyMap[key].type,
                            tableName: `y_${source.DataSourceRecord?.id}`
                        }
                    );
                    i++;
                } else {
                    repo = repo.and().query(
                        propertyMap[key].column_name,
                        input[key].operator,
                        input[key].value,
                        {
                            dataType: propertyMap[key].type,
                            tableName: `y_${source.DataSourceRecord?.id}`
                        }
                    );
                }
            });

            if (options && options.returnFile) {
                return new Promise(
                    (resolve, reject) =>
                        void repo
                            .listTimeseriesToFile(source.DataSourceRecord!.id!,{
                                file_type: options && options.returnFileType ? options.returnFileType : 'json',
                                file_name: `${source.DataSourceRecord?.name}-${new Date().toDateString()}`,
                                containerID: source.DataSourceRecord!.container_id!,
                            })
                            .then((result) => {
                                if (result.isError) {
                                    reject(`unable to list timeseries data to file ${result.error?.error}`);
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
                            .listTimeseries(source.DataSourceRecord!.id!, {
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
}

export type ResolverOptions = {
    ontologyVersionID?: string;
    returnFile?: boolean;
    returnFileType?: 'json' | 'csv' | string;
};
