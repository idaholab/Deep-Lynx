
import Logger from "../../logger";
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import ContainerStorage from "../../data_storage/container_storage";
import faker from "faker";
import {expect} from "chai";
import {UserT} from "../../types/user_management/userT";
import UserStorage from "../../data_storage/user_management/user_storage";
import UserContainerInviteStorage from "../../data_storage/user_management/user_container_invite_storage";
import {UserContainerInviteT} from "../../types/user_management/userContainerInviteT";

describe('A User Container Invite can', async() => {
    let containerID: string = process.env.TEST_CONTAINER_ID || "";
    let userID: string

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping metatype tests, no storage layer");
            this.skip()
        }

        await PostgresAdapter.Instance.init();
        const storage = ContainerStorage.Instance;

        const container = await storage.Create("test suite", {
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric()
        });

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value[0].id!;

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
        const storage = UserContainerInviteStorage.Instance

        const invite = await storage.Create(userID,containerID, {
            email: faker.internet.email(),
            container_id: containerID,
            role: "admin"
        } as UserContainerInviteT)

        expect(invite.isError).false

        const invites = await storage.InvitesByUser(userID, containerID)

        expect(invites.isError).false
        expect(invites.value).not.empty

        for(const invite of invites.value) {
            await storage.PermanentlyDelete(invite.id!)
        }

        return Promise.resolve()
    })
})
