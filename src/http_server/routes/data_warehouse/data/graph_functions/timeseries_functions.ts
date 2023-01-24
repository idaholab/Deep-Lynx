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
}