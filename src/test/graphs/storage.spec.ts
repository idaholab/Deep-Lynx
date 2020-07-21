/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_storage/adapters/postgres/postgres";
import GraphStorage from "../../data_storage/graph/graph_storage";
import Logger from "../../logger";
import ContainerStorage from "../../data_storage/container_storage";

describe('A Graph', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping graph tests, no storage layer");
           this.skip()
       }

        await PostgresAdapter.Instance.init();
        let storage = ContainerStorage.Instance;

        let container = await storage.Create("test suite",{"name": faker.name.findName(), "description": faker.random.alphaNumeric()});

        expect(container.isError).false;
        expect(container.value).not.empty;
        containerID = container.value[0].id!;

        return Promise.resolve()
    });

    it('can be saved to storage', async()=> {
        let storage = GraphStorage.Instance;

        let graph = await storage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        return storage.PermanentlyDelete(graph.value.id!)
    });

    it('can be set active for container', async()=> {
        let storage = GraphStorage.Instance;

        let graph = await storage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        let active = await storage.SetActiveForContainer(containerID, graph.value.id)
        expect(active.isError).false

        return storage.PermanentlyDelete(graph.value.id!)
    });

    it('can be retrieved from  storage', async()=> {
        let storage = GraphStorage.Instance;

        let graph = await storage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        let retrieved = await storage.Retrieve(graph.value.id!);
        expect(retrieved.isError, graph.error?.error).false;
        expect(retrieved.value.id).eq(graph.value.id);

        return storage.PermanentlyDelete(graph.value.id!)
    });

    it('can be listed from storage', async()=> {
        let storage = GraphStorage.Instance;

        let graph = await storage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        let retrieved = await storage.List(containerID, 0, 100);
        expect(retrieved.isError, graph.error?.error).false;
        expect(retrieved.value).not.empty;

        return storage.PermanentlyDelete(graph.value.id!)
    })
});
