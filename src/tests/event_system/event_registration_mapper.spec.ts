/* tslint:disable */
import Logger from "../../services/logger";
import PostgresAdapter from "../../data_access_layer/mappers/db_adapters/postgres/postgres";
import faker from "faker";
import {expect} from "chai";
import ContainerStorage from "../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import EventRegistrationMapper from "../../data_access_layer/mappers/event_system/event_registration_mapper";
import Container from "../../data_warehouse/ontology/container";
import ContainerMapper from "../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import EventRegistration from "../../event_system/event_registration";

describe('An Event Registration Mapper Can', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping registered events tests, no storage layer");
            this.skip()
        }

        await PostgresAdapter.Instance.init();
        let mapper = ContainerStorage.Instance;

        const container = await mapper.Create("test suite", new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()}));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;

        return Promise.resolve()
    });

    after(async function() {
        return ContainerMapper.Instance.Delete(containerID)
    })


    it('can update registered event', async()=> {
        const storage = EventRegistrationMapper.Instance;

        const event = await storage.Create("test suite", new EventRegistration({
            appName: "Daisy",
            appUrl: "yellow",
            eventType: "data_ingested"
        }));
        expect(event.isError).false;
        expect(event.value).not.empty;

        event.value.app_url = "yellow/flower"

        const updateEvent = await storage.Update("test suite", event.value);
        expect(updateEvent.isError).false;
        expect(updateEvent.value.app_url).eq("yellow/flower")

        return Promise.resolve()
    });
});
