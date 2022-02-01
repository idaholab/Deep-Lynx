import {User} from '../../../domain_objects/access_management/user';
import Logger from '../../../services/logger';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerStorage from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import {expect} from 'chai';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import DataSourceRecord from '../../../domain_objects/data_warehouse/import/data_source';
import DataSourceRepository, {DataSourceFactory} from '../../../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import StandardDataSourceImpl from '../../../interfaces_and_impl/data_warehouse/import/standard_data_source_impl';
import HttpDataSourceImpl from '../../../interfaces_and_impl/data_warehouse/import/http_data_source_impl';
import AvevaDataSourceImpl from '../../../interfaces_and_impl/data_warehouse/import/aveva_data_source';
import JazzDataSourceImpl from '../../../interfaces_and_impl/data_warehouse/import/jazz_data_source_impl';
import fs from 'fs';
import DataStagingRepository from '../../../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import {toStream} from '../../../services/utilities';
import Import, {DataStaging} from '../../../domain_objects/data_warehouse/import/import';

const csv = require('csvtojson');

// Generally testing the standard implementation to verify that the ReceiveData and other underlying functions that most
// other implementations rely on function ok.
describe('A Standard DataSource Implementation can', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;
    let dataSource: StandardDataSourceImpl | HttpDataSourceImpl | AvevaDataSourceImpl | JazzDataSourceImpl | undefined;

    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping export tests, no storage layer');
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

        // we're going to build at least one data source from scratch before
        // so that tests can use this instead of building their own if they can
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
        dataSource = new DataSourceFactory().fromDataSourceRecord(exp.value);

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        return ContainerMapper.Instance.Delete(containerID);
    });

    it('can receive data from an array of objects', async () => {
        // build the data source first
        const sourceRepo = new DataSourceRepository();

        const source = new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        let results = await sourceRepo.save(source!, user);
        expect(results.isError).false;
        expect(source!.DataSourceRecord?.id).not.undefined;

        // now we create an import through the datasource
        const newImport = await source!.ReceiveData(toStream([sampleObject]), user, {overrideJsonStream: true});
        expect(newImport.isError).false;
        expect((newImport.value as Import).id).not.undefined;

        // verify the data actually wrote - should be a total of 1 record
        const stagingRepo = new DataStagingRepository();
        const result = await stagingRepo
            .where()
            .importID('eq', (newImport.value as Import).id)
            .count();
        expect(result.isError).false;
        expect(result.value).eq(1);

        return Promise.resolve();
    });

    it('can receive data from an array of objects, and return data staging records', async () => {
        // build the data source first
        const sourceRepo = new DataSourceRepository();

        const source = new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        let results = await sourceRepo.save(source!, user);
        expect(results.isError).false;
        expect(source!.DataSourceRecord?.id).not.undefined;

        // now we create an import through the datasource
        const newImport = await source!.ReceiveData(toStream([sampleObject]), user, {overrideJsonStream: true, returnStagingRecords: true});
        expect(newImport.isError).false;
        expect((newImport.value as DataStaging[]).length === 1).true;

        // verify the data actually wrote - should be a total of 1 record
        const stagingRepo = new DataStagingRepository();
        const result = await stagingRepo.where().dataSourceID('eq', source?.DataSourceRecord?.id).list();

        expect(result.isError).false;
        expect(result.value.length).eq(1);

        expect((newImport.value as DataStaging[])[0].id).eq(result.value[0].id);

        return Promise.resolve();
    });

    it('can receive data from a valid JSON file stream', async () => {
        // build the data source first
        const sourceRepo = new DataSourceRepository();

        const source = new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        let results = await sourceRepo.save(source!, user);
        expect(results.isError).false;
        expect(source!.DataSourceRecord?.id).not.undefined;

        // write the json test data out to a temporary file
        fs.writeFileSync('./test-data.json', sampleJSON);

        // now we create an import through the datasource
        const newImport = await source!.ReceiveData(fs.createReadStream('./test-data.json'), user);
        expect(newImport.isError).false;
        expect((newImport.value as Import).id).not.undefined;

        // verify the data actually wrote - should be a total of 1 record
        const stagingRepo = new DataStagingRepository();
        const result = await stagingRepo
            .where()
            .importID('eq', (newImport.value as Import).id)
            .count();
        expect(result.isError).false;
        expect(result.value).eq(1);

        fs.unlinkSync('./test-data.json');

        return Promise.resolve();
    });

    it('can receive data from a valid CSV file stream', async () => {
        // build the data source first
        const sourceRepo = new DataSourceRepository();

        const source = new DataSourceFactory().fromDataSourceRecord(
            new DataSourceRecord({
                container_id: containerID,
                name: 'Test Data Source',
                active: false,
                adapter_type: 'standard',
                data_format: 'json',
            }),
        );

        let results = await sourceRepo.save(source!, user);
        expect(results.isError).false;
        expect(source!.DataSourceRecord?.id).not.undefined;

        // write the json test data out to a temporary file
        fs.writeFileSync('./test-data.csv', sampleCSV);

        // now we create an import through the datasource
        const newImport = await source!.ReceiveData(fs.createReadStream('./test-data.csv'), user, {
            transformStreams: [
                csv({
                    downstreamFormat: 'array', // this is necessary as the ReceiveData expects an array of json, not single objects
                }),
            ],
        });
        expect(newImport.isError).false;
        expect((newImport.value as Import).id).not.undefined;

        // verify the data actually wrote - should be a total of 2 records
        const stagingRepo = new DataStagingRepository();
        const result = await stagingRepo
            .where()
            .importID('eq', (newImport.value as Import).id)
            .count();
        expect(result.isError).false;
        expect(result.value).eq(2);

        fs.unlinkSync('./test-data.csv');

        return Promise.resolve();
    });
});

