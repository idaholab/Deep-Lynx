import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Logger from '../../../services/logger';
import { User } from '../../../domain_objects/access_management/user';
import Container, {CustomTemplateField, DataSourceTemplate} from '../../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import { expect } from 'chai';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import DataSourceRepository, { DataSourceFactory } from '../../../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import DataSourceRecord, { CustomDataSourceConfig } from '../../../domain_objects/data_warehouse/import/data_source';
import {instanceToPlain} from "class-transformer";

describe('A Custom Data Source implementation', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;
    const sourceRepo: DataSourceRepository = new DataSourceRepository();

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping custom adapter tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();
        const mapper = ContainerMapper.Instance;

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
        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can save a template in a custom source', async () => {
        const template = new DataSourceTemplate({
            name: 'test123',
        });

        const config = new CustomDataSourceConfig({template});

        const source = await createSource(containerID, config);

        const results = await sourceRepo.save(source!, user);
        expect(results.isError, results.error?.error).false;
        expect(results.value).true;

        return sourceRepo.delete(source!, {force: true, removeData: true});
    });

    it('fails validation if a required or encrypted field is undefined', async () => {
        // attempt to save an encrypted custom field with no value
        let template = new DataSourceTemplate({
            name: 'encrypted- no value',
            custom_fields: [{
                name: 'test',
                encrypt: true
            }]
        });

        let config = new CustomDataSourceConfig({template});
        let source = await createSource(containerID, config);
        let results = await sourceRepo.save(source!, user);
        expect(results.isError).true;
        expect(results.error).to.have.property('error');
        expect(results.error?.error).to.include('All encrypted fields must be required and have a value present');

        // attempt to save a required custom field with no value
        template = new DataSourceTemplate({
            name: 'required- no value',
            custom_fields: [{
                name: 'test',
                required: true
            }]
        });

        config = new CustomDataSourceConfig({template});
        source = await createSource(containerID, config);
        results = await sourceRepo.save(source!, user);
        expect(results.isError).true;
        expect(results.error).to.have.property('error');
        expect(results.error?.error).to.include('All required fields must have a value present');

        // attempt to save an encrypted custom field that is not required
        template = new DataSourceTemplate({
            name: 'encrypted- not required',
            custom_fields: [{
                name: 'test',
                value: 'value to encrypt',
                encrypt: true,
                required: false
            }]
        });

        config = new CustomDataSourceConfig({template});
        source = await createSource(containerID, config);
        results = await sourceRepo.save(source!, user);
        expect(results.isError).true;
        expect(results.error).to.have.property('error');
        expect(results.error?.error).to.include('All encrypted fields must be required and have a value present');

        return sourceRepo.delete(source!, {force: true, removeData: true});
    });

    it('hides values when class is converted to plain', async () => {
        let template = new DataSourceTemplate({
            name: 'encryption test',
            custom_fields: [{
                name: 'encrypt this',
                required: true,
                encrypt: true,
                value: 'hidden value'
            },{
                name: 'another thing',
                value: 'also hidden'
            },{
                name: 'thing three',
                encrypt: false,
                value: 'believe it or not, hidden'
            }]
        });

        const config = new CustomDataSourceConfig({template});
        const source = await createSource(containerID, config);
        const results = await sourceRepo.save(source!, user);
        expect(results.isError, results.error?.error).false;
        expect(results.value).true;

        const list = await sourceRepo.where().containerID('eq', containerID).list();
        expect(list.isError).false;
        expect(list.value).not.undefined;
        // convert to plain and check out the config to ensure no values are present
        let toPlainFields = instanceToPlain(list.value)[0].DataSourceRecord.config.template.custom_fields;
        toPlainFields.forEach((field: CustomTemplateField) => {
            expect(field.value).undefined;
        });
        // now ignore decorators to simulate an API request for the decrypted record
        toPlainFields = instanceToPlain(list.value, {ignoreDecorators: true})[0].DataSourceRecord.config.template.custom_fields;
        expect(toPlainFields[0].value).eq(template.custom_fields![0].value);
        expect(toPlainFields[1].value).eq(template.custom_fields![1].value);
        expect(toPlainFields[2].value).eq(template.custom_fields![2].value);

        return sourceRepo.delete(source!, {force: true, removeData: true});
    });
});

async function createSource(containerID: string, config: CustomDataSourceConfig) {
    return new DataSourceFactory().fromDataSourceRecord(
        new DataSourceRecord({
            container_id: containerID,
            name: 'Test Custom Source',
            active: false,
            adapter_type: 'custom',
            data_format: 'json',
            config
        })
    );
}