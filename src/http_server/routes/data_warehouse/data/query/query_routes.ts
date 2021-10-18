import {Application, NextFunction, Request, Response} from 'express';
import {graphql} from 'graphql';
import {authInContainer} from '../../../../middleware';
import resolversRoot from './resolvers';
import {schema} from './schema';
const bodyParser = require('body-parser');

export default class QueryRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/containers/:containerID/query', ...middleware, authInContainer('read', 'data'), bodyParser.text(), this.query);
    }

    // very simple route that passes the raw body directly to the the graphql query
    // for the complex portions of this endpoint visit the data_query folder and functions
    private static query(req: Request, res: Response, next: NextFunction) {
        if (!req.headers['content-type']?.includes('application/json') && !req.headers['content-type']?.includes('application/graphql')) {
            graphql(schema, req.body, resolversRoot(req.params.containerID))
                .then((response) => {
                    res.status(200).json(response);
                })
                .catch((e) => {
                    res.status(500).json(e);
                })
                .finally(() => next());
        } else {
            graphql(schema, req.body.query, resolversRoot(req.params.containerID), req.body.variables)
                .then((response) => {
                    res.status(200).json(response);
                })
                .catch((e) => {
                    res.status(500).json(e);
                })
                .finally(() => next());
        }
    }
}
