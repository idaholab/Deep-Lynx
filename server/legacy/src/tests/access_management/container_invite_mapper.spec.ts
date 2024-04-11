import Logger from '../../services/logger';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerStorage from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import ContainerMapper from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import faker from 'faker';
import { expect } from 'chai';
import UserMapper from '../../data_access_layer/mappers/access_management/user_mapper';
import ContainerUserInviteMapper from '../../data_access_layer/mappers/access_management/container_user_invite_mapper';
import Container from '../../domain_objects/data_warehouse/ontology/container';
import { User, ContainerUserInvite } from '../../domain_objects/access_management/user';

const UIDGenerator = require('uid-generator');
const uidgen = new UIDGenerator();

describe('A User Container Invite can', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping metatype tests, no storage layer');
            this.skip();
        }
        await PostgresAdapter.Instance.init();
        const mapper = ContainerStorage.Instance;

        const container = await mapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric()
            })
        );

        expect(container.isError).false;
        expect(container.value.id).not.null;
        containerID = container.value.id!;

        const created = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ['superuser'],
                admin: false
            })
        );

        expect(created.isError).false;
        expect(created.value).not.empty;
        user = created.value;

        return Promise.resolve();
    });

    after(async () => {
        await ContainerMapper.Instance.Delete(containerID);
        await UserMapper.Instance.Delete(user.id!);
        return PostgresAdapter.Instance.close();
    });

    it('can be saved to storage', async () => {
        const storage = ContainerUserInviteMapper.Instance;
        const token = await uidgen.generate();

        const invite = await storage.Create(
            new ContainerUserInvite({
                email: faker.internet.email(),
                container: containerID!,
                originUser: user,
                token
            })
        );

        expect(invite.isError).false;

        const invites = await storage.InvitesByUser(user.id!, containerID);

        expect(invites.isError).false;
        expect(invites.value).not.empty;

        for (const invite of invites.value) {
            await storage.Delete(invite.id!);
        }

        return Promise.resolve();
    });
});
