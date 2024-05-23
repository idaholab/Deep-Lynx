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
import TypeMapping from '../../../domain_objects/data_warehouse/etl/type_mapping';
import TypeMappingRepository from '../../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import Import, {DataStaging} from '../../../domain_objects/data_warehouse/import/import';
import ImportRepository from '../../../data_access_layer/repositories/data_warehouse/import/import_repository';
import DataStagingRepository from '../../../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import DataSourceRecord from '../../../domain_objects/data_warehouse/import/data_source';

// we're combining the data staging and import repository tests because these
// two systems are very intertwined, and that there isn't much functionality
// that needs to be tested outside their mapper functions(which are already
// tested elsewhere )
describe('An Import or Data Staging Repository can', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;
    let dataSourceID: string;
    let mappingID: string;

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
        dataSourceID = exp.value.id!;

        // mapping needs to be completed in order to get inserted
        const mapping = new TypeMapping({
            container_id: containerID,
            data_source_id: exp.value.id!,
            sample_payload: test_payload,
        });

        const saved = await new TypeMappingRepository().save(mapping, user);
        expect(saved.isError).false;
        mappingID = mapping.id!;

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can save an Import and Data Staging', async () => {
        const importRepo = new ImportRepository();
        const stagingRepo = new DataStagingRepository();
        const importRecord = new Import({
            data_source_id: dataSourceID,
            reference: 'testing upload',
        });

        let saved = await importRepo.save(importRecord, user);
        expect(saved.isError).false;
        expect(importRecord.id).not.undefined;

        // verify the update will not work
        saved = await importRepo.save(importRecord, user);
        expect(saved.isError).true;

        // now the staging record
        const staging = new DataStaging({
            data_source_id: dataSourceID,
            import_id: importRecord.id!,
            data: test_payload,
        });

        saved = await stagingRepo.save(staging);
        expect(saved.isError).false;
        expect(staging.id).not.undefined;

        return importRepo.delete(importRecord);
    });

    // because filtering by null shape hashes are so important we need
    // to test the filter and make sure it's working
    it('can filter data staging on shape_hash', async () => {
        const importRepo = new ImportRepository();
        const stagingRepo = new DataStagingRepository();
        const importRecord = new Import({
            data_source_id: dataSourceID,
            reference: 'testing upload',
        });

        let saved = await importRepo.save(importRecord, user);
        expect(saved.isError).false;
        expect(importRecord.id).not.undefined;

        // verify the update will not work
        saved = await importRepo.save(importRecord, user);
        expect(saved.isError).true;

        // now the staging records, one null one with shape hash
        const staging = [
            new DataStaging({
                data_source_id: dataSourceID,
                import_id: importRecord.id!,
                data: test_payload,
            }),
            new DataStaging({
                data_source_id: dataSourceID,
                import_id: importRecord.id!,
                data: test_payload,
                shape_hash: 'test_hash',
            }),
        ];

        saved = await stagingRepo.bulkSave(staging);
        expect(saved.isError).false;

        const results = await stagingRepo.where().importID('eq', importRecord.id).and().shapeHash('is null').list();

        expect(results.isError).false;
        expect(results.value.length).eq(1); // should only be one record coming back on the null search
        // while we're here, check the joins
        expect(results.value[0].container_id).eq(containerID);

        return importRepo.delete(importRecord);
    });
});

const test_payload = {
    test: 'test',
};
