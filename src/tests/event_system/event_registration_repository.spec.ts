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
import EventRegistrationRepository
    from "../../data_access_layer/repositories/event_system/event_registration_repository";
import EventRegistration from "../../event_system/event_registration";

describe('An Event Registration Repository', async() => {
    let container: Container
    let user: User

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

    it('can save an Event Registration', async()=>{
        const repo = new EventRegistrationRepository()
        const reg = new EventRegistration({
            appName: "Daisy",
            appUrl: "yellow",
            eventType: "data_ingested"
        })

        let saved = await repo.save(user, reg)
        expect(saved.isError).false
        expect(reg.id).not.undefined

        // now update
        const updatedName = faker.name.findName()
        const updatedURL = faker.internet.url()
        reg.app_name = updatedName
        reg.app_url = updatedURL

        saved = await repo.save(user, reg)
        expect(saved.isError).false
        expect(reg.app_name).eq(updatedName)
        expect(reg.app_url).eq(updatedURL)

        return repo.delete(reg)
    })
})
