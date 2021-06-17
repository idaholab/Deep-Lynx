import {serializers} from './type_serializers';

/**
 * This allows the user to parse GraphSON v1.0 encoded responses from gremlin.
 * This class can be passed as the `writer` argument in gremlin's client
 * or remote traversal constructors
 */
export class GraphSONReaderV1 {
    /**
     * Parses object into their respective gremlin types.
     */
    public read(obj: object, type?: string): any {
        if (obj === undefined) {
            return undefined;
        }

        if (obj === null) {
            return null;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => this.read(item, type));
        }

        let typeSerializer: string = obj['type' as keyof typeof obj];
        if (type) {
            typeSerializer = type;
        }

        if (SERIALIZERS[typeSerializer]) {
            const serializer = new SERIALIZERS[typeSerializer](this);
            return serializer.deserialize(obj);
        }

        if (obj && typeof obj === 'object' && obj.constructor === Object) {
            return this._deserializeObject(obj);
        }

        return obj;
    }

    private _deserializeObject(obj: any) {
        const keys = Object.keys(obj);
        const result = {} as any;
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let i = 0; i < keys.length; i++) {
            result[keys[i]] = this.read(obj[keys[i]]);
        }
        return result;
    }
}

/**
 * Dictionary for the available serializer types. These can be called manually
 * or based on the object being parsed.
 */
const SERIALIZERS: Record<string, any> = {
    edge: serializers.EdgeSerializer,
    vertex: serializers.VertexSerializer,
    vertexProperty: serializers.VertexPropertySerializer,
    property: serializers.PropertySerializer,
};
