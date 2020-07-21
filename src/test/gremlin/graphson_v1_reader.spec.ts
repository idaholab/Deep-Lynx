/* tslint:disable */
import { expect } from 'chai'
import { structure } from "gremlin"
import { GraphSONReaderV1 } from "../../data_storage/adapters/gremlin/graphson_v1_reader/reader"
import { GraphsonTestBodies } from "./graphson_test_bodies"

describe('When GraphSON v1.0 vertex data is parsed', () => {
    const reader = new GraphSONReaderV1();
    const example: any = GraphsonTestBodies.vertexGraphSONExample;

    let parsed = reader.read(example);

    it('is an instance of Vertex', () => {
        expect(parsed).instanceOf(structure.Vertex)
    });

    const vertex = parsed as structure.Vertex;
    it('has VertexProperties', () => {
        expect(vertex.properties).not.to.be.undefined
    });

    it('its VertexProperties also have properties if required', () => {
        // directly check second property
        let propertiesExist = false;
        if (vertex.properties !== undefined) {

            for (const property of vertex.properties) {
                if (property.properties && property.properties.length > 0) {
                    propertiesExist = true
                }
            }
        }

        expect(propertiesExist).to.be.true
    });

    it('its id and label should match the example', () => {
        expect(vertex.id).equal(example.id);
        expect(vertex.label).equal(example.label)
    });

    example.properties = undefined;

    it('parser should handle undefined properties', (done) => {
        try {
            parsed = reader.read(example)
        } catch (err) {
            done(new Error(err))
        }

        const vertex = parsed as structure.Vertex;
        expect(vertex.properties).to.be.empty;
        done()
    })
});

describe('When GraphSON v1.0 edge data is parsed', () => {
    const reader = new GraphSONReaderV1();
    const example = GraphsonTestBodies.edgeGraphSONExample;

    const parsed = reader.read(example);

    it('is an instance of Edge', () => {
        expect(parsed).instanceOf(structure.Edge)
    });

    const edge = parsed as structure.Edge;
    it('has an in and out vertex instance', () => {
        expect(edge.inV).instanceOf(structure.Vertex);
        expect(edge.outV).instanceOf(structure.Vertex)
    });

    it('matches the original example', () => {
        expect(edge.id).eql(example.id);
        expect(edge.label).eql(example.label);
        expect(edge.inV.id).eql(example.inV);
        expect(edge.outV.id).eql(example.outV);
        expect(edge.inV.label).eql(example.inVLabel);
        expect(edge.outV.label).eql(example.outVLabel)
    })
});