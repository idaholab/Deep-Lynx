/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import MetatypeMapper from "../../data_access_layer/mappers/metatype_mapper";
import Logger from "../../logger";
import ContainerMapper from "../../data_access_layer/mappers/container_mapper";
import Container from "../../data_warehouse/ontology/container";
import Metatype from "../../data_warehouse/ontology/metatype";

describe('A Metatype', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping metatype tests, no mapper layer");
           this.skip()
       }
        await PostgresAdapter.Instance.init();
        let mapper = ContainerMapper.Instance;

        const container = await mapper.Create("test suite", new Container(faker.name.findName(), faker.random.alphaNumeric()));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;

        return Promise.resolve()
    });

    it('can be saved to mapper', async()=> {
        let mapper = MetatypeMapper.Instance;

        const metatype = await mapper.Create(containerID, "test suite",
            new Metatype(faker.name.findName(), faker.random.alphaNumeric()));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        return mapper.PermanentlyDelete(metatype.value.id!)
    });

    it('can be batch saved', async()=> {
        let mapper = MetatypeMapper.Instance;

        const metatype = await mapper.Create(containerID, "test suite",
            new Metatype(faker.name.findName(), faker.random.alphaNumeric()));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        return mapper.PermanentlyDelete(metatype.value.id!)
    });

    it('can be retrieved from  mapper', async()=> {
        let mapper = MetatypeMapper.Instance;

        const metatype = await mapper.Create(containerID, "test suite",
            new Metatype(faker.name.findName(), faker.random.alphaNumeric()));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let retrieved = await mapper.Retrieve(metatype.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(metatype.value.id);

        return mapper.PermanentlyDelete(metatype.value.id!)
    });

    it('can be listed from mapper', async()=> {
        let mapper = MetatypeMapper.Instance;

        const metatype = await mapper.Create(containerID, "test suite",
            new Metatype(faker.name.findName(), faker.random.alphaNumeric()));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let retrieved = await mapper.List(containerID, 0, 100);
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        return mapper.PermanentlyDelete(metatype.value.id!)
    });

    it('can be updated in mapper', async()=> {
        let mapper = MetatypeMapper.Instance;

        const metatype = await mapper.Create(containerID, "test suite",
            new Metatype(faker.name.findName(), faker.random.alphaNumeric()));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let updatedName = faker.name.findName();
        let updatedDescription = faker.random.alphaNumeric();

        let updateResult = await mapper.Update(metatype.value.id!, "test-suite",
            {name: updatedName, description: updatedDescription});
        expect(updateResult.isError).false;

        let retrieved = await mapper.Retrieve(metatype.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(metatype.value.id);
        expect(retrieved.value.name).eq(updatedName);
        expect(retrieved.value.description).eq(updatedDescription);

        return mapper.PermanentlyDelete(metatype.value.id!)
    })
});
