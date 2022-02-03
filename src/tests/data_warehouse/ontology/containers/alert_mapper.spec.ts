import faker from 'faker';
import {expect} from 'chai';
import 'reflect-metadata';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerStorage from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Logger from '../../../../services/logger';
import Container, {ContainerAlert} from '../../../../domain_objects/data_warehouse/ontology/container';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import ContainerAlertMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_alert_mapper';

describe('A Container Alert Mapper', async () => {
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
        const mapper = ContainerAlertMapper.Instance;

        const alert = await mapper.Create(
            'test suite',
            new ContainerAlert({
                containerID,
                type: 'error',
                message: 'test error',
            }),
        );

        expect(alert.isError).false;
        expect(alert.value).not.empty;

        return mapper.Delete(alert.value.id!);
    });

    it('can be acknowledged', async () => {
        const mapper = ContainerAlertMapper.Instance;

        const alert = await mapper.Create(
            'test suite',
            new ContainerAlert({
                containerID,
                type: 'error',
                message: 'test error',
            }),
        );

        expect(alert.isError).false;
        expect(alert.value).not.empty;

        const acknowledged = await mapper.SetAcknowledged(alert.value.id!, 'tes suite');
        expect(acknowledged.isError).false;

        const unacked = await mapper.ListUnacknowledgedForContainer(containerID);
        expect(unacked.isError).false;
        expect(unacked.value.length).eq(0);

        return mapper.Delete(alert.value.id!);
    });
});
