import {User} from '../../domain_objects/access_management/user';
import Logger from '../../services/logger';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerMapper from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import {expect} from 'chai';
import UserMapper from '../../data_access_layer/mappers/access_management/user_mapper';
import EventActionRepository from '../../data_access_layer/repositories/event_system/event_action_repository';
import EventAction from '../../domain_objects/event_system/event_action';

describe('An Event Action Repository', async () => {
    let container: Container;
    let user: User;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping event action tests, no mapper layer');
            this.skip();
        }
        await PostgresAdapter.Instance.init();
        const mapper = ContainerMapper.Instance;

        const created = await mapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        const userResult = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                admin: true,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                password: faker.random.alphaNumeric(12),
                roles: ['superuser'],
            }),
        );

        expect(userResult.isError).false;
        expect(userResult.value).not.empty;
        user = userResult.value;

        expect(created.isError).false;
        expect(created.value.id).not.null;
        container = created.value;

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        await ContainerMapper.Instance.Delete(container.id!);
        return PostgresAdapter.Instance.close();
    });

    it('can save an Event Action', async () => {
        const repo = new EventActionRepository();
        const action = new EventAction({
            containerID: container.id,
            eventType: 'data_source_created',
            actionType: 'default',
            destination: 'url_here',
        });

        let saved = await repo.save(action, user);
        expect(saved.isError).false;
        expect(action.id).not.undefined;

        // now update
        const config = {test: 'config'};
        action.action_config = config;

        saved = await repo.save(action, user);
        expect(saved.isError).false;
        expect(action.action_config).eql(config);

        return repo.delete(action);
    });
});
