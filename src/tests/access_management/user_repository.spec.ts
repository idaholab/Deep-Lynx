/* tslint:disable */
import {
    AssignUserRolePayload,
    ContainerUserInvite,
    KeyPair,
    ResetUserPasswordPayload,
    User
} from "../../access_management/user";
import Logger from "../../services/logger";
import PostgresAdapter from "../../data_access_layer/mappers/db_adapters/postgres/postgres";
import ContainerMapper from "../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import Container from "../../data_warehouse/ontology/container";
import faker from "faker";
import {expect} from "chai";
import UserRepository from "../../data_access_layer/repositories/access_management/user_repository";
import UserMapper from "../../data_access_layer/mappers/access_management/user_mapper";
import Config from "../../services/config"
import KeyPairMapper from "../../data_access_layer/mappers/access_management/keypair_mapper";

describe('A User Repository', async() => {
    let container: Container
    let user: User
    const testUser = () => {return new User(
        {
            identity_provider_id: faker.random.uuid(),
            identity_provider: "username_password",
            admin: false,
            display_name: faker.name.findName(),
            email: faker.internet.email(),
            password: faker.random.alphaNumeric(12),
            roles: ["superuser"]
        })}

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping metatype tests, no mapper layer");
            this.skip()
        }
        await PostgresAdapter.Instance.init();
        const mapper = ContainerMapper.Instance;

        const created = await mapper.Create("test suite", new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric()
        }));

        const userResult = await UserMapper.Instance.Create("test suite", new User(
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                admin: true,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                password: faker.random.alphaNumeric(12),
                roles: ["superuser"]
            }));

        expect(userResult.isError).false;
        expect(userResult.value).not.empty;
        user = userResult.value

        expect(created.isError).false;
        expect(created.value.id).not.null
        container = created.value

        return Promise.resolve()
    });

    after(async () => {
        await UserMapper.Instance.PermanentlyDelete(user.id!)
        return ContainerMapper.Instance.Delete(container.id!)
    })

    it('can save a User', async()=> {
        const repository = new UserRepository()
        const u = testUser()

        let results = await repository.save(u, user)
        expect(results.isError).false
        expect(u.id).not.undefined

        // now run an update
        const updatedName = faker.name.findName()
        const updatedEmail = faker.internet.email()
        u.email = updatedEmail
        u.display_name = updatedName

        results = await repository.save(u, user)
        expect(results.isError).false
        expect(u.display_name).eq(updatedName)
        expect(u.email).eq(updatedEmail)

        return repository.delete(u)
    })

    it('can save a User with Keys', async()=> {
        const repository = new UserRepository()
        const u = testUser()
        const keys = [
            new KeyPair(),
            new KeyPair()
        ]

        u.addKey(...keys)

        let results = await repository.save(u, user)
        expect(results.isError).false
        expect(u.id).not.undefined
        expect(u.keys).not.empty

        for(const key of u.keys!) {
            expect(key.secret).not.undefined
        }

        u.removeKey(keys[0])

        // now run an update
        const updatedName = faker.name.findName()
        const updatedEmail = faker.internet.email()
        u.email = updatedEmail
        u.display_name = updatedName

        results = await repository.save(u, user)
        expect(results.isError).false
        expect(u.display_name).eq(updatedName)
        expect(u.email).eq(updatedEmail)

        expect(u.keys?.length).eq(1)

        await KeyPairMapper.Instance.BulkDelete(keys)
        return repository.delete(u)
    })

    it('can initiate and complete a password reset for a User', async()=> {
        let repository = new UserRepository()

        let reset = await repository.initiateResetPassword(user.email)
        expect(reset.isError).false

        const check = await repository.findByID(user.id!)
        expect(check.isError).false
        expect(check.value.reset_token).not.undefined

        return repository.resetPassword(new ResetUserPasswordPayload({
            email: check.value.email,
            token: check.value.reset_token,
            newPassword: faker.random.alphaNumeric()
        }))
    })

    it('can assign roles to a User', async()=> {
        const repository = new UserRepository()

        let results = await repository.assignRole(user, new AssignUserRolePayload({
            userID: user.id!,
            containerID: container.id!,
            roleName: "editor"
        }))

        expect(results.isError).false

        // now fetch roles
        let roles = await repository.rolesInContainer(user, container.id!)
        expect(roles.isError).false
        expect(roles.value[0]).eq("editor")

        // remove and retest
        results = await repository.removeAllRoles(user, container.id!)
        expect(results.isError).false

        roles = await repository.rolesInContainer(user, container.id!)
        expect(roles.isError).false
        expect(roles.value.length).eq(0)

        return Promise.resolve()
    })

    it('can invite a User to a container', async()=> {
        const repository = new UserRepository()
        let u = testUser()

        let results = await repository.save(u, user)
        expect(results.isError).false
        expect(u.id).not.undefined

        let invite = new ContainerUserInvite({
            email: u.email,
            originUser: user,
            container
        })

        results = await repository.inviteUserToContainer(user,invite)
        expect(results.isError).false
        expect(invite.token).not.undefined

        // now we accept the invite
        results = await repository.acceptContainerInvite(u, invite.token!)
        expect(results.isError).false

        return Promise.resolve()
    })
})
