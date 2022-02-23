import faker from 'faker';
import {expect} from 'chai';
import 'reflect-metadata';
import PostgresAdapter from '../../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerMapper from '../../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Logger from '../../../../../services/logger';
import Container from '../../../../../domain_objects/data_warehouse/ontology/container';
import OntologyVersion from '../../../../../domain_objects/data_warehouse/ontology/versioning/ontology_version';
import OntologyVersionMapper from '../../../../../data_access_layer/mappers/data_warehouse/ontology/versioning/ontology_version_mapper';

describe('An Ontology Version Mapper', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping metatype tests, no mapper layer');
            this.skip();
        }
        await PostgresAdapter.Instance.init();
        const mapper = ContainerMapper.Instance;

        const container = await mapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(container.isError).false;
        expect(container.value.id).not.null;
        containerID = container.value.id!;

        return Promise.resolve();
    });

    after(async () => {
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can save a record', async () => {
        const mapper = OntologyVersionMapper.Instance;

        const version = await mapper.Create(
            'test suite',
            new OntologyVersion({
                container_id: containerID,
                name: 'Test Version',
            }),
        );

        expect(version.isError).false;
        expect(version.value).not.empty;

        return mapper.Delete(version.value.id!);
    });

    it('can retrieve a record', async () => {
        const mapper = OntologyVersionMapper.Instance;

        const version = await mapper.Create(
            'test suite',
            new OntologyVersion({
                container_id: containerID,
                name: 'Test Version',
            }),
        );

        expect(version.isError).false;
        expect(version.value).not.empty;

        const retrieved = await mapper.Retrieve(version.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(version.value.id);

        return mapper.Delete(version.value.id!);
    });

    it('can set status', async () => {
        const mapper = OntologyVersionMapper.Instance;

        const version = await mapper.Create(
            'test suite',
            new OntologyVersion({
                container_id: containerID,
                name: 'Test Version',
            }),
        );

        expect(version.isError).false;
        expect(version.value).not.empty;

        const status = await mapper.SetStatus(version.value.id!, 'ready');
        expect(status.isError).false;

        const retrieved = await mapper.Retrieve(version.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(version.value.id);
        expect(retrieved.value.status).eq('ready');

        return mapper.Delete(version.value.id!);
    });

    it('can approve and revoke approval', async () => {
        const mapper = OntologyVersionMapper.Instance;

        const version = await mapper.Create(
            'test suite',
            new OntologyVersion({
                container_id: containerID,
                name: 'Test Version',
            }),
        );

        expect(version.isError).false;
        expect(version.value).not.empty;

        let approved = await mapper.Approve(version.value.id!, 'test suite');
        expect(approved.isError).false;

        let retrieved = await mapper.Retrieve(version.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(version.value.id);
        expect(retrieved.value.status).eq('approved');

        approved = await mapper.RevokeApproval(version.value.id!);
        expect(approved.isError).false;

        retrieved = await mapper.Retrieve(version.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(version.value.id);
        expect(retrieved.value.status).eq('rejected');

        return mapper.Delete(version.value.id!);
    });
});
