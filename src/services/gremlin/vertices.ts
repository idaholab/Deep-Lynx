import {driver, process} from "gremlin";
import Result from "../../result";
import {Property, Vertex} from "./types";
import GremlinAdapter from "./gremlin";

export default class Vertices {
    private g: process.GraphTraversalSource;
    private client: driver.Client;

    constructor(g: process.GraphTraversalSource, client: driver.Client) {
        this.g = g;
        this.client = client
    }

    public async retrieve(id: string): Promise<Result<Vertex>> {
        GremlinAdapter.escapeArguments(arguments);

        const translator = new process.Translator(this.g);
        translator.of('g');

        return new Promise((resolve) => {
            this.client.submit(translator.translate(this.g.V(id).getBytecode()))
                .then((result: driver.ResultSet) => {
                    if (result.first() == null) resolve(Result.Failure('record not found', 404));

                    resolve(Result.Success(result.first() as Vertex))
                })
                .catch((err) => resolve(Result.Failure(err)))
        })
    }

    // exists vertex verifies that a vertex with the same exact properties doesn't already exist
    // note: this will only return false when all properties match. Think of tuple matching
    public async exactMatchExists(label: string, properties: any): Promise<boolean> {
        GremlinAdapter.escapeArguments(arguments);
        let write = this.g.V();

        for (const key in properties) {
            if (properties.hasOwnProperty(key)) {
                if (typeof properties[key] === 'object') {
                    write = write.has(key, JSON.stringify(properties[key]));
                    continue
                }

                write = write.has(label, key, `${properties[key]}`)
            }
        }

        const translator = new process.Translator(this.g);
        translator.of('g');

        return new Promise((resolve) => {
            this.client.submit(translator.translate(write.getBytecode()))
                .then((result: driver.ResultSet) => {
                    if (result.first() == null) {
                        resolve(false);
                        return;
                    }

                    resolve(true)
                })
                .catch(() => resolve(false))
        })
    }

    /*
  addVertex is the simplest implementation of adding a vertex to a database.
  Currently we return the raw gremlin type - planning on changing this soon
   */
    public async add(type: string, input: any): Promise<Result<Vertex>> {
        GremlinAdapter.escapeArguments(arguments);

        let write = this.g.addV(type);

        write = GremlinAdapter.toGremlinProperties(write, input);

        // generic partition key for now
        write.property("_partitionKey", type);


        // translator is how we're going to take the bytecode command we built
        // and transform it into valid gremlin/groovy script
        const translator = new process.Translator(this.g);
        translator.of('g');

        return new Promise((resolve) => {
            this.client.submit(translator.translate(write.getBytecode()))
                .then((result: driver.ResultSet) => {
                    resolve(Result.Success(result.first()))
                })
                .catch((err) => resolve(Result.Failure(err)))
        })
    }

    /*
    updateVertex accepts a simple object input and id and attempts to update
    or add properties to an existing vertex based on input provided.
    */
    public async update(id: string, input: any): Promise<Result<Vertex>> {
        GremlinAdapter.escapeArguments(arguments);

        let write = this.g.V(`${id}`);

        write = GremlinAdapter.toGremlinProperties(write, input);

        const translator = new process.Translator(this.g);
        translator.of('g');

        return new Promise((resolve) => {
            this.client.submit(translator.translate(write.getBytecode()))
                .then((result: driver.ResultSet) => {
                    resolve(Result.Success(result.first()))
                })
                .catch((err) => resolve(Result.Failure(err)))
        })
    }

    /*
    permanentlyDeleteVertex drops a vertex element from the database. It differs
    from delete in that there is no way to recover the element afterward
    */
    public async permanentlyDelete(id: string): Promise<Result<boolean>> {
        GremlinAdapter.escapeArguments(arguments);

        const write = this.g.V(`${id}`).drop();

        const translator = new process.Translator(this.g);
        translator.of('g');

        return new Promise((resolve) => {
            this.client.submit(translator.translate(write.getBytecode()))
                .then(() => resolve(Result.Success(true)))
                .catch((err) => resolve(Result.Failure(err)))
        })
    }

    public async outgoingByType(id: string, ...relationshipLabels: string[]): Promise<Result<Vertex[]>> {
        GremlinAdapter.escapeArguments(arguments);

        const translator = new process.Translator(this.g);
        translator.of('g');
        let query = this.g.V(`${id}`).outE().inV();

        if (relationshipLabels.length > 0) {
            const labels = relationshipLabels.map(label => `${label}`);
            query = query.hasLabel(labels.join(','))
        }


        return new Promise((resolve, reject) => {
            this.client.submit(translator.translate(query.getBytecode()))
                .then((result: driver.ResultSet) => {
                    resolve(Result.Success(result.toArray()))
                })
                .catch((err) => reject(err))
        })

    }

