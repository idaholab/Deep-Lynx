import {Application, NextFunction, Request, Response} from "express";
import {graphql} from "graphql";
import {authInContainer} from "../../../../middleware";
import resolversRoot from "../../../../../data_warehouse/data/query/resolvers";
import {schema} from "../../../../../data_warehouse/data/query/schema";
const bodyParser = require('body-parser')

export default class QueryRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post("/containers/:id/query", ...middleware, authInContainer("read", "data"), bodyParser.text(), this.query)
    }

    // very simple route that passes the raw body directly to the the graphql query
    // for the complex portions of this endpoint visit the data_query folder and functions
    private static query(req: Request, res: Response, next: NextFunction) {
        graphql(schema, req.body, resolversRoot(req.params.id))
            .then(response => {
                res.status(200).json(response)
            })
            .catch(e => {
                res.status(500).json(e)
            })
            .finally(() => next())
    }
}
