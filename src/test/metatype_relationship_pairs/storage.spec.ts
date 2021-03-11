/* tslint:disable */
import Logger from "../../logger";
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import MetatypeKeyMapper from "../../data_access_layer/mappers/metatype_key_mapper";
import MetatypeMapper from "../../data_access_layer/mappers/metatype_mapper";
import faker from "faker";
import {expect} from "chai";
import {MetatypeKeyT} from "../../types/metatype_keyT";
import ContainerStorage from "../../data_access_layer/mappers/container_mapper";
import {MetatypeRelationshipKeyT} from "../../types/metatype_relationship_keyT";
import MetatypeRelationshipMapper from "../../data_access_layer/mappers/metatype_relationship_mapper";
import MetatypeRelationshipPairMapper from "../../data_access_layer/mappers/metatype_relationship_pair_mapper";
import Container from "../../data_warehouse/ontology/container";
import Metatype from "../../data_warehouse/ontology/metatype";
import ContainerMapper from "../../data_access_layer/mappers/container_mapper";
import MetatypeRelationship from "../../data_warehouse/ontology/metatype_relationship";

describe('A Metatype Relationship Pair can', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping nodes graph tests, no storage layer");
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

    it('can be saved to storage', async()=> {
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const rMapper = MetatypeRelationshipMapper.Instance;
        const rpStorage = MetatypeRelationshipPairMapper.Instance;

        const metatype = await mMapper.BulkCreate("test suite",
            [
                new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()),
                new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()),
            ]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const keys = await kStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        const keys2 = await kStorage.Create(metatype.value[1].id!, "test suite", test_keys);
        expect(keys2.isError).false;

        let relationship = await rMapper.Create("test suite",
            new MetatypeRelationship(containerID, faker.name.findName(), faker.random.alphaNumeric()))

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpStorage.Create(containerID, "test suite", {
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "origin_metatype_id": metatype.value[0].id,
            "destination_metatype_id": metatype.value[1].id,
            "relationship_id": relationship.value.id,
            "relationship_type": "one:one"
        });

        expect(pair.isError).false;

       return mMapper.PermanentlyDelete(metatype.value[0].id!);
    });

    it('can be archived and permanently deleted', async()=> {
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const rMapper = MetatypeRelationshipMapper.Instance;
        const rpStorage = MetatypeRelationshipPairMapper.Instance;

        const metatype = await mMapper.BulkCreate( "test suite",
            [
                new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()),
                new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()),
            ]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const keys = await kStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        const keys2 = await kStorage.Create(metatype.value[1].id!, "test suite", test_keys);
        expect(keys2.isError).false;

        let relationship = await rMapper.Create("test suite",
            new MetatypeRelationship(containerID, faker.name.findName(), faker.random.alphaNumeric()))

        expect(relationship.isError).false;
      //  expect(relationship.value).not.empty;

        let pair = await rpStorage.Create(containerID, "test suite", {
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "origin_metatype_id": metatype.value[0].id,
            "destination_metatype_id": metatype.value[1].id,
            "relationship_id": relationship.value.id,
            "relationship_type": "one:one"
        });

        expect(pair.isError).false;

        let archived = await rpStorage.Archive(pair.value[0].id!, "test suite");
        expect(archived.isError).false;

        let deleted = await rpStorage.Delete(pair.value[0].id!);
        expect(deleted.isError).false;

        await mMapper.PermanentlyDelete(metatype.value[0].id!);
        return
    });

    it('can be listed by destination and origin', async()=> {
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const rMapper = MetatypeRelationshipMapper.Instance;
        const rpStorage = MetatypeRelationshipPairMapper.Instance;

        const metatype = await mMapper.BulkCreate( "test suite",
            [
                new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()),
                new Metatype(containerID,faker.name.findName(), faker.random.alphaNumeric()),
            ]);

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const keys = await kStorage.Create(metatype.value[0].id!, "test suite", test_keys);
        expect(keys.isError).false;

        const keys2 = await kStorage.Create(metatype.value[1].id!, "test suite", test_keys);
        expect(keys2.isError).false;

        let relationship = await rMapper.Create("test suite",
            new MetatypeRelationship(containerID, faker.name.findName(), faker.random.alphaNumeric()))

        expect(relationship.isError).false;
        expect(relationship.value).not.empty;

        let pair = await rpStorage.Create(containerID, "test suite", {
            "name": faker.name.findName(),
            "description": faker.random.alphaNumeric(),
            "origin_metatype_id": metatype.value[0].id,
            "destination_metatype_id": metatype.value[1].id,
            "relationship_id": relationship.value.id,
            "relationship_type": "one:one"
        });

        expect(pair.isError).false;

        let fetchedPair = await rpStorage.RetrieveByMetatypes(metatype.value[0].id!, metatype.value[1].id!);
        expect(fetchedPair.isError).false;
        expect(fetchedPair.value.id).not.undefined;

        let fetchedPair2 = await rpStorage.RetrieveByMetatypesAndRelationship(metatype.value[0].id!, metatype.value[1].id!, pair.value[0].id!);
        expect(fetchedPair2.isError).false;
        expect(fetchedPair2.value.id).not.undefined;

        return mMapper.PermanentlyDelete(metatype.value[0].id!);
    });
});

const test_keys: MetatypeKeyT[] = [{
    name: "Test",
    property_name: "flower",
    required: true,
    description: "flower name",
    data_type: "string"
},
    {
        name: "Test 2",
        property_name: "color",
        required: true,
        description: "color of flower allowed",
        data_type: "enumeration",
        options: ["yellow", "blue"]
    },
    {
        name: "Test Not Required",
        property_name: "notRequired",
        required: false,
        description: "not required",
        data_type: "number",
    },
];

const test_relationship_keys: MetatypeRelationshipKeyT[] = [{
    name: "Test",
    property_name: "flower",
    required: true,
    description: "flower name",
    data_type: "string"
},
    {
        name: "Test 2",
        property_name: "color",
        required: true,
        description: "color of flower allowed",
        data_type: "enumeration",
        options: ["yellow", "blue"]
    },
    {
        name: "Test Not Required",
        property_name: "notRequired",
        required: false,
        description: "not required",
        data_type: "number",
    },
];
