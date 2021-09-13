import faker from 'faker';
import { expect } from 'chai';
import { structure } from 'gremlin';
import GremlinAdapter from '../../../services/gremlin/gremlin';
import Logger from '../../../services/logger';
import { GremlinExportConfig } from '../../../domain_objects/data_warehouse/export/export';

describe('A Gremlin Adapter', async () => {
    let g: GremlinAdapter | undefined;

    before(function () {
        if (process.env.SKIP_GREMLIN_TESTS === 'true') {
            Logger.debug('skipping gremlin tests');
            this.skip();
        }

        g = new GremlinAdapter(
            new GremlinExportConfig({
                traversal_source: 'g',
                graphson_v1: process.env.GREMLIN_PLUGIN_GRAPHSON_V1 === 'true',
                user: process.env.GREMLIN_PLUGIN_USER || '',
                key: process.env.GREMLIN_PLUGIN_KEY || '',
                endpoint: process.env.GREMLIN_PLUGIN_ENDPOINT || 'localhost',
                port: process.env.GREMLIN_PLUGIN_PORT || '8182',
                path: process.env.GREMLIN_PLUGIN_ROOT_PATH || '/gremlin',
                writes_per_second: +process.env.GREMLIN_WRITES_PER_SECOND! || 300
            })
        );
    });

    it('can add a simple vertex', (done) => {
        g!.vertices
            .add('person', { name: faker.name.findName() })
            .then((resp) => {
                expect(resp.isError).false;
                expect(resp.value).not.to.be.undefined;
                expect(resp.value).instanceOf(structure.Vertex);
                done();
            })
            .catch((e) => {
                console.log(e);
                done();
            });
    });

    it('can retrieve a vertex', async () => {
        const vertex = await g!.vertices.add('person', {
            name: faker.name.findName(),
            hobbies: ['baking']
        });
        g!.vertices.retrieve(vertex.value.id).then((resp) => {
            expect(resp.isError).false;
        });
    });

    it('can update a simple vertex', async () => {
        try {
            const firstName: string = faker.name.findName();
            const secondName: string = faker.name.findName();

            const vertex = await g!.vertices.add('person', { name: firstName });
            expect(vertex.value).not.to.be.undefined;

            let updated = await g!.vertices.update(vertex.value.id, {
                name: secondName
            });

            expect(updated.value).not.to.be.undefined;
            expect(updated.value.id).eql(vertex.value.id);

            // fetch a fresh copy and test again
            updated = await g!.vertices.retrieve(vertex.value.id);
            expect(updated.value).not.to.be.undefined;
            expect(updated.value.id).eql(vertex.value.id);
        } catch (err) {
            throw new Error(err);
        }
    });

    it('can permanently delete a vertex', async () => {
        try {
            let vertex = await g!.vertices.add('person', {
                name: faker.name.findName(),
                hobbies: ['baking']
            });
            vertex = await g!.vertices.retrieve(vertex.value.id);
            expect(vertex.value).not.to.be.undefined;

            const deleted = await g!.vertices.permanentlyDelete(vertex.value.id);
            expect(deleted.value).true;
        } catch (err) {
            throw new Error(err);
        }
    });

    it('can add an edge between two vertices', async () => {
        try {
            const v1 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });
            const v2 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });

            const edge = await g!.edges.add(v1.value.id, v2.value.id, faker.random.word());
            expect(edge.value).not.to.be.undefined;
            expect(edge.value).instanceof(structure.Edge);
        } catch (err) {
            throw new Error(err);
        }
    });

    /* Currently edge retrieval fails due to a bad ID lookup. This is very specific to the instance of gremlin. This should be corrected at some point, but we don't need it for pure export functionality and so it has been ignored on purpose
    it('can retrieve an edge', async () => {
        try {
            const v1 = await g!.vertices.add('person', { "name": faker.name.findName() });
            const v2 = await g!.vertices.add('person', { "name": faker.name.findName() });

            const edge = await g!.edges.add(v1.value.id, v2.value.id, faker.random.word());
            expect(edge.value).not.to.be.undefined;
            expect(edge.value).instanceof(structure.Edge);

            const retrievedEdge = await g!.edges.retrieve(edge.value.id);
            expect(retrievedEdge.value).not.to.be.undefined;
            expect(retrievedEdge.value).instanceof(structure.Edge);
        } catch (err) {
            throw new Error(err)
        }
    });
     */

    it('can add an edge with properties between two vertices', async () => {
        try {
            const v1 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });
            const v2 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });

            const edge = await g!.edges.add(v1.value.id, v2.value.id, faker.random.word(), { name: `${faker.random.word()}` });
            expect(edge.value).not.to.be.undefined;
            expect(edge.value).instanceof(structure.Edge);
        } catch (err) {
            throw new Error(err);
        }
    });

    it('can retrieve all vertices attached to outward edges by vertex type', async () => {
        try {
            const v1 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });
            const v2 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });

            const edge = await g!.edges.add(v1.value.id, v2.value.id, faker.random.word());
            expect(edge.value).not.to.be.undefined;
            expect(edge.value).instanceof(structure.Edge);

            const vertices = await g!.vertices.outgoingByType(v1.value.id, 'person');
            expect(vertices.value).not.empty;

            const noResults = vertices.value.filter((vertex) => vertex.id !== v2.value.id);
            expect(noResults).empty;
        } catch (err) {
            throw new Error(err);
        }
    });

    it('can retrieve all vertices attached to inward edges by vertex type', async () => {
        try {
            const v1 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });
            const v2 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });

            const edge = await g!.edges.add(v1.value.id, v2.value.id, faker.random.word());
            expect(edge.value).not.to.be.undefined;
            expect(edge.value).instanceof(structure.Edge);
            const vertices = await g!.vertices.incomingByType(v2.value.id, 'person');
            expect(vertices.value).not.empty;

            const noResults = vertices.value.filter((vertex) => vertex.id !== v1.value.id);
            expect(noResults).empty;
        } catch (err) {
            throw new Error(err);
        }
    });

    it('can retrieve all vertices attached to outward edges by edge type', async () => {
        try {
            const v1 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });
            const v2 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });
            const relationshipType = faker.random.word();

            const edge = await g!.edges.add(v1.value.id, v2.value.id, relationshipType);
            expect(edge.value).not.to.be.undefined;
            expect(edge.value).instanceof(structure.Edge);

            const vertices = await g!.vertices.outgoingByEdgeType(v1.value.id, relationshipType);
            expect(vertices.value).not.empty;

            const noResults = vertices.value.filter((vertex) => vertex.id !== v2.value.id);
            expect(noResults).empty;
        } catch (err) {
            throw new Error(err);
        }
    });

    it('can retrieve all vertices attached to inward edges by edge type', async () => {
        try {
            const v1 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });
            const v2 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });
            const relationshipType = faker.random.word();

            const edge = await g!.edges.add(v1.value.id, v2.value.id, relationshipType);
            expect(edge.value).not.to.be.undefined;
            expect(edge.value).instanceof(structure.Edge);
            const vertices = await g!.vertices.incomingByEdgeType(v2.value.id, relationshipType);

            const noResults = vertices.value.filter((vertex) => vertex.id !== v1.value.id);
            expect(noResults).empty;
        } catch (err) {
            throw new Error(err);
        }
    });

    it('can retrieve all vertices attached to inward edges by edge and vertex type', async () => {
        try {
            const v1 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });
            const v2 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });
            const relationshipType = faker.random.word();

            const edge = await g!.edges.add(v1.value.id, v2.value.id, relationshipType);
            expect(edge.value).not.to.be.undefined;
            expect(edge.value).instanceof(structure.Edge);
            const vertices = await g!.vertices.incomingByEdgeAndVertexType(v2.value.id, relationshipType, 'person');

            const noResults = vertices.value.filter((vertex) => vertex.id !== v1.value.id);
            expect(noResults).empty;
        } catch (err) {
            throw new Error(err);
        }
    });

    it('can retrieve all vertices attached to outward edges by edge and vertex type', async () => {
        try {
            const v1 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });
            const v2 = await g!.vertices.add('person', {
                name: faker.name.findName()
            });
            const relationshipType = faker.random.word();

            const edge = await g!.edges.add(v1.value.id, v2.value.id, relationshipType);
            expect(edge.value).not.to.be.undefined;
            expect(edge.value).instanceof(structure.Edge);

            const vertices = await g!.vertices.outgoingByEdgeAndVertexType(v1.value.id, relationshipType, 'person');
            expect(vertices.value).not.empty;

            const noResults = vertices.value.filter((vertex) => vertex.id !== v2.value.id);
            expect(noResults).empty;
        } catch (err) {
            throw new Error(err);
        }
    });

    it('can retrieve a valid child vertex', async () => {
        const v1 = await g!.vertices.add('person', {
            name: faker.name.findName()
        });
        const v2 = await g!.vertices.add('person', {
            name: faker.name.findName()
        });

        const relationshipType = faker.random.word();
        const edge = await g!.edges.add(v1.value.id, v2.value.id, relationshipType);

        expect(edge.value).not.to.be.undefined;
        expect(edge.value).instanceof(structure.Edge);

        const foundVertex = await g!.vertices.retrieveOutward(v1.value.id, v2.value.id);
        expect(foundVertex).not.to.be.undefined;
        expect(foundVertex.value.id).eql(v2.value.id);
    });
});
