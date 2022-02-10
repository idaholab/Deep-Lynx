import faker from 'faker';
import {expect} from 'chai';
import 'reflect-metadata';
import PostgresAdapter from '../../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerMapper from '../../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Logger from '../../../../../services/logger';
import Container from '../../../../../domain_objects/data_warehouse/ontology/container';
import OntologyVersion from '../../../../../domain_objects/data_warehouse/ontology/versioning/ontology_version';
import OntologyVersionRepository from '../../../../../data_access_layer/repositories/data_warehouse/ontology/versioning/ontology_version_repository';
import {User} from '../../../../../domain_objects/access_management/user';
import UserMapper from '../../../../../data_access_layer/mappers/access_management/user_mapper';

describe('An Ontology Version Repo', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;

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

        let userResult = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                admin: true,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ['superuser'],
            }),
        );

        expect(userResult.isError).false;
        expect(userResult.value).not.empty;
        user = userResult.value;

        return Promise.resolve();
    });

    after(async () => {
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can save a record', async () => {
        const repo = new OntologyVersionRepository();

        const version = new OntologyVersion({
            container_id: containerID,
            name: 'Test Version',
        });

        const saved = await repo.save(version, user);

        expect(saved.isError).false;
        expect(version.id).not.empty;

        return repo.delete(version);
    });

    it('can retrieve a record', async () => {
        const repo = new OntologyVersionRepository();

        const version = new OntologyVersion({
            container_id: containerID,
            name: 'Test Version',
        });

        const saved = await repo.save(version, user);

        expect(saved.isError).false;
        expect(version.id).not.empty;

        const retrieved = await repo.findByID(version.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(version.id);

        return repo.delete(version);
    });

    it('can approve and revoke approval of a record', async () => {
        const repo = new OntologyVersionRepository();

        const version = new OntologyVersion({
            container_id: containerID,
            name: 'Test Version',
        });

        const saved = await repo.save(version, user);

        expect(saved.isError).false;
        expect(version.id).not.empty;

        let approved = await repo.approve(version.id!, user, containerID);
        expect(approved.isError).false;

        let retrieved = await repo.findByID(version.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(version.id);
        expect(retrieved.value.status).eq('approved');

        approved = await repo.revokeApproval(version.id!);
        expect(approved.isError).false;

        retrieved = await repo.findByID(version.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(version.id);
        expect(retrieved.value.status).eq('rejected');

        return repo.delete(version);
    });
});
