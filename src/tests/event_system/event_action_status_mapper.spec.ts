import Logger from '../../services/logger';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import faker from 'faker';
import {expect} from 'chai';
import ContainerStorage from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../domain_objects/data_warehouse/ontology/container';
import ContainerMapper from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Event from '../../domain_objects/event_system/event';
import EventActionStatusMapper from '../../data_access_layer/mappers/event_system/event_action_status_mapper';
import EventActionStatus from '../../domain_objects/event_system/event_action_status';
import EventActionMapper from '../../data_access_layer/mappers/event_system/event_action_mapper';
import EventAction from '../../domain_objects/event_system/event_action';

describe('An Event Action Status Mapper Can', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping event action status mapper tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();
        const mapper = ContainerStorage.Instance;

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
        return ContainerMapper.Instance.Delete(containerID);
    });

    it('can update an event action status', async () => {
        const storage = EventActionStatusMapper.Instance;
        const actionStorage = EventActionMapper.Instance;

        const action = await actionStorage.Create(
            'test suite',
            new EventAction({
                containerID: containerID,
                eventType: 'data_source_created',
                actionType: 'send_query',
                destination: 'url_here',
            }),
        );

        const status = await storage.Create(
            'test suite',
            new EventActionStatus({
                event: new Event({
                    containerID: containerID,
                    eventType: 'data_source_created',
                    event: {id: 'testID'},
                }),
                eventActionID: action.value.id!,
            }),
        );
        expect(status.isError).false;
        expect(status.value).not.empty;

        const newStatus = 'completed';
        const newMessage = 'Updated test status';
        status.value.status = newStatus;
        status.value.status_message = newMessage;

        const saved = await storage.Update('test suite', status.value);
        expect(saved.isError).false;
        expect(saved.value.status).eq(newStatus);
        expect(saved.value.status_message).eq(newMessage);

        return Promise.resolve();
    });
});
