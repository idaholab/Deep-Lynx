import { structure } from 'gremlin';

export class Vertex extends structure.Vertex {}

export class VertexProperty extends structure.VertexProperty {
    value: any;
    properties?: Property[];
}

export class Property extends structure.Property {}

export class Edge extends structure.Edge {}

// Extract the value for the first property to match the provided propertyName
export function ExtractVertexProperty(vertex: Vertex, propertyName: string): any {
    if (!vertex.properties) {
        return undefined;
    }

    for (const property of vertex.properties) {
        if (property.label === propertyName) {
            return property.value;
        }
    }
}

export function ExtractVertexPropertyObject(vertex: Vertex): object {
    if (!vertex.properties) {
        return {};
    }

    const out: { [k: string]: any } = {};

    for (const property of vertex.properties) {
        out[property.label] = property.value;
    }

    return out;
}
