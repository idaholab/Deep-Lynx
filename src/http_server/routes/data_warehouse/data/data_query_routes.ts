import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer} from '../../../middleware';
import GraphQLRunner from '../../../../graphql/schema';

export default class DataQueryRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/containers/:containerID/data', ...middleware, authInContainer('read', 'data'), this.query);
    }

    // very simple route that passes the raw body directly to the graphql query
    // for the complex portions of this endpoint visit the data_query folder and functions
    private static query(req: Request, res: Response, next: NextFunction) {
        const runner = new GraphQLRunner();
        runner
            .RunQuery(
                req.container?.id!,
                {query: req.body.query, variables: req.body.variables},
                {
                    ontologyVersionID: req.query.ontologyVersionID as string,
                    returnFile: String(req.query.returnFile).toLowerCase() === 'true',
                    returnFileType: String(req.query.returnFileType).toLowerCase(),
                    query: req.body.query,
                },
            )
            .then((response) => {
                res.status(200).json(response);
            })
            .catch((e) => {
                res.status(500).json(e.toString());
            });
    }
}
