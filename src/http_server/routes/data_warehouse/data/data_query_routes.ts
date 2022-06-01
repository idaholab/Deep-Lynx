import {Application, NextFunction, Request, Response} from 'express';
import {graphql} from 'graphql';
import {authInContainer} from '../../../middleware';
import GraphQLSchemaGenerator from '../../../../graphql/schema';

export default class DataQueryRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/containers/:containerID/data', ...middleware, authInContainer('read', 'data'), this.query);
    }

    // very simple route that passes the raw body directly to the the graphql query
    // for the complex portions of this endpoint visit the data_query folder and functions
    private static query(req: Request, res: Response, next: NextFunction) {
        const generator = new GraphQLSchemaGenerator();

        generator
            .ForContainer(req.container?.id!, {
                ontologyVersionID: req.query.ontologyVersionID as string,
                returnFile: String(req.query.returnFile).toLowerCase() === 'true',
                returnFileType: String(req.query.returnFileType).toLowerCase(),
            })
            .then((schemaResult) => {
                if (schemaResult.isError) {
                    schemaResult.asResponse(res);
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
}
