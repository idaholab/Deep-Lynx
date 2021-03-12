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

        const container = await mapper.Create("test suite", new Container({name: faker.name.findName(),description: faker.random.alphaNumeric()}));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;

        return Promise.resolve()
    });

    after(async function() {
        return ContainerMapper.Instance.Delete(containerID)
    })

    it('be able to compile keys and pass/fail payloads', (done) => {
        const metatype = new MetatypeRelationship({containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()})
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
    new MetatypeRelationshipKey({name: "Test", description: "flower name", required: true, propertyName: "flower_name", dataType: "string"}),
    new MetatypeRelationshipKey({name: "Test2", description: "color of flower allowed", required: true, propertyName: "color", dataType: "enumeration", options: ["yellow", "blue"]}),
    new MetatypeRelationshipKey({name: "Test Not Required", description: "not required", required: false, propertyName: "notRequired", dataType: "number"}),
];

export const single_test_key: MetatypeRelationshipKey = new MetatypeRelationshipKey({name: "Test Not Required", description: "not required", required: false, propertyName: "notRequired", dataType: "number"})
