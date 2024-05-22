import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../../services/logger';
import Container, { DataSourceTemplate } from '../../../../domain_objects/data_warehouse/ontology/container';
import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';
import ContainerRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/container_respository';
import {KeyPair, User} from '../../../../domain_objects/access_management/user';
import KeyPairRepository from '../../../../data_access_layer/repositories/access_management/keypair_repository';
import UserRepository from '../../../../data_access_layer/repositories/access_management/user_repository';
import Config from '../../../../services/config';
import NodeRSA from 'node-rsa';

describe('When managing Data Source Templates, A Container Repository', async () => {
    let user: User;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping container tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();

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

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        void PostgresAdapter.Instance.close();
        return Promise.resolve();
    });

    it('can save a data source template (both create and update)', async () => {
        const repo = new ContainerRepository();
        const container = createContainer();
        const containerSaved = await repo.save(container, user);
        expect(containerSaved.isError, containerSaved.error?.error).false;
        expect(container.id).not.undefined;
        const containerID = container.id!;

        let template = templates[0];

        let saved = await repo.saveDataSourceTemplate(template, containerID);
        expect(saved.isError, saved.error?.error).false;

        // fetch the container to see if the template was created
        let fetchedContainer = await repo.findByID(containerID);
        expect(fetchedContainer.isError).false;
        expect(fetchedContainer.value).not.empty;
        expect(fetchedContainer.value.name).eq(container.name);
        expect(fetchedContainer.value.config?.data_source_templates).not.undefined;
        expect(fetchedContainer.value.config?.data_source_templates?.length).eq(1);

        let fetchedTemplate = fetchedContainer.value.config?.data_source_templates![0]!;
        expect(fetchedTemplate.name).eq('P6');
        expect(fetchedTemplate.custom_fields?.length).eq(2);
        expect(fetchedTemplate.id).not.undefined;

        // update by ID
        template = new DataSourceTemplate({
            id: fetchedTemplate.id,
            name: 'P7',
            custom_fields: [
                {name: 'username', value: 'new username', required: true, encrypt: true},
                {name: 'password', value: 'new password', required: true, encrypt: true},
            ],
        });

        saved = await repo.saveDataSourceTemplate(template, containerID);
        expect(saved.isError, saved.error?.error).false;

        // fetch the container to see if the template was updated
        fetchedContainer = await repo.findByID(containerID);
        expect(fetchedContainer.value.config?.data_source_templates).not.undefined;
        expect(fetchedContainer.value.config?.data_source_templates?.length).eq(1);

        fetchedTemplate = fetchedContainer.value.config?.data_source_templates![0]!;
        expect(fetchedTemplate.name).eq('P7');
        expect(fetchedTemplate.custom_fields?.length).eq(2);

        // update by name
        template = new DataSourceTemplate({
            name: 'P7',
            custom_fields: [
                {name: 'token', value: 'new token', required: true, encrypt: true},
            ],
        });

        saved = await repo.saveDataSourceTemplate(template, containerID);
        expect(saved.isError, saved.error?.error).false;

        // fetch the container to see if the template was updated
        fetchedContainer = await repo.findByID(containerID);
        expect(fetchedContainer.value.config?.data_source_templates).not.undefined;
        expect(fetchedContainer.value.config?.data_source_templates?.length).eq(1);

        fetchedTemplate = fetchedContainer.value.config?.data_source_templates![0]!;
        expect(fetchedTemplate.name).eq('P7');
        expect(fetchedTemplate.custom_fields?.length).eq(1);

        return repo.delete(container);
    });

    it('will fail validation if the rules are broken', async () => {
        const repo = new ContainerRepository();
        const container = createContainer();
        const containerSaved = await repo.save(container, user);
        expect(containerSaved.isError, containerSaved.error?.error).false;
        expect(container.id).not.undefined;
        const containerID = container.id!;

        // rule 1: all required fields must have value present
        let toSave = new DataSourceTemplate({
            name: 'required undefined field',
            custom_fields: [{
                name: 'bob',
                required: true
            }]
        });

        let saved = await repo.saveDataSourceTemplate(toSave, containerID);
        expect(saved.isError).true;
        expect(saved.error?.error).contains('All required fields must have a value present');

        // rule 2: all encrypted fields must be required (required = false)
        toSave = new DataSourceTemplate({
            name: 'required undefined field',
            custom_fields: [{
                name: 'bob',
                required: false,
                encrypt: true
            }]
        });

        saved = await repo.saveDataSourceTemplate(toSave, containerID);
        expect(saved.isError).true;
        expect(saved.error?.error).contains('All encrypted fields must be required and have a value present');

        // rule 2: all encrypted fields must be required (required = undefined)
        toSave = new DataSourceTemplate({
            name: 'required undefined field',
            custom_fields: [{
                name: 'bob',
                encrypt: true,
                value: 'greg'
            }]
        });

        saved = await repo.saveDataSourceTemplate(toSave, containerID);
        expect(saved.isError).true;
        expect(saved.error?.error).contains('All encrypted fields must be required and have a value present');

        return repo.delete(container);
    });

    it('can bulk save data source templates', async () => {
        const repo = new ContainerRepository();
        const container = createContainer();
        const containerSaved = await repo.save(container, user);
        expect(containerSaved.isError, containerSaved.error?.error).false;
        expect(container.id).not.undefined;
        const containerID = container.id!;

        let toSave = templates.slice(0, 2);

        let saved = await repo.bulkSaveDataSourceTemplates(toSave, containerID);
        expect(saved.isError, saved.error?.error).false;

        // fetch the updated container and make sure both templates were added
        let fetchedContainer = await repo.findByID(containerID);
        expect(fetchedContainer.isError).false;
        expect(fetchedContainer.value.config?.data_source_templates).not.undefined;
        expect(fetchedContainer.value.config?.data_source_templates?.length).eq(2);

        let fetchedTemplates = fetchedContainer.value.config?.data_source_templates!;
        expect(fetchedTemplates[0].id).not.undefined;
        expect(fetchedTemplates[0].name).eq('P6');
        expect(fetchedTemplates[0].custom_fields?.length).eq(2);
        expect(fetchedTemplates[1].name).eq('Jazz');
        expect(fetchedTemplates[1].custom_fields?.length).eq(1);

        // update the two existing templates (one by name, one by ID) and add a third
        toSave = [
            new DataSourceTemplate({
                id: fetchedTemplates[0].id, // update by ID
                name: 'P7',
                custom_fields: [
                    {name: 'username', value: 'new username', required: true, encrypt: true},
                    {name: 'password', value: 'new password', required: true, encrypt: true},
                    {name: 'extra field'}
                ],
            }),
            new DataSourceTemplate({
                name: 'Jazz', // update by name
                custom_fields: [
                    {name: 'token', value: 'new token', required: true, encrypt: true},
                    {name: 'extra field'}
                ],
            }),
            templates[2]
        ];

        saved = await repo.bulkSaveDataSourceTemplates(toSave, containerID);
        expect(saved.isError, saved.error?.error).false;

        // fetch the updated container and make sure all templates are appropriate
        fetchedContainer = await repo.findByID(containerID);
        expect(fetchedContainer.isError).false;
        expect(fetchedContainer.value.config?.data_source_templates).not.undefined;
        expect(fetchedContainer.value.config?.data_source_templates?.length).eq(3);

        fetchedTemplates = fetchedContainer.value.config?.data_source_templates!;
        expect(fetchedTemplates[0].name).eq('P7');
        expect(fetchedTemplates[0].custom_fields?.length).eq(3);
        expect(fetchedTemplates[0].custom_fields![2].name).eq('extra field');
        expect(fetchedTemplates[1].name).eq('Jazz');
        expect(fetchedTemplates[1].custom_fields?.length).eq(2);
        expect(fetchedTemplates[1].custom_fields![1].name).eq('extra field');
        expect(fetchedTemplates[2].name).eq('Windchill');

        return repo.delete(container);
    });

    it('can return a list of existing data source templates', async () => {
        const repo = new ContainerRepository();
        const container = createContainer();
        const containerSaved = await repo.save(container, user);
        expect(containerSaved.isError, containerSaved.error?.error).false;
        expect(container.id).not.undefined;
        const containerID = container.id!;

        const saved = await repo.bulkSaveDataSourceTemplates(templates, containerID);
        expect(saved.isError, saved.error?.error).false;

        const retrieved = await repo.listDataSourceTemplates(containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.length).eq(3);
        expect(retrieved.value[0].name).eq('P6');
        expect(retrieved.value[1].name).eq('Jazz');
        expect(retrieved.value[2].name).eq('Windchill');

        return repo.delete(container);
    });

    it('encrypts custom field values if encrypt is specified', async () => {
        const repo = new ContainerRepository();
        const container = createContainer();
        const containerSaved = await repo.save(container, user);
        expect(containerSaved.isError, containerSaved.error?.error).false;
        expect(container.id).not.undefined;
        const containerID = container.id!;

        const saved = await repo.saveDataSourceTemplate(encryptTemplate, containerID);
        expect(saved.isError, saved.error?.error).false;

        const retrieved = await repo.listDataSourceTemplates(containerID);
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.length).eq(1);
        const fields = retrieved.value[0].custom_fields!;
        expect(fields).not.undefined;
        expect(fields.length).eq(4);
        // value should be encrypted version of the value, not the raw one
        expect(fields[0].value).not.eq(encryptTemplate.custom_fields![0].value);
        // decrypt to ensure encryption worked properly
        expect(decrypt(fields[0].value!)).eq(encryptTemplate.custom_fields![0].value);
        // this value should be the same, and should not be encrypted
        expect(fields[1].value).eq(encryptTemplate.custom_fields![1].value);
        // value should be undefined here
        expect(fields[2].value).undefined;
        // value, encrypt, and required should be undefined here
        expect(fields[3].value).undefined;
        expect(fields[3].encrypt).undefined;
        expect(fields[3].required).undefined;

        return repo.delete(container);
    });

    it('can remove a data source template from a container', async () => {
        const repo = new ContainerRepository();
        const container = createContainer();
        const containerSaved = await repo.save(container, user);
        expect(containerSaved.isError, containerSaved.error?.error).false;
        expect(container.id).not.undefined;
        const containerID = container.id!;

        const saved = await repo.bulkSaveDataSourceTemplates(templates, containerID);
        expect(saved.isError, saved.error?.error).false;

        let retrieved = await repo.listDataSourceTemplates(containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.length).eq(3);

        const toDelete = templates.slice(0, 2).map(t => t.id!);
        const deleted = await repo.bulkDeleteDataSourceTemplates(toDelete, containerID);
        expect(deleted.isError, saved.error?.error).false;

        retrieved = await repo.listDataSourceTemplates(containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.length).eq(1);
        expect(retrieved.value[0].name).eq('Windchill');

        return repo.delete(container);
    });

    it('can authorize a data source template on keypair creation', async () => {
        const repo = new ContainerRepository();
        const container = createContainer();
        const containerSaved = await repo.save(container, user);
        expect(containerSaved.isError, containerSaved.error?.error).false;
        expect(container.id).not.undefined;
        const containerID = container.id!;

        let template = templates[0];
        let saved = await repo.saveDataSourceTemplate(template, containerID);
        expect(saved.isError, saved.error?.error).false;

        let retrieved = await repo.listDataSourceTemplates(containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.length).eq(1);
        expect(retrieved.value[0].authorized).false;

        // create a service user and generate a key pair
        const userRepo = new UserRepository();
        const serviceUser = new User({
            identity_provider: 'service',
            admin: false,
            display_name: faker.name.findName(),
            type: 'service'
        });

        const serviceUserSaved = await userRepo.save(serviceUser, user);
        expect(serviceUserSaved.isError, saved.error?.error).false;
        expect(serviceUser.id).not.undefined;

        const keyRepo = new KeyPairRepository();
        const keyPair = new KeyPair(serviceUser.id, 'p6_adapter_auth');
        const keyPairSaved = await keyRepo.save(keyPair, serviceUser, containerID);
        expect(keyPairSaved.isError, keyPairSaved.error?.error).false;
        expect(keyPairSaved.value).not.undefined;

        // list the adapter templates again- this time authorized should be true
        retrieved = await repo.listDataSourceTemplates(containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value[0].authorized).true;

        return repo.delete(container);
    });
});

const templates: DataSourceTemplate[] = [
    new DataSourceTemplate({
        name: 'P6',
        custom_fields: [
            {name: 'username', value: 'old username', required: true, encrypt: true},
            {name: 'password', value: 'old password', required: true, encrypt: true},
        ],
    }),
    new DataSourceTemplate({
        name: 'Jazz',
        custom_fields: [
            {name: 'token', value: 'old token', required: true, encrypt: true},
        ],
    }),
    new DataSourceTemplate({
        name: 'Windchill',
        custom_fields: [
            {name: 'token', value: 'old token', required: true, encrypt: true},
        ],
    }),
];

const encryptTemplate: DataSourceTemplate = new DataSourceTemplate({
    name: 'testing encryption',
    custom_fields: [
        {name: 'encrypted', value: 'secret value', required: true, encrypt: true},
        {name: 'unencrypted', value: 'regular value', required: true},
        {name: 'not required', required: false},
        {name: 'just name'}
    ]
})

function createContainer() {
    return new Container({
        name: faker.name.findName(),
        description: faker.random.alphaNumeric(),
    });
}

function decrypt(toDecrypt: string) {
    const key = new NodeRSA(Config.encryption_key_secret);
    return key.decryptPublic(toDecrypt, 'utf8');
}