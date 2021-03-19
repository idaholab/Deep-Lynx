import Logger from "../../services/logger";
import PostgresAdapter from "../../data_access_layer/mappers/db_adapters/postgres/postgres";
import faker from "faker";
import {expect} from "chai";
import UserMapper from "../../data_access_layer/mappers/access_management/user_mapper";
import OAuthMapper from "../../data_access_layer/mappers/access_management/oauth_mapper";
import {User} from "../../access_management/user";
import {OAuthApplication} from "../../access_management/oauth/oauth";

describe('A OAuth Application can', async() => {
    let user: User

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping metatype tests, no storage layer");
            this.skip()
        }

        await PostgresAdapter.Instance.init();

        const created = await UserMapper.Instance.Create("test suite", new User(
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            }));

        expect(created.isError).false;
        expect(created.value).not.empty;
        user = created.value

        return Promise.resolve()
    });

    it('can be saved to storage', async() => {
        const storage = OAuthMapper.Instance

        const application = await storage.Create(user.id!, new OAuthApplication({
            name: faker.name.firstName(),
            description: faker.random.alphaNumeric(),
            owner: user.id!,
        }))

        expect(application.isError).false

        return storage.PermanentlyDelete(application.value.id!)
    })

    it('can be listed by user id', async() => {
        const storage = OAuthMapper.Instance

        const application = await storage.Create(user.id!, new OAuthApplication({
            name: faker.name.firstName(),
            description: faker.random.alphaNumeric()
        }))

        expect(application.isError).false

        const applications = await storage.ListForUser(user.id!)

        expect(applications.isError).false
        expect(applications).not.empty

        return storage.PermanentlyDelete(application.value.id!)
    })

    it('can be marked approved for user', async() => {
        const storage = OAuthMapper.Instance

        const application = await storage.Create(user.id!, new OAuthApplication({
            name: faker.name.firstName(),
            description: faker.random.alphaNumeric()
        }))

        expect(application.isError).false

        const approved = await storage.MarkApplicationApproved(application.value.id!, user.id!)

        expect(approved.isError).false

        const isApproved = await storage.ApplicationIsApproved(application.value.id!, user.id!)

        expect(isApproved.isError).false
        expect(isApproved.value).true

        return storage.PermanentlyDelete(application.value.id!)
    })
})
