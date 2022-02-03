import faker from 'faker';
import {expect} from 'chai';
import 'reflect-metadata';
import ChangelistMapper from '../../../../../data_access_layer/mappers/data_warehouse/ontology/versioning/changelist_mapper';
import PostgresAdapter from '../../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerMapper from '../../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Logger from '../../../../../services/logger';
import Container from '../../../../../domain_objects/data_warehouse/ontology/container';
import Changelist from '../../../../../domain_objects/data_warehouse/ontology/versioning/changelist';

describe('A Changelist Mapper', async () => {
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

    it('can be saved to mapper', async () => {
        const mapper = ChangelistMapper.Instance;

        const changelist = await mapper.Create(
            'test suite',
            new Changelist({
                container_id: containerID,
                name: 'Test Changelist',
                changelist: {test: 'test'},
            }),
        );

        expect(changelist.isError).false;
        expect(changelist.value).not.empty;

        return mapper.Delete(changelist.value.id!);
    });

    // this tests more than one function
    it('can have its status changed', async () => {
        const mapper = ChangelistMapper.Instance;

        const changelist = await mapper.Create(
            'test suite',
            new Changelist({
                container_id: containerID,
                name: 'Test Changelist',
                changelist: {test: 'test'},
            }),
        );

        expect(changelist.isError).false;
        expect(changelist.value).not.empty;

        let retrieved = await mapper.Retrieve(changelist.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).not.undefined;
        expect(retrieved.value.status).eq('pending');

        const result = await mapper.SetStatus(retrieved.value.id!, 'test suite', 'approved');
        expect(result.isError).false;

        retrieved = await mapper.Retrieve(changelist.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).not.undefined;
        expect(retrieved.value.status).eq('approved');

        return mapper.Delete(changelist.value.id!);
    });
});
