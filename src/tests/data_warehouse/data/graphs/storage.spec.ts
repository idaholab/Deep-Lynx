import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import GraphMapper from "../../../../data_access_layer/mappers/data_warehouse/data/graph_mapper";
import Logger from "../../../../services/logger";
import ContainerStorage from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import Container from "../../../../data_warehouse/ontology/container";
import ContainerMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";

describe('A Graph', async() => {
    let containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
       if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping graph tests, no storage layer");
           this.skip()
       }

       await PostgresAdapter.Instance.init();
       const mapper = ContainerStorage.Instance;

       const container = await mapper.Create("test suite", new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()}));

       expect(container.isError).false;
       expect(container.value.id).not.null
       containerID = container.value.id!;

       return Promise.resolve()
    });

    after(async () => {
        return ContainerMapper.Instance.Delete(containerID)
    })

    it('can be saved to storage', async()=> {
        const storage = GraphMapper.Instance;

        const graph = await storage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        return storage.Delete(graph.value.id!)
    });

    it('can be set active for container', async()=> {
        const storage = GraphMapper.Instance;

        const graph = await storage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const active = await storage.SetActiveForContainer(containerID, graph.value.id!)
        expect(active.isError).false

        return storage.Delete(graph.value.id!)
    });

    it('can be retrieved from  storage', async()=> {
        const storage = GraphMapper.Instance;

        const graph = await storage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const retrieved = await storage.Retrieve(graph.value.id!);
        expect(retrieved.isError, graph.error?.error).false;
        expect(retrieved.value.id).eq(graph.value.id);

        return storage.Delete(graph.value.id!)
    });

    it('can be listed from storage', async()=> {
        const storage = GraphMapper.Instance;

        const graph = await storage.Create(containerID, "test suite");

        expect(graph.isError, graph.error?.error).false;
        expect(graph.value).not.empty;

        const retrieved = await storage.List(containerID, 0, 100);
        expect(retrieved.isError, graph.error?.error).false;
        expect(retrieved.value).not.empty;

        return storage.Delete(graph.value.id!)
    })
});
