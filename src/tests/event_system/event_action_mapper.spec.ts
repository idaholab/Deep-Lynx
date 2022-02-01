import Logger from '../../services/logger';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import faker from 'faker';
import {expect} from 'chai';
import ContainerStorage from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../domain_objects/data_warehouse/ontology/container';
import ContainerMapper from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import EventActionMapper from '../../data_access_layer/mappers/event_system/event_action_mapper';
import EventAction from '../../domain_objects/event_system/event_action';

describe('An Event Action Mapper Can', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping event action mapper tests, no storage layer');
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
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can update an event action', async () => {
        const storage = EventActionMapper.Instance;

        const action = await storage.Create(
            'test suite',
            new EventAction({
                containerID: containerID,
                eventType: 'data_source_created',
                actionType: 'send_query',
                destination: 'url_here',
            }),
        );
        expect(action.isError).false;
        expect(action.value).not.empty;

        const newDest = 'new_url';
        action.value.destination = newDest;

        const updateAction = await storage.Update('test suite', action.value);
        expect(updateAction.isError).false;
        expect(updateAction.value.destination).eq(newDest);

        const deleteAction = await storage.Delete(action.value.id!);
        expect(deleteAction.isError).false;

        return Promise.resolve();
    });
});
