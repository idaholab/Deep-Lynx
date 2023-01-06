import Logger from '../../../../services/logger';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import MetatypeKeyMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import MetatypeMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import faker from 'faker';
import {expect} from 'chai';
import NodeMapper from '../../../../data_access_layer/mappers/data_warehouse/data/node_mapper';
import ContainerStorage from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import DataSourceMapper from '../../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import MetatypeKey from '../../../../domain_objects/data_warehouse/ontology/metatype_key';
import Node from '../../../../domain_objects/data_warehouse/data/node';
import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';
import FileMapper from '../../../../data_access_layer/mappers/data_warehouse/data/file_mapper';
import File, {NodeFile} from '../../../../domain_objects/data_warehouse/data/file';

describe('A Node Mapper', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let dataSourceID: string = '';

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping nodes graph tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();
        const mapper = ContainerStorage.Instance;

        const container = await mapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(container.isError).false;
        expect(container.value.id).not.null;
        containerID = container.value.id!;

        const exp = await DataSourceMapper.Instance.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        expect(exp.isError).false;
        expect(exp.value).not.empty;

        dataSourceID = exp.value.id!;
        return Promise.resolve();
    });

    after(async () => {
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can save mixed node types', async () => {
        const storage = NodeMapper.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;

        // SETUP
        const metatype = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatype.value.id!));

        const keys = await kStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const mixed = new Node({
            container_id: containerID,
            metatype: metatype.value.id!,
            properties: payload,
        });

        const node = await storage.CreateOrUpdateByCompositeID('test suite', mixed);
        expect(node.isError, metatype.error?.error).false;

        return mMapper.Delete(metatype.value.id!);
    });

    it('can update mixed node types', async () => {
        const storage = NodeMapper.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;

        // SETUP
        const metatype = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatype.value.id!));

        const keys = await kStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        await kStorage.RefreshView();

        const mixed = new Node({
            container_id: containerID,
            metatype: metatype.value.id!,
            properties: payload,
        });

        const node = await storage.CreateOrUpdateByCompositeID('test suite', mixed);
        expect(node.isError, metatype.error?.error).false;

        // Run the update test
        node.value.properties = updatedPayload;

        const updatedNode = await storage.Update('test suite', node.value);
        expect(updatedNode.isError, updatedNode.error?.error).false;

        return mMapper.Delete(metatype.value.id!);
    });

    it('can retrieve by original ID', async () => {
        const storage = NodeMapper.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const dStorage = DataSourceMapper.Instance;

        const dataSource = await dStorage.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: true,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        // SETUP
        const metatype = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatype.value.id!));

        const keys = await kStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const mixed = new Node({
            data_source_id: dataSource.value.id!,
            container_id: containerID,
            metatype: metatype.value.id!,
            original_data_id: 'test',
            properties: payload,
        });

        const node = await storage.CreateOrUpdateByCompositeID('test suite', mixed);
        expect(node.isError, metatype.error?.error).false;

        const fetchedNode = await storage.RetrieveByCompositeOriginalID('test', dataSource.value.id!, metatype.value.id!);
        expect(fetchedNode.isError).false;
        expect(fetchedNode.value.data_source_id).equals(dataSource.value.id!);

        return mMapper.Delete(metatype.value.id!);
    });

    it('can update by original ID', async () => {
        const storage = NodeMapper.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const dStorage = DataSourceMapper.Instance;

        const dataSource = await dStorage.Create(
            'test suite',
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: true,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        // SETUP
        const metatype = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatype.value.id!));

        const keys = await kStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const mixed = new Node({
            data_source_id: dataSource.value.id!,
            original_data_id: 'test',
            container_id: containerID,
            metatype: metatype.value.id!,
            properties: payload,
        });

        const node = await storage.CreateOrUpdateByCompositeID('test suite', mixed);
        expect(node.isError, metatype.error?.error).false;

        node.value.properties = updatedPayload;
        node.value.id = undefined;

        const updatedNode = await storage.CreateOrUpdateByCompositeID('test suite', node.value);
        expect(updatedNode.isError).false;

        return mMapper.Delete(metatype.value.id!);
    });

    it('can save with default values', async () => {
        const storage = NodeMapper.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;

        // SETUP
        const metatype = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_key_defaultValue];
        testKeys.forEach((key) => (key.metatype_id = metatype.value.id!));

        const keys = await kStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const mixed = new Node({
            container_id: containerID,
            metatype: metatype.value.id!,
            properties: payload,
        });

        const node = await storage.CreateOrUpdateByCompositeID('test suite', mixed);
        expect(node.isError, metatype.error?.error).false;

        return mMapper.Delete(metatype.value.id!);
    });

    it('can attach files in bulk', async () => {
        const storage = NodeMapper.Instance;
        const kStorage = MetatypeKeyMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const fMapper = FileMapper.Instance;

        // SETUP
        const file = await fMapper.Create(
            'test suite',
            new File({
                file_name: faker.name.findName(),
                file_size: 200,
                md5hash: '',
                adapter_file_path: faker.name.findName(),
                adapter: 'filesystem',
                data_source_id: dataSourceID,
                container_id: containerID,
            }),
        );

        expect(file.isError).false;
        expect(file.value).not.empty;

        const file2 = await fMapper.Create(
            'test suite',
            new File({
                file_name: faker.name.findName(),
                file_size: 200,
                md5hash: '',
                adapter_file_path: faker.name.findName(),
                adapter: 'filesystem',
                data_source_id: dataSourceID,
                container_id: containerID,
            }),
        );

        expect(file2.isError).false;
        expect(file2.value).not.empty;
        const metatype = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(metatype.isError).false;
        expect(metatype.value).not.empty;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatype.value.id!));

        const keys = await kStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        const mixed = new Node({
            container_id: containerID,
            metatype: metatype.value.id!,
            properties: payload,
        });

        const node = await storage.CreateOrUpdateByCompositeID('test suite', mixed);
        expect(node.isError, metatype.error?.error).false;

        const attachedFiles = await storage.BulkAddFile([
            new NodeFile({node_id: node.value.id!, file_id: file.value.id!}),
            new NodeFile({node_id: node.value.id!, file_id: file2.value.id!}),
        ]);

        expect(attachedFiles.isError).false;
        expect(attachedFiles.value[0].node_id).not.undefined;
        expect(attachedFiles.value[0].file_id).not.undefined;
        expect(attachedFiles.value[1].node_id).not.undefined;
        expect(attachedFiles.value[1].file_id).not.undefined;

        return mMapper.Delete(metatype.value.id!);
    });
});

