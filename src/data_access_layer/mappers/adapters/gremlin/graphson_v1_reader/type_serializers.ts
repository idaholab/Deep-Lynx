/* tslint:disable */
// tslint does not like typing files
// tslint:disable-next-line:no-reference
/// <reference path="../../../../../typings/gremlin/index.d.ts" />
import { structure } from "gremlin";
import { GraphSONReaderV1 } from "./reader";

const idKey: string = 'id';
const labelKey: string = 'label';
const valueKey: string = 'value';

/**
 * Encompasses all serializers for supported types. Avoid using these classes directly.
 * Create a new GraphsonReaderV1 and use that instead.
 */
export namespace serializers {

    /**
     * We need to enforce the shape of the serializers that gremlin expects when
     * passed a custom reader or writer. At time of writing, no classes have or
     * should be using the serialize method as this application has no problems
     * sending GraphSON v2.0
     */
    export interface TypeSerializer {
        reader: GraphSONReaderV1
        serialize(item: any): object
        deserialize(item: any): any
        canBeUsedFor(item: any): boolean
    }

    export class EdgeSerializer implements TypeSerializer {
        reader: GraphSONReaderV1;
        constructor(reader: GraphSONReaderV1) {
            this.reader = reader
        }

        // unimplemented - we only need the function signature to satisfy gremlin
        serialize(item: any): object {
            throw new Error("Method not implemented.");
        }

        deserialize(item: any) {
            const inV: structure.Vertex = this.reader.read({ id: item.inV, label: item.inVLabel, type: 'vertex' });
            const outV: structure.Vertex = this.reader.read({ id: item.outV, label: item.outVLabel, type: 'vertex' });

            const serialized: structure.Edge = new structure.Edge(0, outV, item.label, inV);

            const rawProperties: any = item.properties;
            const properties: any = Array();

            if (rawProperties !== undefined) {
                for (const [name, value] of Object.entries(rawProperties)) {
                    properties.push(this.reader.read({ name, value }, 'property') as structure.Property)
                }
            }

            if (properties.length > 0) { serialized.properties = properties }
            serialized.id = item.id;

            return serialized
        }
        canBeUsedFor(item: any): boolean {
            return (item instanceof structure.Edge)
        }
    }

    export class VertexSerializer implements TypeSerializer {
        public reader: GraphSONReaderV1;
        constructor(reader: GraphSONReaderV1) {
            this.reader = reader
        }

        public deserialize(item: any): structure.Vertex {
            // since we can't extend or override we must declare a garbage instance
            const serialized = new structure.Vertex(0, '');

            serialized.id = item[idKey];
            serialized.label = item[labelKey];

            // separate and parse properties on vertex
            if ('properties' in item) {
                const rawProperties: any = item.properties;
                const properties: any = Array();

                // we need to append the label of the property to each property name
                for (const propertyName in rawProperties) {
                    for (const property of rawProperties[propertyName]) {
                        property.label = propertyName;
                        properties.push(property)
                    }
                }

                serialized.properties = (this.reader.read(properties, 'vertexProperty') as structure.VertexProperty[])
            }

            return serialized
        }

        // unimplemented - we only need the function signature to satisfy gremlin
        public serialize(item: any): any {
            throw new Error("Method not implemented.");
        }

        public canBeUsedFor(item: any): boolean {
            return (item instanceof structure.Vertex);
        }
    }

    export class VertexPropertySerializer implements TypeSerializer {
        public reader: GraphSONReaderV1;
        constructor(reader: GraphSONReaderV1) {
            this.reader = reader
        }

        public canBeUsedFor(item: any): boolean {
            return (item instanceof structure.VertexProperty)
        }

        // unimplemented - we only need the function signature to satisfy gremlin
        serialize(item: any): object {
            throw new Error("Method not implemented.");
        }

        deserialize(item: any): structure.VertexProperty {
            const serialized = new structure.VertexProperty(0, '', null);
            const rawProperties: any = item.properties;
            const properties: structure.Property[] = Array();

            if (rawProperties !== undefined) {
                for (const [name, value] of Object.entries(rawProperties)) {
                    properties.push(this.reader.read({ name, value }, 'property') as structure.Property)
                }
            }

            serialized.id = item[idKey];
            serialized.label = item[labelKey];
            serialized.value = item[valueKey];
            serialized.properties = properties;

            return serialized
        }

    }

    export class PropertySerializer implements TypeSerializer {
        reader: GraphSONReaderV1;
        constructor(reader: GraphSONReaderV1) {
            this.reader = reader
        }

        serialize(item: any): object {
            throw new Error("Method not implemented.");
        }
        deserialize(item: any) {
            return new structure.Property(
                item.name,
                item[valueKey])
        }
        canBeUsedFor(item: any): boolean {
            return (item instanceof structure.Property)
        }

    }
}
