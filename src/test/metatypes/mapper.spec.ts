/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import MetatypeMapper from "../../data_access_layer/mappers/metatype_mapper";
import Logger from "../../services/logger";
import ContainerMapper from "../../data_access_layer/mappers/container_mapper";
import Container from "../../data_warehouse/ontology/container";
import Metatype from "../../data_warehouse/ontology/metatype";

describe('A Metatype Mapper', async() => {
    let containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping metatype tests, no mapper layer");
           this.skip()
       }
        await PostgresAdapter.Instance.init();
        let mapper = ContainerMapper.Instance;

        const container = await mapper.Create("test suite", new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()}));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;

        return Promise.resolve()
    });

    after(async function() {
        return ContainerMapper.Instance.Delete(containerID)
    })

    it('can be saved to mapper', async()=> {
        let mapper = MetatypeMapper.Instance;

        const metatype = await mapper.Create("test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        return mapper.PermanentlyDelete(metatype.value.id!)
    });

    it('can be deleted', async()=> {
        let mapper = MetatypeMapper.Instance;

        const metatype = await mapper.Create("test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const deleted = await mapper.PermanentlyDelete(metatype.value.id!)
        expect(deleted.isError).false

        return Promise.resolve()
    });

    it('can be batch saved', async()=> {
        let mapper = MetatypeMapper.Instance;

        const metatype = await mapper.Create("test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        return mapper.PermanentlyDelete(metatype.value.id!)
    });

    it('can be retrieved from  mapper', async()=> {
        let mapper = MetatypeMapper.Instance;

        const metatype = await mapper.Create( "test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let retrieved = await mapper.Retrieve(metatype.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(metatype.value.id);

        return mapper.PermanentlyDelete(metatype.value.id!)
    });

    it('can be updated in mapper', async()=> {
        let mapper = MetatypeMapper.Instance;

        const metatype = await mapper.Create("test suite",
            new Metatype({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let updatedName = faker.name.findName();
        let updatedDescription = faker.random.alphaNumeric();

        metatype.value.name = updatedName
        metatype.value.description = updatedDescription

        let updateResult = await mapper.Update( "test-suite",metatype.value);
        expect(updateResult.isError).false;

        let retrieved = await mapper.Retrieve(metatype.value.id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(metatype.value.id);
        expect(retrieved.value.name).eq(updatedName);
        expect(retrieved.value.description).eq(updatedDescription);

        return mapper.PermanentlyDelete(metatype.value.id!)
    })
});
