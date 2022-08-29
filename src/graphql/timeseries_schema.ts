/*
The query layer is a GraphQL layer which is dynamically built based on a user's current ontology. This
schema file contains most of the code to make this happen. The purpose of this schema is for users to
query timeseries data on the datasource level of granularity without worrying about attached nodes.
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
import Result from '../common_classes/result';
import GraphQLJSON from 'graphql-type-json';
import { stringToValidPropertyName } from '../services/utilities';
import Logger from '../services/logger';
import Config from '../services/config';
import DataSourceRepository from '../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import { DataSource } from '../interfaces_and_impl/data_warehouse/import/data_source';
import { TimeseriesDataSourceConfig } from '../domain_objects/data_warehouse/import/data_source';
import { ResolverOptions } from './node_graph_schema';

// GraphQLSchemaGenerator takes a container and generates a valid GraphQL schema for all contained metatypes. This will
// allow users to query and filter data found within their custom timeseries data source
export default class DataSourceGraphQLSchemaGenerator {
    #dataSourceRepo: DataSourceRepository;

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
            url: {type: GraphQLString}
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

    constructor(){
        this.#dataSourceRepo = new DataSourceRepository();
    }

    async ForDataSource(dataSourceID: string, options: ResolverOptions): Promise<Result<GraphQLSchema>> {
        const dataSource = await this.#dataSourceRepo.findByID(dataSourceID);

        if (dataSource.isError) {
            return Promise.resolve(Result.Failure(`error retrieving data source ${dataSource.error?.error}`));
        }

        // error out if the user supplies a non-timeseries data source
        if (dataSource.value.DataSourceRecord!.adapter_type !== 'timeseries') {
            return Promise.resolve(Result.Failure(`error: data source must be of type timeseries`));
        }

        const dataSourceGrapQLObject = this.graphQLObjectsForDataSource(dataSource.value, options);
        return Promise.resolve(
            Result.Success(
                new GraphQLSchema({
                    query: new GraphQLObjectType({
                        name: 'Query',
                        fields: dataSourceGrapQLObject
                    }),
                }),
            ),
        );
    }

    graphQLObjectsForDataSource(source: DataSource, options: ResolverOptions): {[key: string]: any} {
        const dataSourceGrapQLObjects: {[key: string]: any} = {};

        let name = 'Timeseries'

        dataSourceGrapQLObjects[stringToValidPropertyName(name)] = {
            args: {
                _record: {type: this.recordInputType},
                ...this.inputFieldsForDataSource(source)
            },
            description: `Timeseries data from the data source ${source!.DataSourceRecord!.name}`,
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
                            // if it's not a column mapping, skip so we don't pollute the object
                            if (!column.column_name || !column.type) {
                                return;
                            }

                            const propertyName = stringToValidPropertyName(column.column_name);
                            switch (column.type) {
                                // because we have no specification on our internal number type,
                                // we must set this as a float for now
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
            resolve: this.resolverForDataSource(source, options)
        }

        return dataSourceGrapQLObjects;
    }

    inputFieldsForDataSource(source: DataSource): {[key: string]: any} {
        const fields: {[key: string]: any} = {};
        const config = source.DataSourceRecord!.config as TimeseriesDataSourceConfig

        config.columns.forEach((column) => {
            if (!column.column_name || !column.type) return;

            const propertyName = stringToValidPropertyName(column.column_name);

            switch (column.type) {
                // because we have no specification for our internal number type,
                // we must set this as a float for now
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

    resolverForDataSource(source: DataSource, options?: ResolverOptions): (_: any, {input}: {input: any}) => any {
        return async (_, input: {[key: string]: any}) => {
            let repo: DataSourceRepository;
            const config = source.DataSourceRecord?.config as TimeseriesDataSourceConfig

            if (
                Object.keys(input).filter((key) => {
                    if (key === '_record') return false;
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

            // iterate through the input object, ignoring reserved properties and
            // adding all others to the query
            let i = 0; // iterator to keep track of when to include "and"
            Object.keys(input).forEach((key) => {
                if (key === '_record') return;

                // values will come in as an array, separate them out
                if (Array.isArray(input[key].value) && input[key].value.length === 1) {
                    input[key].value = input[key].value[0];
                }

                // same statement bust we must add "and" in front of each subsequent call to "query"
                // otherwise we'll get sql statement errors
                if (i === 0) {
                    repo = repo.query(propertyMap[key].column_name, input[key].operator, input[key].value, propertyMap[key].type);
                    i++;
                } else {
                    repo = repo.and().query(propertyMap[key].column_name, input[key].operator, input[key].value, propertyMap[key].type);
                }
            });

            if (options && options.returnFile) {
                return new Promise(
                    (resolve, reject) => {
                        void repo
                            .listTimeseriesToFile(source.DataSourceRecord!.id!, {
                                file_type: options && options.returnFileType ? options.returnFileType: 'json',
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
                            })
                    }
                );
            } else {
                return new Promise(
                    (resolve) => {
                        void repo
                            .listTimeseries(source.DataSourceRecord!.id!, {
                                limit: input._record?.limit ? input._record.limit : 10000,
                                offset: input._record?.page ? input._record.limit * input._record.page : undefined,
                                sortBy: input._record?.sortBy ? input._record.sortBy : undefined,
                                sortDesc: input._record?.sortDesc ? input._record.sortDesc : undefined,
                            })
                            .then((results) => {
                                if (results.isError) {
                                    Logger.error(`unable to list time series data ${results.error?.error}`);
                                    resolve([]);
                                }

                                const output: {[key: string]: any}[] = [];

                                results.value.forEach((entry) => {
                                    output.push({
                                        ...entry,
                                    });
                                });

                                resolve(output);
                            })
                            .catch((e) => resolve(e))
                    }
                );
            }
        };
    }
}