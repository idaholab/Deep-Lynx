import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerStorage from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import {expect} from 'chai';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Logger from '../../../../services/logger';
import DataSourceMapper from '../../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import MetatypeMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import MetatypeKeyMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import TypeMappingMapper from '../../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';
import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';
import TypeMapping from '../../../../domain_objects/data_warehouse/etl/type_mapping';
import {test_keys} from '../../etl/type_transformation_mapper.spec';
import TypeTransformationMapper from '../../../../data_access_layer/mappers/data_warehouse/etl/type_transformation_mapper';
import TypeTransformation, {KeyMapping} from '../../../../domain_objects/data_warehouse/etl/type_transformation';
import TimeseriesEntry, {TimeseriesData} from '../../../../domain_objects/data_warehouse/data/timeseries';
import TimeseriesEntryMapper from '../../../../data_access_layer/mappers/data_warehouse/data/timeseries_entry_mapper';
import TimeseriesEntryRepository from '../../../../data_access_layer/repositories/data_warehouse/data/timeseries_entry_repository';

describe('A Timeseries Repository', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let transformationID: string = '';
    let transformation2ID: string = '';

    // this covers testing the hypertable creeation and deletion as well
    before(async function () {
        if (process.env.CORE_DB_CONNECTION_STRING === '') {
            Logger.debug('skipping export tests, no storage layer');
            this.skip();
        }

        await PostgresAdapter.Instance.init();
        const mapper = ContainerStorage.Instance;
        const mMapper = MetatypeMapper.Instance;
        const keyStorage = MetatypeKeyMapper.Instance;
        const mappingStorage = TypeMappingMapper.Instance;

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

        const keys = await keyStorage.BulkCreate('test suite', testKeys);
        expect(keys.isError).false;

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

        const mapping = await mappingStorage.CreateOrUpdate(
            'test suite',
            new TypeMapping({
                container_id: containerID,
                data_source_id: exp.value.id!,
                sample_payload: test_raw_payload,
            }),
        );

        const transformation = await TypeTransformationMapper.Instance.Create(
            'test suite',
            new TypeTransformation({
                type_mapping_id: mapping.value.id!,
                type: 'timeseries',
                keys: [
                    new KeyMapping({
                        key: 'RADIUS',
                        column_name: 'radius',
                        value_type: 'float',
                    }),
                    new KeyMapping({
                        key: 'COLOR',
                        column_name: 'color',
                        value_type: 'string',
                    }),
                    new KeyMapping({
                        key: 'OPEN',
                        column_name: 'open',
                        value_type: 'boolean',
                    }),
                    new KeyMapping({
                        key: 'AT',
                        column_name: 'at',
                        value_type: 'date',
                        is_primary_timestamp: true,
                    }),
                ],
            }),
        );

        expect(transformation.isError).false;
        transformationID = transformation.value.id!;

        const transformation2 = await TypeTransformationMapper.Instance.Create(
            'test suite',
            new TypeTransformation({
                type_mapping_id: mapping.value.id!,
                type: 'timeseries',
                keys: [
                    new KeyMapping({
                        key: 'test',
                        column_name: 'test',
                        value_type: 'string',
                    }),
                    new KeyMapping({
                        key: 'created',
                        column_name: 'created',
                        value_type: 'date',
                        is_primary_timestamp: true,
                    }),
                ],
            }),
        );

        expect(transformation2.isError).false;
        transformation2ID = transformation2.value.id!;

        let created = await TypeTransformationMapper.Instance.CreateHypertable(transformation.value);
        expect(created.isError, created.error?.error).false;

        created = await TypeTransformationMapper.Instance.CreateHypertable(transformation2.value);
        expect(created.isError, created.error?.error).false;

        return Promise.resolve();
    });

    after(async () => {
        await TypeTransformationMapper.Instance.DeleteHypertable(transformationID);
        await TypeTransformationMapper.Instance.DeleteHypertable(transformation2ID);
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can save entries', async () => {
        const entry = new TimeseriesEntry({
            transformation_id: transformationID,
            data: [
                new TimeseriesData({
                    column_name: 'radius',
                    value_type: 'float',
                    value: 0.2,
                }),
                new TimeseriesData({
                    column_name: 'color',
                    value_type: 'string',
                    value: 'blue',
                }),
                new TimeseriesData({
                    column_name: 'open',
                    value_type: 'boolean',
                    value: false,
                }),
                new TimeseriesData({
                    column_name: 'at',
                    value_type: 'timestamp',
                    value: new Date(),
                }),
            ],
        });

        const repo = new TimeseriesEntryRepository();

        const saved = await repo.bulkSave([entry]);

        expect(saved.isError, saved.error?.error).false;

        return Promise.resolve();
    });

    it('can be bulk saved to the proper tables', async () => {
        const entry = new TimeseriesEntry({
            transformation_id: transformationID,
            data: [
                new TimeseriesData({
                    column_name: 'radius',
                    value_type: 'float',
                    value: 0.2,
                }),
                new TimeseriesData({
                    column_name: 'color',
                    value_type: 'string',
                    value: 'blue',
                }),
                new TimeseriesData({
                    column_name: 'open',
                    value_type: 'boolean',
                    value: false,
                }),
                new TimeseriesData({
                    column_name: 'at',
                    value_type: 'date',
                    value: new Date(),
                }),
            ],
        });

        const entry2 = new TimeseriesEntry({
            transformation_id: transformation2ID,
            data: [
                new TimeseriesData({
                    column_name: 'test',
                    value_type: 'string',
                    value: 'blue',
                }),
                new TimeseriesData({
                    column_name: 'created',
                    value_type: 'date',
                    value: new Date(),
                }),
            ],
        });

        const repo = new TimeseriesEntryRepository();
        const saved = await repo.bulkSave([entry, entry2]);
        expect(saved.isError, saved.error?.error).false;

        return Promise.resolve();
    });
});

const test_raw_payload = {
    RAD: 0.1,
    COLOR: 'blue',
    OPEN: true,
    AT: '2022-04-20T14:30:21.018Z',
};
