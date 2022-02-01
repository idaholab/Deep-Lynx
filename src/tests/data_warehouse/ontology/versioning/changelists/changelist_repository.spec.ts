import faker from 'faker';
import {expect} from 'chai';
import 'reflect-metadata';
import ChangelistMapper from '../../../../../data_access_layer/mappers/data_warehouse/ontology/versioning/changelist_mapper';
import PostgresAdapter from '../../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerMapper from '../../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Logger from '../../../../../services/logger';
import Container from '../../../../../domain_objects/data_warehouse/ontology/container';
import Changelist from '../../../../../domain_objects/data_warehouse/ontology/versioning/changelist';
import ChangelistRepository from '../../../../../data_access_layer/repositories/data_warehouse/ontology/versioning/changelist_repository';
import {User} from '../../../../../domain_objects/access_management/user';
import UserMapper from '../../../../../data_access_layer/mappers/access_management/user_mapper';

describe('A Changelist Repository', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;

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

        let userResult = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ['superuser'],
            }),
        );

        expect(userResult.isError).false;
        expect(userResult.value).not.empty;
        user = userResult.value;

        return Promise.resolve();
    });

    after(async () => {
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can be saved', async () => {
        const repo = new ChangelistRepository();

        const changelist = new Changelist({
            container_id: containerID,
            name: 'Test Changelist',
            changelist: {test: 'test'},
        });

        const result = await repo.save(changelist, user);
        expect(result.isError).false;
        expect(changelist.id).not.undefined;

        return repo.delete(changelist);
    });

    it('can be updated', async () => {
        const repo = new ChangelistRepository();

        const changelist = new Changelist({
            container_id: containerID,
            name: 'Test Changelist',
            changelist: {test: 'test'},
        });

        let result = await repo.save(changelist, user);
        expect(result.isError).false;
        expect(changelist.id).not.undefined;

        changelist.name = 'Test Changelist 2';
        changelist.changelist = {bob: 'bob'};

        result = await repo.save(changelist, user);
        expect(result.isError).false;
        expect(changelist.id).not.undefined;

        const retrieved = await repo.findByID(changelist.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.name).eq('Test Changelist 2');

        return repo.delete(changelist);
    });
});
