import {User} from '../../domain_objects/access_management/user';
import Logger from '../../services/logger';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerMapper from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import {expect} from 'chai';
import UserMapper from '../../data_access_layer/mappers/access_management/user_mapper';
import Event from '../../domain_objects/event_system/event';
import EventActionStatusRepository from '../../data_access_layer/repositories/event_system/event_action_status_repository';
import EventAction from '../../domain_objects/event_system/event_action';
import EventActionStatus from '../../domain_objects/event_system/event_action_status';
import EventActionMapper from '../../data_access_layer/mappers/event_system/event_action_mapper';

describe('An Event Action Status Repository', async () => {
    let container: Container;
    let user: User;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping event action status repository tests, no mapper layer');
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
        return ContainerMapper.Instance.Delete(container.id!);
    });

    it('can save an Event Action Status', async () => {
        const repo = new EventActionStatusRepository();
        const actionStorage = EventActionMapper.Instance;

        const action = await actionStorage.Create(
            'test suite',
            new EventAction({
                containerID: container.id,
                eventType: 'data_source_created',
                actionType: 'send_query',
                destination: 'url_here',
            }),
        );

        const status = new EventActionStatus({
            event: new Event({
                containerID: container.id,
                eventType: 'data_source_created',
                event: {id: 'testID'},
            }),
            eventActionID: action.value.id!,
        });

        let saved = await repo.save(status, user);
        expect(saved.isError).false;

        // now update
        const newMessage = 'Test status message';
        status.status_message = newMessage;

        saved = await repo.save(status, user);
        expect(saved.isError).false;
        expect(status.status_message).eq(newMessage);
    });
});
