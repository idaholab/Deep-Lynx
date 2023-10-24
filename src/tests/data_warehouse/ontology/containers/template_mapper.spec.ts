import faker from 'faker';
import {expect} from 'chai';
import 'reflect-metadata';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerStorage from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Logger from '../../../../services/logger';
import Container, { DataSourceTemplate } from '../../../../domain_objects/data_warehouse/ontology/container';

describe('When managing Data Source Templates, A Container Mapper', async () => {
    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping container tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();

        return Promise.resolve();
    });

    after(async () => {
        return PostgresAdapter.Instance.close();
    });

    it('can add a data source template to the container config', async () => {
        const mapper = ContainerStorage.Instance;

        const container = await createContainer();
        expect(container.isError).false;

        const template = templates[0];

        const created = await mapper.CreateDataSourceTemplate(template, container.value.id!);
        expect(created.isError, created.error?.error).false;
        expect(created.value).not.undefined;
        // fetch the updated container from DB and ensure the config is updated
        // and that no data from the original has been corrupted/removed
        const fetchedContainer = await mapper.Retrieve(container.value.id!);
        expect(fetchedContainer.isError).false;
        expect(fetchedContainer.value).not.empty;

        expect(fetchedContainer.value.name).eq(container.value.name);
        expect(fetchedContainer.value.description).eq(container.value.description);
        expect(fetchedContainer.value.config?.data_source_templates).not.undefined;
        expect(fetchedContainer.value.config?.data_source_templates![0].name).eq('P6');
        expect(fetchedContainer.value.config?.data_source_templates![0].redirect_address).eq('localhost:8181');
        expect(fetchedContainer.value.config?.data_source_templates![0].custom_fields?.length).eq(2);

        return mapper.Delete(container.value.id!);
    })

    it('can bulk add data source templates to the container config', async () => {
        const mapper = ContainerStorage.Instance;

        const container = await createContainer();
        expect(container.isError).false;
        expect(container.value).not.empty;
        const containerID = container.value.id!

        const toCreate = templates.slice(0, 2);

        const created = await mapper.BulkCreateDataSourceTemplates(toCreate, containerID);
        expect(created.isError, created.error?.error).false;
        expect(created.value.length).eq(2);

        // fetch the updated container and ensure config is updated
        const fetchedContainer = await mapper.Retrieve(container.value.id!);
        expect(fetchedContainer.isError).false;
        expect(fetchedContainer.value).not.empty;

        expect(fetchedContainer.value.name).eq(container.value.name);
        expect(fetchedContainer.value.description).eq(container.value.description);
        expect(fetchedContainer.value.config?.data_source_templates).not.undefined;
        const fetchedTemplates = fetchedContainer.value.config?.data_source_templates!;
        expect(fetchedTemplates.length).eq(2);
        expect(fetchedTemplates[0].name).eq('P6');
        expect(fetchedTemplates[1].name).eq('Jazz');

        return mapper.Delete(containerID);
    });

    it('can retrieve data source template via ID if it exists', async () => {
        const mapper = ContainerStorage.Instance;

        const container = await createContainer();
        expect(container.isError).false;
        expect(container.value).not.empty;
        const containerID = container.value.id!

        const toCreate = templates.slice(0, 2);

        const created = await mapper.BulkCreateDataSourceTemplates(toCreate, containerID);
        expect(created.isError, created.error?.error).false;
        expect(created.value).not.undefined;
        expect(created.value.length).eq(2);

        // retrieve one of the existing templates
        let retrieved = await mapper.RetrieveDataSourceTemplateByID(toCreate[0].id!, containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.id).eq(toCreate[0].id);
        expect(retrieved.value.name).eq(toCreate[0].name);

        // now attempt to retrieve a nonexistent template- should return a 404
        retrieved = await mapper.RetrieveDataSourceTemplateByID('123', containerID);
        expect(retrieved.isError).true;
        expect(retrieved.error?.errorCode).eq(404);

        return mapper.Delete(containerID);
    });

    it('can retrieve data source template via name if it exists', async () => {
        const mapper = ContainerStorage.Instance;

        const container = await createContainer();
        expect(container.isError).false;
        expect(container.value).not.empty;
        const containerID = container.value.id!

        const toCreate = templates.slice(0, 2);

        const created = await mapper.BulkCreateDataSourceTemplates(toCreate, containerID);
        expect(created.isError, created.error?.error).false;
        expect(created.value).not.undefined;
        expect(created.value.length).eq(2);

        // retrieve one of the existing templates
        let retrieved = await mapper.RetrieveDataSourceTemplateByName(toCreate[1].name!, containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.id).eq(toCreate[1].id);
        expect(retrieved.value.name).eq(toCreate[1].name);

        // now attempt to retrieve a nonexistent template- should return a 404
        retrieved = await mapper.RetrieveDataSourceTemplateByName('bob', containerID);
        expect(retrieved.isError).true;
        expect(retrieved.error?.errorCode).eq(404);

        return mapper.Delete(containerID);
    });

    it('can list an array of data source templates from the container config', async() => {
        const mapper = ContainerStorage.Instance;

        const container = await createContainer();
        expect(container.isError).false;
        expect(container.value).not.empty;
        const containerID = container.value.id!

        const toCreate = templates.slice(0, 2);

        const created = await mapper.BulkCreateDataSourceTemplates(toCreate, containerID);
        expect(created.isError, created.error?.error).false;
        expect(created.value).not.undefined;
        expect(created.value.length).eq(2);

        const retrieved = await mapper.ListDataSourceTemplates(containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.length).eq(2);
        expect(retrieved.value[1].name).eq('Jazz');

        return mapper.Delete(containerID);
    });

    it('can update a data source template within the container config', async () => {
        const mapper = ContainerStorage.Instance;

        const container = await createContainer();
        expect(container.isError).false;
        expect(container.value).not.empty;
        const containerID = container.value.id!

        const toCreate = templates.slice(0, 2);

        const created = await mapper.BulkCreateDataSourceTemplates(toCreate, containerID);
        expect(created.isError, created.error?.error).false;
        expect(created.value).not.undefined;
        expect(created.value.length).eq(2);

        // check the pre-update values
        let retrieved = await mapper.ListDataSourceTemplates(containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.length).eq(2);
        expect(retrieved.value[1].name).eq(templates[1].name);
        expect(retrieved.value[1].custom_fields?.length).eq(1);

        // update the DataSourceTemplate by matching on ID
        const newTemplate = new DataSourceTemplate({
            id: retrieved.value[1].id,
            name: 'Jazz',
            custom_fields: [
                {name: 'username', value: 'username value', required: true, encrypt: true},
                {name: 'password', value: 'password value', required: true, encrypt: true},
            ],
        });

        const updated = await mapper.UpdateDataSourceTemplate(newTemplate, containerID);
        expect(updated.isError, updated.error?.error).false;
        expect(updated.value).not.undefined;

        // check to see that update was made properly
        retrieved = await mapper.ListDataSourceTemplates(containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.length).eq(2);
        expect(retrieved.value[1].name).eq(newTemplate.name);
        expect(retrieved.value[1].custom_fields?.length).eq(2);
        expect(retrieved.value[1].custom_fields![0].name).eq('username');
        expect(retrieved.value[1].custom_fields![0].required).true;

        return mapper.Delete(containerID);
    });

    it('can remove a data source template from a container', async () => {
        const mapper = ContainerStorage.Instance;

        const container = await createContainer();
        expect(container.isError).false;
        expect(container.value).not.empty;
        const containerID = container.value.id!

        const toCreate = templates.slice(0, 2);

        const created = await mapper.BulkCreateDataSourceTemplates(toCreate, containerID);
        expect(created.isError, created.error?.error).false;
        expect(created.value).not.undefined;
        expect(created.value.length).eq(2);

        let retrieved = await mapper.ListDataSourceTemplates(containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.length).eq(2);

        const deleted = await mapper.DeleteDataSourceTemplate(templates[0].id!, containerID);
        expect(deleted.isError, deleted.error?.error).false;
        expect(deleted.value).not.undefined;

        // ensure the delete went through and that template1 was removed
        retrieved = await mapper.ListDataSourceTemplates(containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.length).eq(1);
        expect(retrieved.value[0].name).eq(templates[1].name);

        return mapper.Delete(containerID);
    });

    it('can bulk remove data source templates from a container', async () => {
        const mapper = ContainerStorage.Instance;

        const container = await createContainer();
        expect(container.isError).false;
        expect(container.value).not.empty;
        const containerID = container.value.id!

        const toCreate = templates.slice(0, 2);

        const created = await mapper.BulkCreateDataSourceTemplates(toCreate, containerID);
        expect(created.isError, created.error?.error).false;
        expect(created.value).not.undefined;
        expect(created.value.length).eq(2);

        // ensure the data source templates were created before we delete them
        let retrieved = await mapper.ListDataSourceTemplates(containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.length).eq(2);

        const toDelete = templates.map(t => t.id!);
        const deleted = await mapper.BulkDeleteDataSourceTemplates(toDelete, containerID);
        expect(deleted.isError, deleted.error?.error).false;
        expect(deleted.value).not.undefined;
        expect(deleted.value.length).eq(0);

        retrieved = await mapper.ListDataSourceTemplates(containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.length).eq(0);

        return mapper.Delete(containerID);
    });

    it('can authorize a data source template', async () => {
        const mapper = ContainerStorage.Instance;

        const container = await createContainer();
        expect(container.isError).false;
        expect(container.value).not.empty;
        const containerID = container.value.id!

        const template = templates[0]

        const added = await mapper.CreateDataSourceTemplate(template, container.value.id!);
        expect(added.isError, added.error?.error).false;
        expect(added.value).not.undefined;
        expect(added.value.length).eq(1);

        let retrieved = await mapper.ListDataSourceTemplates(containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value).not.undefined;
        expect(retrieved.value.length).eq(1);
        expect(retrieved.value[0].name).eq('P6');
        expect(retrieved.value[0].authorized).false;
        const templateName = retrieved.value[0].name!;

        // authorize the data source template
        const authorized = await mapper.AuthorizeDataSourceTemplate(templateName, containerID);
        expect(authorized.isError, authorized.error?.error).false;
        expect(authorized.value).not.undefined;

        retrieved = await mapper.ListDataSourceTemplates(containerID);
        expect(retrieved.isError, retrieved.error?.error).false;
        expect(retrieved.value.length).eq(1);
        expect(retrieved.value[0].authorized).true;

        return mapper.Delete(containerID);
    });
});

const templates: DataSourceTemplate[] = [
    new DataSourceTemplate({
        name: 'P6',
        custom_fields: [
            {name: 'username', value: 'username value', required: true, encrypt: true},
            {name: 'password', value: 'password value', required: true, encrypt: true},
        ],
        redirect_address: 'localhost:8181'
    }),
    new DataSourceTemplate({
        name: 'Jazz',
        custom_fields: [
            {name: 'token', value: 'token value', required: true, encrypt: true},
        ],
    }),
    new DataSourceTemplate({
        name: 'Windchill',
        custom_fields: [
            {name: 'token', value: 'token value', required: true, encrypt: true},
        ],
    }),
];

async function createContainer() {
    return ContainerStorage.Instance.Create(
        'test suite',
        new Container({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        }),
    );
}