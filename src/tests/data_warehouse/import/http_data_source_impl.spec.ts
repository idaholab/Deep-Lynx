import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import Logger from "../../../services/logger";
import ContainerStorage from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import Container from "../../../data_warehouse/ontology/container";
import ContainerMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";

describe('An HTTP Data Source', async() => {
    let containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
        if (process.env.SKIP_DATA_SOURCE_TESTS === 'true') {
            Logger.debug("skipping HTTP data source tests");
            this.skip()
        }

        if (process.env.CORE_DB_CONNECTION_STRING === "") {
           Logger.debug("skipping export tests, no storage layer");
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

    /*
    UNCOMMENT ONLY IF YOU HAVE A DATA SOURCE YOU CAN POLL
    it('can poll', async()=> {
        // @ts-ignore
        let storage = DataSourceStorage.Instance;

        // @ts-ignore
        let http = await HttpImpl.New(containerID, "test suite", "test adapter", {
            endpoint:"http://localhost",
            data_type:"json",
            auth_method:"basic",
            username: "test",
            password: "test"
        });

        expect(http.isError).false;

        http.value.Poll();

        await delay(2000);

        // verify that we have import records
        let imported = await ImportStorage.Instance.RetrieveLast(http.value.importAdapterT.id!);
        expect(imported.isError).false;
        expect(imported.value).not.null;

        return DataSourceStorage.Instance.PermanentlyDelete(http.value.importAdapterT.id!)
    }).timeout(4000);
     */
});

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}