const sampleCSV = "id,name,start_date,average_visits_per_year \n UUID,test car's maintenance,1/1/2020 12:00,4 \n UUID,test car's maintenance,1/1/2020 12:00,4";

const sampleJSON = JSON.stringify([
    {
        car: {
            id: 'UUID',
            name: 'test car',
            manufacturer: {
                id: 'UUID',
                name: 'Test Cars Inc',
                location: 'Seattle, WA',
            },
            tire_pressures: [
                {
                    id: 'tire0',
                    measurement_unit: 'PSI',
                    measurement: 35.08,
                    measurement_name: 'tire pressure',
                },
                {
                    id: 'tire1',
                    measurement_unit: 'PSI',
                    measurement: 35.45,
                    measurement_name: 'tire pressure',
                },
                {
                    id: 'tire2',
                    measurement_unit: 'PSI',
                    measurement: 34.87,
                    measurement_name: 'tire pressure',
                },
                {
                    id: 'tire3',
                    measurement_unit: 'PSI',
                    measurement: 37.22,
                    measurement_name: 'tire pressure',
                },
            ],
        },
        car_maintenance: {
            id: 'UUID',
            name: "test car's maintenance",
            start_date: '1/1/2020 12:00:00',
            average_visits_per_year: 4,
            maintenance_entries: [
                {
                    id: 1,
                    check_engine_light_flag: true,
                    type: 'oil change',
                    parts_list: [
                        {
                            id: 'oil',
                            name: 'synthetic oil',
                            price: 45.66,
                            quantity: 1,
                            components: [
                                {
                                    id: 1,
                                    name: 'oil',
                                },
                            ],
                        },
                        {
                            id: 'pan',
                            name: 'oil pan',
                            price: 15.5,
                            quantity: 1,
                            components: [],
                        },
                    ],
                },
                {
                    id: 2,
                    check_engine_light_flag: false,
                    type: 'tire rotation',
                    parts_list: [
                        {
                            id: 'tire',
                            name: 'all terrain tire',
                            price: 150.99,
                            quantity: 4,
                            components: [],
                        },
                        {
                            id: 'wrench',
                            name: 'wrench',
                            price: 4.99,
                            quantity: 1,
                            components: [],
                        },
                        {
                            id: 'bolts',
                            name: 'bolts',
                            price: 1.99,
                            quantity: 5,
                            components: [],
                        },
                    ],
                },
            ],
        },
    },
]);

const sampleObject = {
    car: {
        id: 'UUID',
        name: 'test car',
        manufacturer: {
            id: 'UUID',
            name: 'Test Cars Inc',
            location: 'Seattle, WA',
        },
        tire_pressures: [
            {
                id: 'tire0',
                measurement_unit: 'PSI',
                measurement: 35.08,
                measurement_name: 'tire pressure',
            },
            {
                id: 'tire1',
                measurement_unit: 'PSI',
                measurement: 35.45,
                measurement_name: 'tire pressure',
            },
            {
                id: 'tire2',
                measurement_unit: 'PSI',
                measurement: 34.87,
                measurement_name: 'tire pressure',
            },
            {
                id: 'tire3',
                measurement_unit: 'PSI',
                measurement: 37.22,
                measurement_name: 'tire pressure',
            },
        ],
    },
    car_maintenance: {
        id: 'UUID',
        name: "test car's maintenance",
        start_date: '1/1/2020 12:00:00',
        average_visits_per_year: 4,
        maintenance_entries: [
            {
                id: 1,
                check_engine_light_flag: true,
                type: 'oil change',
                parts_list: [
                    {
                        id: 'oil',
                        name: 'synthetic oil',
                        price: 45.66,
                        quantity: 1,
                        components: [
                            {
                                id: 1,
                                name: 'oil',
                            },
                        ],
                    },
                    {
                        id: 'pan',
                        name: 'oil pan',
                        price: 15.5,
                        quantity: 1,
                        components: [],
                    },
                ],
            },
            {
                id: 2,
                check_engine_light_flag: false,
                type: 'tire rotation',
                parts_list: [
                    {
                        id: 'tire',
                        name: 'all terrain tire',
                        price: 150.99,
                        quantity: 4,
                        components: [],
                    },
                    {
                        id: 'wrench',
                        name: 'wrench',
                        price: 4.99,
                        quantity: 1,
                        components: [],
                    },
                    {
                        id: 'bolts',
                        name: 'bolts',
                        price: 1.99,
                        quantity: 5,
                        components: [],
                    },
                ],
            },
        ],
    },
};
