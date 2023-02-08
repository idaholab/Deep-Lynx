// Domain Objects
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import Tag from '../../../../domain_objects/data_warehouse/data/tag';
import {User} from '../../../../domain_objects/access_management/user';

// Mappers
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import ContainerStorage from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';

// Repository
import TagRepository from '../../../../../src/data_access_layer/repositories/data_warehouse/data/tag_repository';

// Services
import Logger from '../../../../services/logger';

// Testing
import faker from 'faker';
import {expect} from 'chai';

describe('A tag repository can', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;

    const cMapper = ContainerStorage.Instance;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping export tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();

        // Create the Container
        const container = await cMapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(container.isError).false;
        expect(container.value.id).not.null;
        containerID = container.value.id!;

        // Create a user
        const userResult = await UserMapper.Instance.Create(
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
        return PostgresAdapter.Instance.close();
    });

    it('can save a tag', async () => {
        const tagRepo = new TagRepository();

        const tag = new Tag({
            tag_name: faker.name.findName(),
            container_id: containerID,
            metadata: {
                metadata: "metadata"
            }
        });

        let saved = await tagRepo.save(tag, user);
        expect(saved.isError).false;
        expect(saved.value).true;

    });
})