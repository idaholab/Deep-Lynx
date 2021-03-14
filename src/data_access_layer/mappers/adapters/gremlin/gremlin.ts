import {Logger} from "../../../../services/logger"

import {driver, process} from "gremlin"
import Vertices from './vertices';
import Edges from "./edges";
import {GraphSONReaderV1} from "./graphson_v1_reader/reader";
import {GremlinConfigT} from "../../../../types/export/gremlinConfigT";

const traversal = process.AnonymousTraversalSource.traversal;

// If using the adapter with CosmosDB, check currently supported stepsc
// https://docs.microsoft.com/en-us/azure/cosmos-db/gremlin-support
export default class GremlinAdapter {
    public vertices: Vertices;
    public edges: Edges;
    public g: process.GraphTraversalSource;
    private logger!: Logger;
    private client: driver.Client;



    public attachLogger(logger?: Logger) {
        if (logger) this.logger = logger
    }

    public constructor(config: GremlinConfigT) {
        const internalConfig: any = {};

        internalConfig.traversalsource = config.traversal_source;

        if(config.mime_type) internalConfig.mimeType = config.mime_type;

        if (config.graphson_v1) {
            const reader = new GraphSONReaderV1();
            internalConfig.mimeType = "application/vnd.gremlin-v2.0+json";
            internalConfig.reader = reader
        }

        if (config.user !== '' && config.key !== '') {
            const authenticator = new driver.auth.PlainTextSaslAuthenticator(config.user, config.key);
            internalConfig.rejectUnauthorized = true;

            internalConfig.authenticator = authenticator
        }

        // unfortunately we can't get away from declaring both a traversal and a
        // client. We're doing this because somewhere along the line we will want
        // to switch from script submission to byte code
        this.g = traversal().withRemote(
            new driver.DriverRemoteConnection(
                `ws://${config.endpoint}:${config.port}${config.path}`, internalConfig));

        this.client = new driver.Client(
            `ws://${config.endpoint}:${config.port}${config.path}`, internalConfig);

        this.vertices = new Vertices(this.g, this.client);
        this.edges = new Edges(this.g, this.client)
    }



    // because string escaping rules could very by adapter, I've decided that
    // functionality related to escaping should be done at the adapter level
    // this means that some of code is a little prolific
   public static escapeArguments(args: IArguments): void {
        for (const key in args) {
            if (typeof args[key] === 'string') {
                args[key] = GremlinAdapter.escape(args[key]);
                continue
            }

            if (typeof args[key] === 'object') {
                for (const objectKey in args[key]) {
                    if (typeof args[key][objectKey] === 'string') {
                        args[key][objectKey] = GremlinAdapter.escape(args[key][objectKey])
                    }
                }
            }
        }
    }

    public static escape(input: string): string {
        return (input + '')
            .replace(/[\\"']/g, '\\$&')
            .replace(/\u0000/g, '\\0')
    }

    public static toGremlinProperties(g: process.GraphTraversal, input: any): process.GraphTraversal {
        for (const key in input) {
            if (input.hasOwnProperty(key)) {
                if (typeof input[key] === 'object') {
                    g = g.property(key, JSON.stringify(input[key]));
                    continue
                }

                g = g .property(key, `${input[key]}`)
            }
        }

        return g;
    }
}