const payload: {[key: string]: any} = {
    flower_name: 'Daisy',
    color: 'yellow',
    notRequired: 1,
};

const updatedPayload: {[key: string]: any} = {
    flower_name: 'Violet',
    color: 'blue',
    notRequired: 1,
};

const malformed_payload: {[key: string]: any} = {
    flower: 'Daisy',
    notRequired: 1,
};

export const test_keys: MetatypeKey[] = [
    new MetatypeKey({
        name: 'Test',
        description: 'flower name',
        required: true,
        property_name: 'flower_name',
        data_type: 'string',
    }),
    new MetatypeKey({
        name: 'Test2',
        description: 'color of flower allowed',
        required: true,
        property_name: 'color',
        data_type: 'enumeration',
        options: ['yellow', 'blue'],
    }),
    new MetatypeKey({
        name: 'Test Not Required',
        description: 'not required',
        required: false,
        property_name: 'notRequired',
        data_type: 'number',
    }),
];

const test_key_defaultValue: MetatypeKey[] = [
    new MetatypeKey({
        name: 'Test',
        property_name: 'flower_name',
        required: true,
        description: 'flower name',
        data_type: 'string',
    }),
    new MetatypeKey({
        name: 'Test 2',
        property_name: 'color',
        required: true,
        description: 'color of flower allowed',
        data_type: 'enumeration',
        options: ['yellow', 'blue'],
    }),
    new MetatypeKey({
        name: 'Test Default Value Number',
        property_name: 'default',
        required: true,
        description: 'not required',
        data_type: 'number',
        default_value: 1,
    }),
    new MetatypeKey({
        name: 'Test Default Value String',
        property_name: 'defaultString',
        required: true,
        description: 'not required',
        data_type: 'string',
        default_value: 'test',
    }),
    new MetatypeKey({
        name: 'Test Default Value Enum',
        property_name: 'defaultEnum',
        required: true,
        description: 'not required',
        data_type: 'enumeration',
        default_value: 'yellow',
        options: ['yellow', 'blue'],
    }),
    new MetatypeKey({
        name: 'Test Default Value Boolean',
        property_name: 'defaultBoolean',
        required: true,
        description: 'not required',
        data_type: 'boolean',
        default_value: true,
    }),
];

export const single_test_key: MetatypeKey = new MetatypeKey({
    name: 'Test Not Required',
    description: 'not required',
    required: false,
    property_name: 'notRequired',
    data_type: 'number',
});
