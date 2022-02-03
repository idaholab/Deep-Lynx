import faker from 'faker';
import {expect} from 'chai';
import 'reflect-metadata';
import ChangelistMapper from '../../../../../data_access_layer/mappers/data_warehouse/ontology/versioning/changelist_mapper';
import PostgresAdapter from '../../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerMapper from '../../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Logger from '../../../../../services/logger';
import Container from '../../../../../domain_objects/data_warehouse/ontology/container';
import Changelist, {ChangelistApproval} from '../../../../../domain_objects/data_warehouse/ontology/versioning/changelist';
import ChangelistApprovalMapper from '../../../../../data_access_layer/mappers/data_warehouse/ontology/versioning/changelist_approval_mapper';

describe('A Changelist Approval Mapper', async () => {
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
        const mapper = ChangelistMapper.Instance;
        const approvalMapper = ChangelistApprovalMapper.Instance;

        const changelist = await mapper.Create(
            'test suite',
            new Changelist({
                container_id: containerID,
                name: 'Test Changelist',
                changelist: {test: 'test'},
            }),
        );

        expect(changelist.isError).false;
        expect(changelist.value).not.empty;

        const approval = await approvalMapper.Create(
            'test suite',
            new ChangelistApproval({
                changelist_id: changelist.value.id!,
                approver_id: 'test suite',
            }),
        );

        expect(approval.isError).false;
        expect(approval.value).not.empty;

        return mapper.Delete(changelist.value.id!);
    });

    it('can be listed for changelist', async () => {
        const mapper = ChangelistMapper.Instance;
        const approvalMapper = ChangelistApprovalMapper.Instance;

        const changelist = await mapper.Create(
            'test suite',
            new Changelist({
                container_id: containerID,
                name: 'Test Changelist',
                changelist: {test: 'test'},
            }),
        );

        expect(changelist.isError).false;
        expect(changelist.value).not.empty;

        const approval = await approvalMapper.Create(
            'test suite',
            new ChangelistApproval({
                changelist_id: changelist.value.id!,
                approver_id: 'test suite',
            }),
        );

        expect(approval.isError).false;
        expect(approval.value).not.empty;

        const approvals = await approvalMapper.ListForChangelist(changelist.value.id!);
        expect(approvals.isError).false;
        expect(approvals.value.length).eq(1);

        return mapper.Delete(changelist.value.id!);
    });
});
