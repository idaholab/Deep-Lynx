// Common Classes
import Result from '../../../../../common_classes/result';

// Express
import {NextFunction, Request, Response} from 'express';

// GraphQL
import {graphql} from 'graphql';

// Repository
import NodeRepository from '../../../../../data_access_layer/repositories/data_warehouse/data/node_repository';
const nodeRepo = new NodeRepository();

// Schema
import NodeGraphQLSchemaGenerator from '../../../../../graphql/node_graph_schema';
import DataSourceGraphQLSchemaGenerator from '../../../../../graphql/timeseries_schema';
import DataSourceRepository from '../../../../../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import {TimeseriesDataSourceConfig} from '../../../../../domain_objects/data_warehouse/import/data_source';

export default class TimeseriesFunctions {
    public static queryTimeseriesData(req: Request, res: Response, next: NextFunction) {
        const generator = new NodeGraphQLSchemaGenerator();

        generator
            .ForNode(req.container?.id!, req.node?.id!, {
                returnFile: String(req.query.returnFile).toLowerCase() === 'true',
                returnFileType: String(req.query.returnFileType).toLowerCase(),
            })
            .then((schemaResult) => {
                if (schemaResult.isError) {
                    Result.Error(schemaResult.error).asResponse(res);
                    return;
                }

                graphql({
                    schema: schemaResult.value,
                    source: req.body.query,
                    variableValues: req.body.variables,
                })
                    .then((response) => {
                        res.status(200).json(response);
                    })
                    .catch((e) => {
                        res.status(500).json(e.toString());
                    });
            })
            .catch((e) => {
                res.status(500).json(e.toString());
            });
    }

    public static queryTimeseriesDataTypes(req: Request, res: Response, next: NextFunction) {
        const repo = new NodeRepository();

        repo.listTimeseriesTables(req.node!, req.container?.id!)
            .then((results) => {
                results.asResponse(res);
            })
            .catch((e) => Result.Error(e).asResponse(res));
    }

    public static queryTimeseriesDataSource(req: Request, res: Response, next: NextFunction) {
        const generator = new DataSourceGraphQLSchemaGenerator();

        generator
            .ForDataSource(req.params.dataSourceID, {
                returnFile: String(req.query.returnFile).toLowerCase() === 'true',
                returnFileType: String(req.query.returnFileType).toLowerCase(),
            })
            .then((schemaResult) => {
                if (schemaResult.isError) {
                    Result.Error(schemaResult.error).asResponse(res);
                    return;
                }

                graphql({
                    schema: schemaResult.value,
                    source: req.body.query,
                    variableValues: req.body.variables,
                })
                    .then((response) => {
                        res.status(200).json(response);
                    })
                    .catch((e) => {
                        Result.Error(e).asResponse(res);
                    });
            })
            .catch((e) => {
                Result.Error(e).asResponse(res);
            });
    }

    public static retrieveTimeseriesRowCount(req: Request, res: Response, next: NextFunction) {
        if (req.container && req.dataSource && req.dataSource.DataSourceRecord && req.dataSource.DataSourceRecord.adapter_type === 'timeseries') {
            const repo = new DataSourceRepository();

            repo.retrieveTimeseriesRowCount(`y_${req.dataSource.DataSourceRecord.id}`)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`Unable to find Data Source or Data Source type is not timeseries`).asResponse(res);
            next();
        }
    }

    public static retrieveTimeseriesRange(req: Request, res: Response, next: NextFunction) {
        if (req.container && req.dataSource && req.dataSource.DataSourceRecord && req.dataSource.DataSourceRecord.adapter_type === 'timeseries') {
            const repo = new DataSourceRepository();

            const primaryTimestampColumn = (req.dataSource.DataSourceRecord.config as TimeseriesDataSourceConfig).columns.find((c) => c.is_primary_timestamp);
            if (primaryTimestampColumn === undefined || primaryTimestampColumn.column_name === undefined) {
                Result.Failure(`Could not find a primary timestamp for this datasource`).asResponse(res);
                next();
            }

            repo.retrieveTimeseriesRange(primaryTimestampColumn!.column_name!, `y_${req.dataSource.DataSourceRecord.id}`)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`Unable to find Data Source or Data Source type is not timeseries`).asResponse(res);
            next();
        }
    }
}