    public async incomingByType(id: string, ...relationshipLabels: string[]): Promise<Result<Vertex[]>> {
        GremlinAdapter.escapeArguments(arguments);

        const translator = new process.Translator(this.g);
        translator.of('g');
        let query = this.g.V(`${id}`).inE().outV();

        if (relationshipLabels.length > 0) {
            const labels = relationshipLabels.map(label => `${label}`);
            query = query.hasLabel(labels.join(','))
        }

        return new Promise((resolve, reject) => {
            this.client.submit(translator.translate(query.getBytecode()))
                .then((result: driver.ResultSet) => {
                    resolve(Result.Success(result.toArray()))
                })
                .catch((err) => reject(err))
        })
    }

    public async outgoingByEdgeType(id: string, ...relationshipLabels: string[]): Promise<Result<Vertex[]>> {
        GremlinAdapter.escapeArguments(arguments);

        const translator = new process.Translator(this.g);
        translator.of('g');
        let query = this.g.V(`${id}`).outE();

        if (relationshipLabels.length > 0) {
            const labels = relationshipLabels.map(label => `${label}`);
            query = query.hasLabel(labels.join(','))
        }

        query = query.inV();

        return new Promise((resolve, reject) => {
            this.client.submit(translator.translate(query.getBytecode()))
                .then((result: driver.ResultSet) => {
                    resolve(Result.Success(result.toArray()))
                })
                .catch((err) => reject(err))
        })

    }

    public async incomingByEdgeType(id: string, ...relationshipLabels: string[]): Promise<Result<Vertex[]>> {
        GremlinAdapter.escapeArguments(arguments);

        const translator = new process.Translator(this.g);
        translator.of('g');
        let query = this.g.V(`${id}`).inE();

        if (relationshipLabels.length > 0) {
            const labels = relationshipLabels.map(label => `${label}`);
            query = query.hasLabel(labels.join(','))
        }

        query = query.outV();

        return new Promise((resolve, reject) => {
            this.client.submit(translator.translate(query.getBytecode()))
                .then((result: driver.ResultSet) => {
                    resolve(Result.Success(result.toArray()))
                })
                .catch((err) => reject(err))
        })
    }

    public async outgoingByEdgeAndVertexType(id: string, relationshipLabel: string, ...vertexType: string[]): Promise<Result<Vertex[]>> {
        GremlinAdapter.escapeArguments(arguments);

        const translator = new process.Translator(this.g);
        translator.of('g');
        let query = this.g.V(`${id}`).outE().hasLabel(relationshipLabel);

        query = query.inV();
        if (vertexType.length > 0) {
            const labels = vertexType.map(label => `${label}`);
            query = query.hasLabel(labels.join(','))
        }

        return new Promise((resolve, reject) => {
            this.client.submit(translator.translate(query.getBytecode()))
                .then((result: driver.ResultSet) => {
                    resolve(Result.Success(result.toArray()))
                })
                .catch((err) => reject(err))
        })

    }

    public async incomingByEdgeAndVertexType(id: string, relationshipLabel: string, ...vertexType: string[]): Promise<Result<Vertex[]>> {
        GremlinAdapter.escapeArguments(arguments);

        const translator = new process.Translator(this.g);
        translator.of('g');
        let query = this.g.V(`${id}`).inE().hasLabel(relationshipLabel);

        query = query.outV();

        if (vertexType.length > 0) {
            const labels = vertexType.map(label => `${label}`);
            query = query.hasLabel(labels.join(','))
        }

        return new Promise((resolve, reject) => {
            this.client.submit(translator.translate(query.getBytecode()))
                .then((result: driver.ResultSet) => {
                    resolve(Result.Success(result.toArray()))
                })
                .catch((err) => reject(err))
        })
    }

    public async retrieveOutward(rootID: string, vertexID: string): Promise<Result<Vertex>> {
        GremlinAdapter.escapeArguments(arguments);
        // unfortunately CosmosDB does not accept list expressions. The translator
        // stumbles a bit on attempting to translate list expressions, so instead
        // of modifying the query into a big mess, or attempting to correct the
        // gremlin-javascript package, we're doing to do raw script submission
        const newQuery = `g.V('${rootID}').repeat(out()).until(hasId('${vertexID}'))`;

        return new Promise((resolve, reject) => {
            this.client.submit(newQuery)
                .then((result: driver.ResultSet) => {
                    if (result.toArray().length <= 0) reject('vertex does not exist');

                    resolve(Result.Success(result.first()))
                })
                .catch((err) => reject(err))
        })
    }

    /*
  permanentlyDeleteVertex drops a vertex element from the database. It differs
  from delete in that there is no way to recover the element afterward
  */
    public async permanentlyDeleteOutward(rootID: string, vertexID: string): Promise<Result<boolean>> {
        GremlinAdapter.escapeArguments(arguments);

        const newQuery = `g.V('${rootID}').repeat(out()).until(has('id', '${vertexID}')).drop()`;

        return new Promise((resolve, reject) => {
            this.client.submit(newQuery)
                .then(() => resolve(Result.Success(true)))
                .catch((err) => reject(err))
        })
    }
}
