import {User} from "../../../access_management/user";
import Logger from "../../../services/logger";
import PostgresAdapter from "../../../data_access_layer/mappers/db_adapters/postgres/postgres";
import ContainerMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper";
import Container from "../../../data_warehouse/ontology/container";
import faker from "faker";
import {expect} from "chai";
import UserMapper from "../../../data_access_layer/mappers/access_management/user_mapper";
import DataSourceMapper from "../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper";
import TypeMapping from "../../../data_warehouse/etl/type_mapping";
import TypeMappingRepository from "../../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository";
import MetatypeKey from "../../../data_warehouse/ontology/metatype_key";
import Metatype from "../../../data_warehouse/ontology/metatype";
import MetatypeMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper";
import MetatypeKeyMapper from "../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper";
import TypeTransformation, {Condition, KeyMapping} from "../../../data_warehouse/etl/type_transformation";
import DataSourceRecord from "../../../data_warehouse/import/data_source";

describe('A Type Mapping Repository', async() => {
    let containerID: string = process.env.TEST_CONTAINER_ID || "";
    let dataSourceID: string
    let user: User
    let metatype: Metatype
    let key: MetatypeKey

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === "") {
            Logger.debug("skipping metatype tests, no mapper layer");
            this.skip()
        }
        await PostgresAdapter.Instance.init();
        const mapper = ContainerMapper.Instance;

        const container = await mapper.Create("test suite", new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric()
        }));

        expect(container.isError).false;
        expect(container.value.id).not.null
        containerID = container.value.id!;

        const userResult = await UserMapper.Instance.Create("test suite", new User(
            {
                identity_provider_id: faker.random.uuid(),
                identity_provider: "username_password",
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ["superuser"]
            }));

        expect(userResult.isError).false;
        expect(userResult.value).not.empty;
        user = userResult.value

        const created = await MetatypeMapper.Instance.Create( "test suite",
            new Metatype({container_id: containerID, name: faker.name.findName(), description: faker.random.alphaNumeric()}));

        expect(created.isError).false;
        metatype = created.value

        const test_key: MetatypeKey = new MetatypeKey({name: "Test", description: "flower name", required: true, property_name: "flower_name", data_type: "string", metatype_id: metatype.id!})

        const keyCreated = await MetatypeKeyMapper.Instance.Create("test suite", test_key);
        expect(keyCreated.isError).false;
        key = keyCreated.value

        const exp = await DataSourceMapper.Instance.Create("test suite",
            new DataSourceRecord({
                container_id: containerID,
                name: "Test Data Source",
                active:false,
                adapter_type:"standard",
                data_format: "json"}));

        expect(exp.isError).false;
        expect(exp.value).not.empty;
        dataSourceID = exp.value.id!

        return Promise.resolve()
    });

    after(async () => {
        await UserMapper.Instance.PermanentlyDelete(user.id!)
        return ContainerMapper.Instance.Delete(containerID)
    })

    it('can save a Type Mapping', async() => {
       const repo = new TypeMappingRepository()
       const mapping = new TypeMapping({
           container_id: containerID,
           data_source_id: dataSourceID,
           sample_payload: test_raw_payload
       })

        // verify the hash ran
       expect(mapping.shape_hash).not.undefined

       let saved = await repo.save(mapping, user)
       expect(saved.isError).false
       expect(mapping.id).not.undefined

        // update the payload, rerun the hash
       mapping.sample_payload = updated_payload
       mapping.shape_hash = TypeMapping.objectToShapeHash(updated_payload)

       saved = await repo.save(mapping, user)
       expect(saved.isError)
       expect(mapping.shape_hash).eq(TypeMapping.objectToShapeHash(updated_payload))

       return repo.delete(mapping)
    })

    it('can save a Type Mapping with Transformations', async() => {
        const repo = new TypeMappingRepository()
        const mapping = new TypeMapping({
            container_id: containerID,
            data_source_id: dataSourceID,
            sample_payload: test_raw_payload
        })

        const transformation = new TypeTransformation({
            type_mapping_id: mapping.id!,
            metatype_id: metatype.id,
            conditions: [new Condition({
                key: "RADIUS",
                operator: "==",
                value: "CIRCLE"
            })],
            keys: [new KeyMapping({
                key: "RADIUS",
                metatype_key_id: key.id
            })]
        })

        mapping.addTransformation(transformation)

        let saved = await repo.save(mapping, user)
        expect(saved.isError).false
        expect(mapping.id).not.undefined
        expect(mapping.transformations![0]!.id).not.undefined

        // remove the transformation
        mapping.removeTransformation(mapping.transformations![0]!)

        saved = await repo.save(mapping, user)
        expect(saved.isError)
        expect(mapping.transformations).empty

        return repo.delete(mapping)
    })
})

const test_raw_payload = {
    "RAD": 0.1,
    "COLOR": "blue",
    "TYPE": "EQUIP",
    "TEST": "TEST",
    "ITEM_ID": "123",
    "ATTRIBUTES": {
        "WHEELS": 1
    }
}

const updated_payload = {
    "RAD": 0.1,
    "COLOR": "yellow",
    "ITEM_ID": "123",
    "ATTRIBUTES": {
        "WHEELS": 1
    }
}
