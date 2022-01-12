import Logger from '../../services/logger';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import faker from 'faker';
import {expect} from 'chai';
import ContainerStorage from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../domain_objects/data_warehouse/ontology/container';
import ContainerMapper from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import EventMapper from '../../data_access_layer/mappers/event_system/event_mapper';
import Event from '../../domain_objects/event_system/event';

describe('An Event Mapper Can', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping event mapper tests, no storage layer');
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

    it('can create an event', async () => {
        const storage = EventMapper.Instance;

        const event = await storage.Create(
            'test suite',
            new Event({
                containerID: containerID,
                eventType: 'data_source_created',
                event: {'id': 'testID'},
            }),
        );
        expect(event.isError).false;
        expect(event.value).not.empty;

        const deleteEvent = await storage.Delete(event.value.id!);
        expect(deleteEvent.isError).false;

        return Promise.resolve();
    });

    it('can set an event processed', async () => {
        const storage = EventMapper.Instance;

        const event = await storage.Create(
            'test suite',
            new Event({
                containerID: containerID,
                eventType: 'data_source_created',
                event: {'id': 'testID'},
            }),
        );
        expect(event.isError).false;
        expect(event.value).not.empty;

        const retrieved = await storage.Retrieve(event.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        const processed = await storage.SetProcessed(event.value.id!)
        expect(processed.isError).false;

        const deleteEvent = await storage.Delete(event.value.id!);
        expect(deleteEvent.isError).false;

        return Promise.resolve();
    });
});
