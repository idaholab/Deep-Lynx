import * as gremlin from 'gremlin';

// The @types/gremlin package is out of date and/or incomplete. This file allows
// us to extend the gremlin types package so that Typescript can provide adequate
// typing information and linting. PLEASE VERIFY THAT THE ORIGINAL PACKAGE CONTAINS
// THE BEHAVIOR YOU'RE ATTEMPTING TO ADD.
declare module 'gremlin' {
    export namespace driver {
        // auth was originally undeclared and its functions included in the driver namespace
        // however, the original gremlin package has the auth functions in a sub-folder of
        // driver, and as such must be declared as a nested namespace.
    }

    export namespace process {
        interface Traverser {
            object: any;
        }

        interface Translator {
            of(traversalSource: string): void;
        }
    }

    export namespace structure {
        // CosmosDB returns an uuid for the ID field, not an integer. I've overridden
        // each return object type I'm currently using with the id field. Keep in mind
        // that you can't override constructors from within this file. If you need
        // that behavior, you'll have to find a better solution
        interface Element {
            id: string;
            label: string;
            value: any;
        }

        interface Vertex {
            id: string;
            label: string;
            properties?: VertexProperty[];
        }

        interface Edge {
            id: string;
            label: string;
            inV: Vertex;
            outV: Vertex;
            properties?: Property[];
        }

        interface VertexProperty {
            id: string;
            label: string;
            value: any;
            properties?: Property[];
        }

        interface Property {
            key: string;
            value: any;
        }

        // io suffered from the same problem as the auth package, the matching functionality
        // lived in a sub-folder in process. Declaring the functions in a nested namespace
        // solves this problem.
        namespace io {
            // these types are only needed if you're using the GraphSON v1 reader/writer
            // directly. You shouldn't need these declarations if you've decided to brave the NPM package.
            class GraphSONReader {
                constructor(options?: any);
                read(obj: any): any;
            }

            class GraphSONWriter {
                constructor(options?: any);
                adaptObject(value: any): any;
                write(obj: any): string;
            }

            class TypeSerializer {}

            class VertexSerializer extends TypeSerializer {
                deserialize(obj: any): structure.Vertex;
                serialize(item: structure.Vertex): any;
                canBeUsedFor(value: object): boolean;
            }
        }
    }
}
