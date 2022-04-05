import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../../services/logger';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import ReportMapper from '../../../../data_access_layer/mappers/data_warehouse/data/report_mapper';
import Report from '../../../../domain_objects/data_warehouse/data/report';
import MetatypeMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import exp from 'constants';

describe('A Report Mapper', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';

    const status_opts = ['processing', 'error', 'ready', 'completed']

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping report tests, no mapper layer');
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
        const mapper = ReportMapper.Instance;

        const report = await mapper.Create(
            'test suite',
            new Report({
                container_id: containerID,
                status: status_opts[Math.floor(Math.random() * status_opts.length)],
                status_message: faker.random.alphaNumeric(),
                notify_users: true
            }),
        );

        expect(report.isError).false;
        expect(report.value).not.empty;
        expect(report.value.status).to.be.oneOf(status_opts);

        return mapper.Delete(report.value.id!);
    });

    it('can be deleted', async () => {
        const mapper = ReportMapper.Instance;

        const report = await mapper.Create(
            'test suite',
            new Report({
                container_id: containerID,
                status: status_opts[Math.floor(Math.random() * status_opts.length)],
                status_message: faker.random.alphaNumeric(),
                notify_users: true
            }),
        );

        expect(report.isError).false;
        expect(report.value).not.empty;

        const deleted = await mapper.Delete(report.value.id!);
        expect(deleted.isError).false;

        return Promise.resolve();
    });

    it('can be retrieved from mapper', async () => {
        const mapper = ReportMapper.Instance;

        const report = await mapper.Create(
            'test suite',
            new Report({
                container_id: containerID,
                status: status_opts[Math.floor(Math.random() * status_opts.length)],
                status_message: faker.random.alphaNumeric(),
                notify_users: true
            }),
        );

        expect(report.isError).false;
        expect(report.value).not.empty;

        const retrieved = await mapper.Retrieve(report.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(retrieved.value.id);

        return mapper.Delete(report.value.id!);
    });

    it('can be updated in mapper', async () => {
        const mapper = ReportMapper.Instance;

        const report = await mapper.Create(
            'test suite',
            new Report({
                container_id: containerID,
                status: status_opts[Math.floor(Math.random() * status_opts.length)],
                status_message: faker.random.alphaNumeric(),
                notify_users: true
            }),
        );

        expect(report.isError).false;
        expect(report.value).not.empty;

        const updatedStatus = status_opts[Math.floor(Math.random() * status_opts.length)];
        const updatedMessage = faker.random.alphaNumeric();

        report.value.status = updatedStatus;
        report.value.status_message = updatedMessage;

        const updateResult = await mapper.Update(report.value);
        expect(updateResult.isError).false;

        const retrieved = await mapper.Retrieve(report.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(report.value.id);
        expect(retrieved.value.status).eq(updatedStatus);
        expect(retrieved.value.status_message).eq(updatedMessage);

        return mapper.Delete(report.value.id!);
    });
});