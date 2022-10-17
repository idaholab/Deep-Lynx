import {User} from '../../../domain_objects/access_management/user';
import Logger from '../../../services/logger';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerStorage from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import {expect} from 'chai';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import DataTargetMapper from '../../../data_access_layer/mappers/data_warehouse/export/data_target_mapper';
import DataTargetRecord from '../../../domain_objects/data_warehouse/export/data_target';
import DataTargetRepository, {DataTargetFactory} from '../../../data_access_layer/repositories/data_warehouse/export/data_target_repository';
import HttpDataTargetImpl from '../../../interfaces_and_impl/data_warehouse/export/http_data_target_impl';

// some general tests on data targets that aren't specific to the implementation
describe('A Datatarget Repository can', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;
    let dataTarget: HttpDataTargetImpl | undefined;
    let mappingID: string;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping export tests');
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

        // we're going to build at least one data target from scratch before
        // so that tests can use this instead of building their own if they can
        const exp = await DataTargetMapper.Instance.Create(
            'test suite',
            new DataTargetRecord({
                container_id: containerID,
                name: 'Test Data Target',
                active: false,
                adapter_type: 'http',
                data_format: 'json',
            }),
        );

        expect(exp.isError).false;
        dataTarget = new DataTargetFactory().fromDataTargetRecord(exp.value);

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can set and review status', async () => {
        // build the data target first
        const targetRepo = new DataTargetRepository();

        const target = new DataTargetFactory().fromDataTargetRecord(
            new DataTargetRecord({
                container_id: containerID,
                name: 'Test Data Target',
                active: false,
                adapter_type: 'http',
                data_format: 'json',
            }),
        );

        let results = await targetRepo.save(target!, user);
        expect(results.isError).false;
        expect(target!.DataTargetRecord?.id).not.undefined;

        const set = await targetRepo.setStatus(target!, user, 'error', 'test error');
        expect(set.isError).false;

        const retrieved = await targetRepo.findByID(target?.DataTargetRecord?.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.DataTargetRecord).not.undefined;
        expect(retrieved.value.DataTargetRecord?.status).eq('error');
        expect(retrieved.value.DataTargetRecord?.status_message).eq('test error');

        return targetRepo.delete(target!, {force: true});
    });
});

const test_payload = {
    test: 'test',
};
