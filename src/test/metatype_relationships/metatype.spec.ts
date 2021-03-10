/* tslint:disable */
import * as t from 'io-ts'
import {expect} from 'chai'
import {fold} from "fp-ts/lib/Either";
import {pipe} from "fp-ts/lib/pipeable";
import {failure} from "io-ts/lib/PathReporter";
import MetatypeRelationshipKey from "../../data_warehouse/ontology/metatype_relationship_key";
import * as faker from "faker";
import MetatypeRelationship from "../../data_warehouse/ontology/metatype_relationship";
import Logger from "../../logger";
import PostgresAdapter from "../../data_access_layer/mappers/adapters/postgres/postgres";
import ContainerMapper from "../../data_access_layer/mappers/container_mapper";
import Container from "../../data_warehouse/ontology/container";

// failure handler
const onLeft = (errors: t.Errors): string => {
    console.log(`${errors.length} error(s) found ${failure(errors)} `);

    return `${errors.length} error(s) found ${failure(errors)}`
};

// success handler
const onRight = (s: any) => {
    return ""
};


describe('A Metatype Relationship should', async() => {
    let containerID:string = process.env.TEST_CONTAINER_ID || "";

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

    after(async function() {
        return ContainerMapper.Instance.Delete(containerID)
    })

    it('be able to compile keys and pass/fail payloads', (done) => {
        const metatype = new MetatypeRelationship(containerID, faker.name.findName(), faker.random.alphaNumeric())
        metatype.addKey(...test_keys)

        pipe(metatype.compileKeys().decode(payload), fold(onLeft, onRight));
        pipe(metatype.compileKeys().decode(malformed_payload), fold(onLeft, onRight));
        done()
    });
});


const payload: {[key:string]:any} = {
    "flower": "Daisy",
    "color": "yellow",
    "notRequired": 1
};

const malformed_payload: {[key:string]:any} = {
    "flower": "Daisy",
    "notRequired": 1
};

export const test_keys: MetatypeRelationshipKey[] = [
    new MetatypeRelationshipKey("Test", "flower name", true, "flower_name", "string"),
    new MetatypeRelationshipKey("Test2", "color of flower allowed", true, "color", "enumeration", ["yellow", "blue"]),
    new MetatypeRelationshipKey("Test Not Required", "not required", false, "notRequired", "number"),
];

export const single_test_key: MetatypeRelationshipKey = new MetatypeRelationshipKey("Test Not Required", "not required", false, "notRequired", "number")
