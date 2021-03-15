import {driver, process} from "gremlin";
import Result from "../../result";
import {Edge, Property} from "./types";
import GremlinAdapter from "./gremlin";

export default class Edges {
    private g: process.GraphTraversalSource;
    private client: driver.Client;

    constructor(g: process.GraphTraversalSource, client: driver.Client) {
        this.g = g;
        this.client = client
    }

    public async retrieve(id: string): Promise<Result<Edge>> {
        GremlinAdapter.escapeArguments(arguments);
        const translator = new process.Translator(this.g);
        translator.of('g');
        return new Promise((resolve) => {
            this.client.submit(translator.translate(this.g.E(`${id}L`).getBytecode()))
                .then((result: driver.ResultSet) => {
                    if (result.first() == null) resolve(Result.Failure('record not found', 404));

                    resolve(Result.Success(result.first() as Edge))
                })
                .catch((err) => resolve(Result.Failure(err)))
        })
    }

    /*
    addEdge is the simplest implementation of adding an edge to the database.
    Currently we return the raw gremlin type - planning on changing this soon
    */
    public async add(from: string, to: string, relationshipLabel: string, properties?: any): Promise<Result<Edge>> {
        GremlinAdapter.escapeArguments(arguments);

        const translator = new process.Translator(this.g);
        translator.of('g');
        let query = this.g.V(`${from}`).as('a').V(`${to}`).as('b').addE(relationshipLabel).from_('a').to('b');

        query = GremlinAdapter.toGremlinProperties(query, properties);

        return new Promise((resolve, reject) => {
            this.client.submit(translator.translate(query.getBytecode()))
                .then((result) => resolve(Result.Success(result.first())))
                .catch((err) => reject(err))
        })
    }
}
