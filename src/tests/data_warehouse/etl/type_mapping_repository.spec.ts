import { User } from '../../../domain_objects/access_management/user';
import Logger from '../../../services/logger';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import { expect } from 'chai';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import TypeMapping from '../../../domain_objects/data_warehouse/etl/type_mapping';
import TypeMappingRepository from '../../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import MetatypeKey from '../../../domain_objects/data_warehouse/ontology/metatype_key';
import Metatype from '../../../domain_objects/data_warehouse/ontology/metatype';
import MetatypeMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import MetatypeKeyMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import TypeTransformation, { Condition, KeyMapping } from '../../../domain_objects/data_warehouse/etl/type_transformation';
import DataSourceRecord from '../../../domain_objects/data_warehouse/import/data_source';

describe('A Type Mapping Repository', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let dataSourceID: string;
    let targetDataSourceID: string;
    let user: User;
    let metatype: Metatype;
    let key: MetatypeKey;
    // these are needed for the export/import tests of the type mappings
    let container2ID: string;
    let dataSource2ID: string;
    let metatype2: Metatype;
    let key2: MetatypeKey;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping metatype tests, no mapper layer');
            this.skip();
        }
        await PostgresAdapter.Instance.init();
        const mapper = ContainerMapper.Instance;

        const container = await mapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric()
            })
        );

        expect(container.isError).false;
        expect(container.value.id).not.null;
        containerID = container.value.id!;

        const container2 = await mapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric()
            })
        );

        expect(container2.isError).false;
        expect(container2.value.id).not.null;
        container2ID = container2.value.id!;

        const userResult = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ['superuser']
            })
        );

        expect(userResult.isError).false;
        expect(userResult.value).not.empty;
        user = userResult.value;

        const created = await MetatypeMapper.Instance.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric()
            })
        );

        expect(created.isError).false;
        metatype = created.value;

        const test_key: MetatypeKey = new MetatypeKey({
            name: 'Test',
            description: 'flower name',
            required: true,
            property_name: 'flower_name',
            data_type: 'string',
            metatype_id: metatype.id!
        });

        const keyCreated = await MetatypeKeyMapper.Instance.Create('test suite', test_key);
        expect(keyCreated.isError).false;
        key = keyCreated.value;

        // create the metatype and key with same name on other container
        const created2 = await MetatypeMapper.Instance.Create(
            'test suite',
            new Metatype({
                container_id: container2ID!,
                name: metatype.name,
                description: faker.random.alphaNumeric()
            })
        );

        expect(created2.isError).false;
        metatype2 = created2.value;

        const test_key2: MetatypeKey = new MetatypeKey({
            name: 'Test',
            description: 'flower name',
            required: true,
            property_name: 'flower_name',
            data_type: 'string',
            metatype_id: metatype2.id!
        });

        const keyCreated2 = await MetatypeKeyMapper.Instance.Create('test suite', test_key2);
        expect(keyCreated2.isError).false;
        key2 = keyCreated2.value;

        const exp = await DataSourceMapper.Instance.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json'
            })
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;
        dataSourceID = exp.value.id!;

        const exp2 = await DataSourceMapper.Instance.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source 2',
                active: false,
                adapter_type: 'standard',
                data_format: 'json'
            })
        );

        expect(exp2.isError).false;
        expect(exp2.value).not.empty;
        targetDataSourceID = exp2.value.id!;

        // create the data source in the new container for mapping/transformation import/export tests
        const exp3 = await DataSourceMapper.Instance.Create(
            'test suite',
            new DataSourceRecord({
                container_id: container2ID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json'
            })
        );

        expect(exp3.isError).false;
        expect(exp3.value).not.empty;
        dataSource2ID = exp3.value.id!;

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        await ContainerMapper.Instance.Delete(container2ID);
        return ContainerMapper.Instance.Delete(containerID);
    });

    it('can save a Type Mapping', async () => {
        const repo = new TypeMappingRepository();
        const mapping = new TypeMapping({
            container_id: containerID,
            data_source_id: dataSourceID,
            sample_payload: test_raw_payload
        });

        // verify the hash ran
        expect(mapping.shape_hash).not.undefined;

        let saved = await repo.save(mapping, user);
        expect(saved.isError).false;
        expect(mapping.id).not.undefined;

        // update the payload, rerun the hash
        mapping.sample_payload = updated_payload;
        mapping.shape_hash = TypeMapping.objectToShapeHash(updated_payload);

        saved = await repo.save(mapping, user);
        expect(saved.isError);
        expect(mapping.shape_hash).eq(TypeMapping.objectToShapeHash(updated_payload));

        return repo.delete(mapping);
    });

    it('can save a Type Mapping with Transformations', async () => {
        const repo = new TypeMappingRepository();
        const mapping = new TypeMapping({
            container_id: containerID,
            data_source_id: dataSourceID,
            sample_payload: test_raw_payload
        });

        const transformation = new TypeTransformation({
            type_mapping_id: mapping.id!,
            metatype_id: metatype.id,
            conditions: [
                new Condition({
                    key: 'RADIUS',
                    operator: '==',
                    value: 'CIRCLE'
                })
            ],
            keys: [
                new KeyMapping({
                    key: 'RADIUS',
                    metatype_key_id: key.id
                })
            ]
        });

        mapping.addTransformation(transformation);

        let saved = await repo.save(mapping, user);
        expect(saved.isError).false;
        expect(mapping.id).not.undefined;
        expect(mapping.transformations![0]!.id).not.undefined;

        // remove the transformation
        mapping.removeTransformation(mapping.transformations![0]!);

        saved = await repo.save(mapping, user);
        expect(saved.isError);
        expect(mapping.transformations).empty;

        return repo.delete(mapping);
    });

    it('can export a Type Mapping with Transformations to a separate Data Source', async () => {
        const repo = new TypeMappingRepository();
        const mapping = new TypeMapping({
            container_id: containerID,
            data_source_id: dataSourceID,
            sample_payload: test_raw_payload,
            active: true // we set active true so we can verify that the mapping will be set inactive on export
        });

        const transformation = new TypeTransformation({
            type_mapping_id: mapping.id!,
            metatype_id: metatype.id,
            conditions: [
                new Condition({
                    key: 'RADIUS',
                    operator: '==',
                    value: 'CIRCLE'
                })
            ],
            keys: [
                new KeyMapping({
                    key: 'RADIUS',
                    metatype_key_id: key.id
                })
            ]
        });

        mapping.addTransformation(transformation);

        const saved = await repo.save(mapping, user);
        expect(saved.isError).false;
        expect(mapping.id).not.undefined;
        expect(mapping.transformations![0]!.id).not.undefined;

        // first we attempt to export them into the same container but separate data source
        let exported = await repo.importToDataSource(targetDataSourceID, user, mapping);
        for (const result of exported) {
            expect(result.isError).false;
            expect(result.value.id).not.eq(mapping.id); // should be a new mapping
            expect(result.value.active).false;
            expect(result.value.container_id).eq(containerID);
            expect(result.value.data_source_id).eq(targetDataSourceID);
        }

        // reload the new mapping and ensure the transformations got pushed over with it
        let mappings = await repo.where().containerID('eq', containerID).and().dataSourceID('eq', targetDataSourceID).list(true);

        expect(mappings.isError).false;
        expect(mappings.value.length).eq(1);
        expect(mappings.value[0].transformations?.length).eq(1);

        // next export the mappings into a separate container
        exported = await repo.importToDataSource(dataSource2ID, user, mapping);
        for (const result of exported) {
            expect(result.isError).false;
            expect(result.value.id).not.eq(mapping.id); // should be a new mapping
            expect(result.value.active).false;
            expect(result.value.container_id).eq(container2ID);
            expect(result.value.data_source_id).eq(dataSource2ID);
        }

        // reload the new mapping and ensure the transformations got pushed over with it
        mappings = await repo.where().containerID('eq', container2ID).and().dataSourceID('eq', dataSource2ID).list(true);

        expect(mappings.isError).false;
        expect(mappings.value.length).eq(1);
        expect(mappings.value[0].transformations?.length).eq(1);

        return repo.delete(mapping);
    });
});

const test_raw_payload = {
    RAD: 0.1,
    COLOR: 'blue',
    TYPE: 'EQUIP',
    TEST: 'TEST',
    ITEM_ID: '123',
    ATTRIBUTES: {
        WHEELS: 1
    }
};

const updated_payload = {
    RAD: 0.1,
    COLOR: 'yellow',
    ITEM_ID: '123',
    ATTRIBUTES: {
        WHEELS: 1
    }
};
