/* tslint:disable */
import faker from 'faker'
import { expect } from 'chai'
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import Logger from "../../logger";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import DataSourceStorage from "../../data_access_layer/mappers/import/data_source_storage";
import {HttpImpl} from "../../data_importing/httpImpl";
import Container from "../../data_warehouse/ontology/container";
import ContainerMapper from "../../data_access_layer/mappers/container_mapper";

describe('An HTTP Data Source', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

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
        let mapper = ContainerStorage.Instance;

        const container = await mapper.Create("test suite", new Container(faker.name.findName(), faker.random.alphaNumeric()));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;

        return Promise.resolve()
    });

    after(async function() {
        return ContainerMapper.Instance.Delete(containerID)
    })

    it('can be instantiated', async()=> {
        let storage = DataSourceStorage.Instance;

        let http = await HttpImpl.New(containerID, "test suite", "test adapter", {
                endpoint:"",
                data_type:"json",
                auth_method:"basic",
                username: "test",
                password: "test"
        }, true);

        expect(http.isError).false;

        return Promise.resolve()
    });

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

    it('can be retrieved from record', async()=> {
        let storage = DataSourceStorage.Instance;

        let http = await HttpImpl.New(containerID, "test suite", "test adapter", {
            endpoint:"",
            auth_method:"basic",
            data_type:"json",
            username: "test",
            password: "test"
        }, true);

        expect(http.isError).false;


        let fetchedHttp = await HttpImpl.NewFromDataSourceID(http.value.dataSourceT.id!);
        expect(fetchedHttp.isError).false;

        return Promise.resolve()
    });

});

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}
