/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_mappers/adapters/postgres/postgres";
import MetatypeRelationshipStorage from "../../data_mappers/metatype_relationship_storage";
import Logger from "../../logger";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import Container from "../../data_warehouse/ontology/container";

describe('A Metatype Relationship', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping metatype tests, no storage layer");
           this.skip()
       }

        await PostgresAdapter.Instance.init();
        let mapper = ContainerStorage.Instance;

        const container = await mapper.Create("test suite", new Container(faker.name.findName(), faker.random.alphaNumeric()));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;

        return Promise.resolve()
    });

    it('can be saved to storage', async()=> {
        let storage = MetatypeRelationshipStorage.Instance;

        let metatype = await storage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        return storage.PermanentlyDelete(metatype.value[0].id!)
    });


    it('can be archived', async()=> {
        let storage = MetatypeRelationshipStorage.Instance;

        let metatype = await storage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let archived = await storage.Archive(metatype.value[0].id!, "test suite");
        expect(archived.isError).false;

        return storage.PermanentlyDelete(metatype.value[0].id!)
    });

    it('can be batch saved', async()=> {
        let storage = MetatypeRelationshipStorage.Instance;

        let metatype = await storage.Create(containerID, "test suite",
            [{"name": faker.name.findName(), "description": faker.random.alphaNumeric()}]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        return storage.PermanentlyDelete(metatype.value[0].id!)
    });

    it('can be retrieved from  storage', async()=> {
        let storage = MetatypeRelationshipStorage.Instance;

        let metatype = await storage.Create(containerID,
            "test suite", {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});


        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let retrieved = await storage.Retrieve(metatype.value[0].id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(metatype.value[0].id);

        return storage.PermanentlyDelete(metatype.value[0].id!)
    });

    it('can be listed from storage', async()=> {
        let storage = MetatypeRelationshipStorage.Instance;

        let metatype = await storage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let retrieved = await storage.List(containerID, 0, 100);
        expect(retrieved.isError).false;
        expect(retrieved.value).not.empty;

        return storage.PermanentlyDelete(metatype.value[0].id!)
    });

    it('can be updated in storage', async()=> {
        let storage = MetatypeRelationshipStorage.Instance;

        let metatype = await storage.Create(containerID, "test suite",
            {"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let updatedName = faker.name.findName();
        let updatedDescription = faker.random.alphaNumeric();

        let updateResult = await storage.Update(metatype.value[0].id!, "test-suite",
            {name: updatedName, description: updatedDescription});
        expect(updateResult.isError).false;

        let retrieved = await storage.Retrieve(metatype.value[0].id!);
        expect(retrieved.isError).false;
        expect(retrieved.value.id).eq(metatype.value[0].id);
        expect(retrieved.value.name).eq(updatedName);
        expect(retrieved.value.description).eq(updatedDescription);

        return storage.PermanentlyDelete(metatype.value[0].id!)
    })
});
