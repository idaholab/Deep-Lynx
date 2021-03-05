
import Logger from "../../logger";
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import faker from "faker";
import {expect} from "chai";
import {UserT} from "../../types/user_management/userT";
import UserStorage from "../../data_access_layer/mappers/user_management/user_storage";
import UserContainerInviteStorage from "../../data_access_layer/mappers/user_management/user_container_invite_storage";
import {UserContainerInviteT} from "../../types/user_management/userContainerInviteT";
import OAuthApplicationStorage from "../../data_access_layer/mappers/user_management/oauth_application_storage";

describe('A OAuth Application can', async() => {
    let userID: string

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping metatype tests, no storage layer");
            this.skip()
        }

        await PostgresAdapter.Instance.init();

        const user = await UserStorage.Instance.Create("test suite", (
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"],
                admin: false,
            } as UserT));

        expect(user.isError).false;
        expect(user.value).not.empty;
        userID = user.value.id!

        return Promise.resolve()
    });

    it('can be saved to storage', async() => {
        const storage = OAuthApplicationStorage.Instance

        const application = await storage.Create(userID, {
            name: faker.name.firstName(),
            description: faker.random.alphaNumeric()
        })

        expect(application.isError).false

        return storage.PermanentlyDelete(application.value.id!)
    })

    it('can be listed by user id', async() => {
        const storage = OAuthApplicationStorage.Instance

        const application = await storage.Create(userID, {
            name: faker.name.firstName(),
            description: faker.random.alphaNumeric()
        })

        expect(application.isError).false

        const applications = await storage.ListForUser(userID)

        expect(applications.isError).false
        expect(applications).not.empty

        return storage.PermanentlyDelete(application.value.id!)
    })

    it('can be marked approved for user', async() => {
        const storage = OAuthApplicationStorage.Instance

        const application = await storage.Create(userID, {
            name: faker.name.firstName(),
            description: faker.random.alphaNumeric()
        })

        expect(application.isError).false

        const approved = await storage.MarkApplicationApproved(application.value.id!, userID)

        expect(approved.isError).false

        const isApproved = await storage.ApplicationIsApproved(application.value.id!, userID)

        expect(isApproved.isError).false
        expect(isApproved.value).true

        return storage.PermanentlyDelete(application.value.id!)
    })
})
