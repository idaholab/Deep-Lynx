import {User} from '../../domain_objects/access_management/user';
import Logger from '../../services/logger';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerMapper from '../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import {expect} from 'chai';
import UserMapper from '../../data_access_layer/mappers/access_management/user_mapper';
import OAuthRepository from '../../data_access_layer/repositories/access_management/oauth_repository';
import {OAuthApplication} from '../../domain_objects/access_management/oauth/oauth';

describe('An OAuth Repository', async () => {
    let container: Container;
    let user: User;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping metatype tests, no mapper layer');
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
        await ContainerMapper.Instance.Delete(container.id!);
        return PostgresAdapter.Instance.close();
    });

    it('can save a new OAuthApplication', async () => {
        const repo = new OAuthRepository();
        const app = new OAuthApplication({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            owner: user,
        });

        let saved = await repo.save(app, user);
        expect(saved.isError).false;
        expect(app.id).not.undefined;

        // now update with new name
        const updatedName = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        app.name = updatedName;
        app.description = updatedDescription;

        saved = await repo.save(app, user);
        expect(saved.isError).false;
        expect(app.name).eq(updatedName);
        expect(app.description).eq(updatedDescription);

        return repo.delete(app);
    });

    it('can save a new OAuthApplication with no user', async () => {
        const repo = new OAuthRepository();
        const app = new OAuthApplication({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        let saved = await repo.save(app, user);
        expect(saved.isError).false;
        expect(app.id).not.undefined;

        // now update with new name
        const updatedName = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        app.name = updatedName;
        app.description = updatedDescription;

        saved = await repo.save(app, user);
        expect(saved.isError).false;
        expect(app.name).eq(updatedName);
        expect(app.description).eq(updatedDescription);

        return repo.delete(app);
    });

    // we need this ability for the initial oauth application script
    it('can save find an OAuthApplication with no user', async () => {
        const repo = new OAuthRepository();
        const app = new OAuthApplication({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        let saved = await repo.save(app, user);
        expect(saved.isError).false;
        expect(app.id).not.undefined;

        // now update with new name
        const updatedName = faker.name.findName();
        const updatedDescription = faker.random.alphaNumeric();
        app.name = updatedName;
        app.description = updatedDescription;

        saved = await repo.save(app, user);
        expect(saved.isError).false;
        expect(app.name).eq(updatedName);
        expect(app.description).eq(updatedDescription);

        const results = await repo.where().ownerID('is null').and().name('eq', app.name).list();
        expect(results.isError).false;
        expect(results.value.length).eq(1);

        return repo.delete(app);
    });
});
