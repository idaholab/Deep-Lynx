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
import MetatypeRelationshipRepository
    from "../../../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_repository";
import MetatypeRelationship from "../../../data_warehouse/ontology/metatype_relationship";
import MetatypeRelationshipKey from "../../../data_warehouse/ontology/metatype_relationship_key";
import TypeTransformationRepository
    from "../../../data_access_layer/repositories/data_warehouse/etl/type_transformation_repository";

describe('A Type Transformation Repository', async() => {
    let containerID: string = process.env.TEST_CONTAINER_ID || "";
    let dataSourceID: string
    let user: User
    let metatype: Metatype
    let metatypeKey: MetatypeKey
    let relationship: MetatypeRelationship
    let relationshipKey: MetatypeRelationshipKey
    let typeMapping: TypeMapping

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
        metatypeKey = keyCreated.value

        const rRepository = new MetatypeRelationshipRepository()
        const newRelationship = new MetatypeRelationship({container_id: containerID,name: faker.name.findName(),description: faker.random.alphaNumeric()})
        const rkey = new MetatypeRelationshipKey({name: faker.name.findName(), description: faker.random.alphaNumeric(), required: true, property_name: "test_property", data_type: "string"})
        newRelationship.addKey(rkey)

        const rResults = await rRepository.save(newRelationship, user)
        expect(rResults.isError).false
        expect(newRelationship.id).not.undefined
        expect(newRelationship.keys!).not.empty
        expect(newRelationship.keys![0].id).not.undefined
        relationship = newRelationship
        relationshipKey = newRelationship.keys![0]

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

        const repo = new TypeMappingRepository()
        const mapping = new TypeMapping({
            container_id: containerID,
            data_source_id: dataSourceID,
            sample_payload: test_raw_payload
        })

        // verify the hash ran
        expect(mapping.shape_hash).not.undefined

        const saved = await repo.save(mapping, user)
        expect(saved.isError).false
        expect(mapping.id).not.undefined
        typeMapping = mapping

        return Promise.resolve()
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!)
        return ContainerMapper.Instance.Delete(containerID)
    })

    it('can populate a Transformation\'s keys with valid instantiated classes', async() => {
        // in this particular test we are mixing metatype keys with metatype relationship keys in the mapping portion
        // of the transformation object - while this shouldn't happen in real life as the type of key should strictly
        // correspond with the type of transformation (relationship or metatype) - we want to make sure we can handle
        // that particular use case just in case.
        const transformation = new TypeTransformation({
            type_mapping_id: typeMapping.id!,
            metatype_id: metatype.id,
            conditions: [new Condition({
                key: "RADIUS",
                operator: "==",
                value: "CIRCLE"
            })],
            keys: [new KeyMapping({
                key: "RADIUS",
                metatype_key_id: metatypeKey.id
            }), new KeyMapping({
                key: "TEST",
                metatype_relationship_key_id: relationshipKey.id
            })]
        })

        const repository = new TypeTransformationRepository()
        await repository.populateKeys(transformation)

        for(const key of transformation.keys) {
            if(key.metatype_key_id) {
                expect(key.metatype_key).not.undefined
                expect(key.metatype_key!.name).not.undefined
                expect(key.metatype_key!.name).eq(metatypeKey.name)
            }

            if(key.metatype_relationship_key_id) {
                expect(key.metatype_relationship_key).not.undefined
                expect(key.metatype_relationship_key!.name).not.undefined
                expect(key.metatype_relationship_key!.name).eq(relationshipKey.name)
            }
        }

        return Promise.resolve()
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