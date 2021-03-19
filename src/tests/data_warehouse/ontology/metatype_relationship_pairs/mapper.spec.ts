/* tslint:disable */
import Logger from "../../../../services/logger";
import PostgresAdapter from "../../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import MetatypeMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper";
import faker from "faker";
import {expect} from "chai";
import ContainerStorage from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import ContainerMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import MetatypeRelationshipMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper";
import MetatypeRelationshipPairMapper from "../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper";
import Container from "../../../../data_warehouse/ontology/container";
import Metatype from "../../../../data_warehouse/ontology/metatype";
import MetatypeRelationship from "../../../../data_warehouse/ontology/metatype_relationship";
import MetatypeRelationshipPair from "../../../../data_warehouse/ontology/metatype_relationship_pair";

describe('A Metatype Relationship Pair Mapper can', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping nodes graph tests, no storage layer");
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

    it('can be saved to storage', async()=> {
        const mMapper = MetatypeMapper.Instance;
        const rMapper = MetatypeRelationshipMapper.Instance;
        const rpMapper = MetatypeRelationshipPairMapper.Instance;

        const metatype = await mMapper.BulkCreate("test suite",
            [
                new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}),
                new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}),
            ]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let relationship = await rMapper.Create("test suite",
            new MetatypeRelationship({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}))

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpMapper.Create("test suite",new MetatypeRelationshipPair({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            relationship_type: "one:one",
            origin_metatype: metatype.value[0],
            destination_metatype: metatype.value[1],
            relationship: relationship.value,
            container_id : containerID
        }))
        expect(pair.isError).false;

       return mMapper.PermanentlyDelete(metatype.value[0].id!);
    });

    it('can be archived and permanently deleted', async()=> {
        const mMapper = MetatypeMapper.Instance;
        const rMapper = MetatypeRelationshipMapper.Instance;
        const rpMapper = MetatypeRelationshipPairMapper.Instance;

        const metatype = await mMapper.BulkCreate( "test suite",
            [
                new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}),
                new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}),
            ]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        let relationship = await rMapper.Create("test suite",
            new MetatypeRelationship({container_id: containerID,name: faker.name.findName(), description: faker.random.alphaNumeric()}))

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpMapper.Create("test suite",new MetatypeRelationshipPair({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            relationship_type: "one:one",
            origin_metatype: metatype.value[0],
            destination_metatype: metatype.value[1],
            relationship: relationship.value,
            container_id : containerID
        }))

        expect(pair.isError).false;

        let archived = await rpMapper.Archive(pair.value.id!, "test suite");
        expect(archived.isError).false;

        let deleted = await rpMapper.Delete(pair.value.id!);
        expect(deleted.isError).false;

        return Promise.resolve()
    });
});
