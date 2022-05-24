import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../../services/logger';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';
import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';
import {User} from '../../../../domain_objects/access_management/user';
import MetatypeMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import MetatypeKeyMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import MetatypeKey from '../../../../domain_objects/data_warehouse/ontology/metatype_key';
import NodeRepository from '../../../../data_access_layer/repositories/data_warehouse/data/node_repository';
import Node from '../../../../domain_objects/data_warehouse/data/node';
import DataSourceMapper from '../../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';
import fs from "fs";
import LargeObject from "../../../../services/blob_storage/pg_large_file_impl";

describe('A Node Repository', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;
    let metatype: Metatype;
    let regexMetatype: Metatype;
    let dataSourceID: string = '';

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping metatype tests, no mapper layer');
            this.skip();
        }
        await PostgresAdapter.Instance.init();
        const mapper = ContainerMapper.Instance;
        const mMapper = MetatypeMapper.Instance;
        const kStorage = MetatypeKeyMapper.Instance;

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

        const userResult = await UserMapper.Instance.Create(
            'test suite',
            new User({
                identity_provider_id: faker.random.uuid(),
                identity_provider: 'username_password',
                admin: false,
                display_name: faker.name.findName(),
                email: faker.internet.email(),
                roles: ['superuser'],
            }),
        );

        expect(userResult.isError).false;
        expect(userResult.value).not.empty;
        user = userResult.value;

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

        // SETUP
        const m = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(m.isError).false;
        expect(m.value).not.empty;
        metatype = m.value;

        const testKeys = [...test_keys];
        testKeys.forEach((key) => (key.metatype_id = metatype.id!));

        const keys = await kStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

        metatype.addKey(...keys.value);

        const regexM = await mMapper.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(regexM.isError).false;
        expect(regexM.value.id).not.undefined;
        regexMetatype = regexM.value;

        const regex_test_key: MetatypeKey = new MetatypeKey({
            name: 'Test Key Regex',
            property_name: 'regex',
            required: true,
            description: 'testing key regex',
            data_type: 'string',
            // validation is a pattern match verifying that the value has at least 6 characters
            // with 1 uppercase, 1 lowercase, 1 number and no spaces test at https://regex101.com/r/fX8dY0/1
            validation: {
                regex: '^((?=\\S*?[A-Z])(?=\\S*?[a-z])(?=\\S*?[0-9]).{6,})\\S$',
            },
            metatype_id: regexMetatype.id,
        });

        const added = await kStorage.Create('test suite', regex_test_key);
        expect(added.isError).false;

        regexMetatype.addKey(added.value);

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        return ContainerMapper.Instance.Delete(containerID);
    });

    it('can save Nodes', async () => {
        const nodeRepo = new NodeRepository();

        const mixed = new Node({
            container_id: containerID,
            metatype,
            properties: payload,
            original_data_id: faker.name.findName(),
            data_source_id: dataSourceID,
        });

        let saved = await nodeRepo.save(mixed, user);
        expect(saved.isError).false;
        expect(mixed.id).not.undefined;
        expect(mixed.properties).to.have.deep.property('flower_name', 'Daisy');

        // update the node's payload
        mixed.properties = updatedPayload;

        saved = await nodeRepo.save(mixed, user);
        expect(saved.isError).false;
        expect(mixed.properties).to.have.deep.property('flower_name', 'Violet');

        // update by composite_original_id
        const originalID = mixed.id;
        mixed.id = undefined;

        saved = await nodeRepo.save(mixed, user);
        expect(saved.isError).false;
        expect(mixed.id).eq(originalID);

        return nodeRepo.delete(mixed);
    });

    it('can bulk save Nodes', async () => {
        const nodeRepo = new NodeRepository();

        let originalID = faker.name.findName();

        const mixed = [
            new Node({
                container_id: containerID,
                metatype,
                properties: payload,
                original_data_id: faker.name.findName(),
                data_source_id: dataSourceID,
            }),
            new Node({
                container_id: containerID,
                metatype,
                properties: payload,
                original_data_id: originalID,
                data_source_id: dataSourceID,
            }),
            // we're adding a second node with the same original id to test both update feature in the same batch
            // and verify that we've nipped the timestamp bug in the bud - note that the created_at portion of the node
            // will be set by the data_staging record, which take theirs from clock_timestamp so each should have a unique
            // created_at date
            new Node({
                container_id: containerID,
                metatype,
                properties: payload,
                original_data_id: originalID,
                data_source_id: dataSourceID,
                created_at: new Date(),
            }),
        ];

        let saved = await nodeRepo.bulkSave(user, mixed);
        expect(saved.isError, saved.error?.error).false;
        mixed.forEach((node) => {
            expect(node.id).not.undefined;
            expect(node.properties).to.have.deep.property('flower_name', 'Daisy');
        });

        // update the node's payload
        mixed[0].properties = updatedPayload;
        mixed[1].properties = updatedPayload;
        mixed[2].properties = updatedPayload;

        saved = await nodeRepo.bulkSave(user, mixed);
        expect(saved.isError).false;
        mixed.forEach((node) => {
            expect(node.id).not.undefined;
            expect(node.properties).to.have.deep.property('flower_name', 'Violet');
        });

        // check composite id bulk save
        const originalID1 = mixed[0].id;
        const originalID2 = mixed[1].id;
        mixed[0].id = undefined;
        mixed[1].id = undefined;

        saved = await nodeRepo.bulkSave(user, mixed);
        expect(saved.isError).false;
        mixed.forEach((node) => {
            expect(node.id).not.undefined;
            expect(node.id).oneOf([originalID1, originalID2]);
        });

        await nodeRepo.delete(mixed[0]);
        return nodeRepo.delete(mixed[1]);
    });

    it('can fail saving Nodes if properties are malformed', async () => {
        const nodeRepo = new NodeRepository();

        const mixed = new Node({
            container_id: containerID,
            metatype,
            properties: malformed_payload,
        });

        const saved = await nodeRepo.save(mixed, user);
        expect(saved.isError).true;

        return Promise.resolve();
    });

    it('will not update Nodes if they have malformed payloads', async () => {
        const nodeRepo = new NodeRepository();

        const mixed = new Node({
            container_id: containerID,
            metatype,
            properties: payload,
        });

        let saved = await nodeRepo.save(mixed, user);
        expect(saved.isError).false;
        expect(mixed.id).not.undefined;
        expect(mixed.properties).to.have.deep.property('flower_name', 'Daisy');

        // update the node's payload
        mixed.properties = malformed_payload;

        saved = await nodeRepo.save(mixed, user);
        expect(saved.isError).true;

        return nodeRepo.delete(mixed);
    });

    it('will save Nodes with valid regexed payloads', async () => {
        const nodeRepo = new NodeRepository();

        const mixed = new Node({
            container_id: containerID,
            metatype: regexMetatype.id!,
            properties: regex_payload,
        });

        let saved = await nodeRepo.save(mixed, user);
        expect(saved.isError).false;
        expect(mixed.id).not.undefined;

        mixed.properties = regex_payload_fails;

        saved = await nodeRepo.save(mixed, user);
        expect(saved.isError).true;

        return nodeRepo.delete(mixed);
    });

    it('can list Nodes to a file', async () => {
        const nodeRepo = new NodeRepository();

        let originalID = faker.name.findName();

        const mixed = [
            new Node({
                container_id: containerID,
                metatype,
                properties: payload,
                original_data_id: faker.name.findName(),
                data_source_id: dataSourceID,
            }),
            new Node({
                container_id: containerID,
                metatype,
                properties: payload,
                original_data_id: originalID,
                data_source_id: dataSourceID,
            })
        ];

        let saved = await nodeRepo.bulkSave(user, mixed);
        expect(saved.isError, saved.error?.error).false;
        mixed.forEach((node) => {
            expect(node.id).not.undefined;
            expect(node.properties).to.have.deep.property('flower_name', 'Daisy');
        });

        let result = await nodeRepo.where().containerID('eq', containerID).listAllToFile({
            containerID: containerID,
            file_type: "json"
        })

        // check that the result's length is greater than 0
        expect(result.isError).false
        expect(result.value.file_size).gt(0)

        // now try a csv
        result = await nodeRepo.where().containerID('eq', containerID).listAllToFile({
            containerID: containerID,
            file_type: "csv"
        })

        // check that the result's length is greater than 0
        expect(result.isError).false
        expect(result.value.file_size).gt(0)

        await nodeRepo.delete(mixed[0]);
        return nodeRepo.delete(mixed[1]);
    }).timeout(30000);
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

export const single_test_key: MetatypeKey = new MetatypeKey({
    name: 'Test Not Required',
    description: 'not required',
    required: false,
    property_name: 'notRequired',
    data_type: 'number',
});

const regex_payload: {[key: string]: any} = {
    regex: 'Catcat1',
};

const regex_payload_fails: {[key: string]: any} = {
    regex: 'catcat',
};
