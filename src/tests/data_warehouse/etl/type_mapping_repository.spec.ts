import {User} from '../../../domain_objects/access_management/user';
import Logger from '../../../services/logger';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../domain_objects/data_warehouse/ontology/container';
import faker from 'faker';
import {expect} from 'chai';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import TypeMapping from '../../../domain_objects/data_warehouse/etl/type_mapping';
import TypeMappingRepository from '../../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import MetatypeKey from '../../../domain_objects/data_warehouse/ontology/metatype_key';
import Metatype from '../../../domain_objects/data_warehouse/ontology/metatype';
import MetatypeMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_mapper';
import MetatypeKeyMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_key_mapper';
import TypeTransformation, {Condition, KeyMapping} from '../../../domain_objects/data_warehouse/etl/type_transformation';
import DataSourceRecord from '../../../domain_objects/data_warehouse/import/data_source';
import OntologyVersionRepository from '../../../data_access_layer/repositories/data_warehouse/ontology/versioning/ontology_version_repository';
import MetatypeRepository from '../../../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import OntologyVersionMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/versioning/ontology_version_mapper';
import MetatypeRelationshipPair from '../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import MetatypeRelationshipKey from '../../../domain_objects/data_warehouse/ontology/metatype_relationship_key';
import OntologyVersion from '../../../domain_objects/data_warehouse/ontology/versioning/ontology_version';
import MetatypeRelationshipMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_mapper';
import MetatypeRelationshipPairMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper';
import MetatypeRelationship from '../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipKeyMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_key_mapper';
import MetatypeKeyRepository from '../../../data_access_layer/repositories/data_warehouse/ontology/metatype_key_repository';
import MetatypeRelationshipRepository from '../../../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_repository';
import MetatypeRelationshipKeyRepository from '../../../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_key_repository';
import MetatypeRelationshipPairRepository from '../../../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_pair_repository';
import TypeTransformationRepository from '../../../data_access_layer/repositories/data_warehouse/etl/type_transformation_repository';

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
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(container.isError).false;
        expect(container.value.id).not.null;
        containerID = container.value.id!;

        const container2 = await mapper.Create(
            'test suite',
            new Container({
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
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
                roles: ['superuser'],
            }),
        );

        expect(userResult.isError).false;
        expect(userResult.value).not.empty;
        user = userResult.value;

        const created = await MetatypeMapper.Instance.Create(
            'test suite',
            new Metatype({
                container_id: containerID,
                name: faker.name.findName(),
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(created.isError).false;
        metatype = created.value;

        const test_key: MetatypeKey = new MetatypeKey({
            name: 'Test',
            description: 'flower name',
            required: true,
            property_name: 'flower_name',
            data_type: 'string',
            metatype_id: metatype.id!,
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
                description: faker.random.alphaNumeric(),
            }),
        );

        expect(created2.isError).false;
        metatype2 = created2.value;

        const test_key2: MetatypeKey = new MetatypeKey({
            name: 'Test',
            description: 'flower name',
            required: true,
            property_name: 'flower_name',
            data_type: 'string',
            metatype_id: metatype2.id!,
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
                data_format: 'json',
            }),
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
                data_format: 'json',
            }),
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
                data_format: 'json',
            }),
        );

        expect(exp3.isError).false;
        expect(exp3.value).not.empty;
        dataSource2ID = exp3.value.id!;

        return Promise.resolve();
    });

    after(async () => {
        await UserMapper.Instance.Delete(user.id!);
        await ContainerMapper.Instance.Delete(container2ID);
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('can save a Type Mapping', async () => {
        const repo = new TypeMappingRepository();
        const mapping = new TypeMapping({
            container_id: containerID,
            data_source_id: dataSourceID,
            sample_payload: test_raw_payload,
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
            sample_payload: test_raw_payload,
        });

        const transformation = new TypeTransformation({
            type_mapping_id: mapping.id!,
            metatype_id: metatype.id,
            type: 'node',
            conditions: [
                new Condition({
                    key: 'RADIUS',
                    operator: '==',
                    value: 'CIRCLE',
                }),
            ],
            keys: [
                new KeyMapping({
                    key: 'RADIUS',
                    metatype_key_id: key.id,
                }),
            ],
        });

        mapping.addTransformation(transformation);

        let saved = await repo.save(mapping, user);
        expect(saved.isError, saved.error?.error).false;
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
            active: true, // we set active true so we can verify that the mapping will be set inactive on export
        });

        const transformation = new TypeTransformation({
            type_mapping_id: mapping.id!,
            metatype_id: metatype.id,
            type: 'node',
            conditions: [
                new Condition({
                    key: 'RADIUS',
                    operator: '==',
                    value: 'CIRCLE',
                }),
            ],
            keys: [
                new KeyMapping({
                    key: 'RADIUS',
                    metatype_key_id: key.id,
                }),
            ],
        });

        mapping.addTransformation(transformation);

        const saved = await repo.save(mapping, user);
        expect(saved.isError, saved.error?.error).false;
        expect(mapping.id).not.undefined;
        expect(mapping.transformations![0]!.id).not.undefined;

        // first we attempt to export them into the same container but separate data source
        let exported = await repo.importToDataSource(targetDataSourceID, user, false, mapping);
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
        exported = await repo.importToDataSource(dataSource2ID, user, false, mapping);
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

    it('can upgrade a Type Mapping', async () => {
        const ontologyRepo = new OntologyVersionRepository();
        const ontologyMapper = new OntologyVersionMapper();
        const metatypeRepo = new MetatypeRepository();
        const mKeyRepo = new MetatypeKeyRepository();
        const relRepo = new MetatypeRelationshipRepository();
        const rKeyRepo = new MetatypeRelationshipKeyRepository();
        const pairRepo = new MetatypeRelationshipPairRepository();
        const transformRepo = new TypeTransformationRepository();

        // create an ontology version
        const ontologyV1 = new OntologyVersion({
            container_id: containerID,
            name: 'Test Version 1',
        });
        const v1saved = await ontologyRepo.save(ontologyV1, user);
        expect(v1saved.isError).false;
        expect(ontologyV1.id).not.empty;

        // create metatype using version
        const metatypeV1 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            ontology_version: ontologyV1.id,
        });

        const dest_type = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            ontology_version: ontologyV1.id,
        });

        let mtSaved = await metatypeRepo.save(metatypeV1, user);
        expect(mtSaved.isError).false;
        mtSaved = await metatypeRepo.save(dest_type, user);
        expect(mtSaved.isError).false;

        // create key for metatype
        const mKeyV1 = new MetatypeKey({
            name: 'Test',
            description: 'flower name',
            required: true,
            property_name: 'flower_name',
            data_type: 'string',
            metatype_id: metatypeV1.id!,
            ontology_version: ontologyV1.id,
            container_id: containerID,
        });

        const mkSaved = await mKeyRepo.save(mKeyV1, user);
        expect(mkSaved.isError).false;
        metatypeV1.addKey(mKeyV1);

        // create relationship using version
        const relV1 = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            ontology_version: ontologyV1.id!,
        });

        const rSaved = await relRepo.save(relV1, user);
        expect(rSaved.isError).false;

        // create key for relationship
        const rKeyV1 = new MetatypeRelationshipKey({
            name: 'Test',
            description: 'flower name',
            required: true,
            property_name: 'flower_name',
            data_type: 'string',
            metatype_relationship_id: relV1.id!,
            ontology_version: ontologyV1.id,
            container_id: containerID,
        });

        const rkSaved = await rKeyRepo.save(rKeyV1, user);
        expect(rkSaved.isError).false;
        relV1.addKey(rKeyV1);

        // create relationship pair using version
        const pairV1 = new MetatypeRelationshipPair({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            ontology_version: ontologyV1.id,
            origin_metatype: metatypeV1,
            destination_metatype: dest_type,
            relationship_type: 'one:one',
            relationship: relV1,
        });

        const pSaved = await pairRepo.save(pairV1, user);
        expect(pSaved.isError).false;

        // create type mapping and transformations
        const repo = new TypeMappingRepository();
        const mapping = new TypeMapping({
            container_id: containerID,
            data_source_id: dataSourceID,
            sample_payload: test_raw_payload,
        });

        const transformation1 = new TypeTransformation({
            type_mapping_id: mapping.id!,
            metatype_id: metatypeV1.id,
            type: 'node',
            conditions: [
                new Condition({
                    key: 'RADIUS',
                    operator: '==',
                    value: 'CIRCLE',
                }),
            ],
            keys: [
                new KeyMapping({
                    key: 'Test',
                    metatype_key_id: mKeyV1.id,
                }),
            ],
        });

        mapping.addTransformation(transformation1);

        const transformation2 = new TypeTransformation({
            type_mapping_id: mapping.id!,
            metatype_relationship_pair_id: pairV1.id,
            type: 'edge',
            conditions: [
                new Condition({
                    key: 'RADIUS',
                    operator: '==',
                    value: 'CIRCLE',
                }),
            ],
            keys: [
                new KeyMapping({
                    key: 'Test',
                    metatype_relationship_key_id: rKeyV1.id,
                }),
            ],
        });

        mapping.addTransformation(transformation2);

        let saved = await repo.save(mapping, user);
        expect(saved.isError, saved.error?.error).false;
        expect(mapping.id).not.undefined;
        expect(mapping.transformations![0]!.id).not.undefined;

        // create ontology v2 which is a clone of original ontology
        const ontologyV2 = new OntologyVersion({
            container_id: containerID,
            name: 'Test Version 2',
        });
        const v2created = await ontologyMapper.Create(user.id!, ontologyV2);
        expect(v2created.isError).false;
        const v2id = v2created.value.id!;
        const cloned = await ontologyRepo.cloneOntology(user, ontologyV1.id!, v2id, containerID);
        expect(cloned.isError).false;

        // verify that metatype and relationship ids in v2 are not the same ids as v1
        const fetchMT = await metatypeRepo.where().ontologyVersion('eq', v2id).and().uuid('eq', metatypeV1.uuid).list();
        expect(fetchMT.isError).false;
        const metatypeV2 = fetchMT.value[0];
        expect(metatypeV2.id).not.eq(metatypeV1.id);
        expect(metatypeV2.uuid).eq(metatypeV1.uuid);
        expect(metatypeV2.name).eq(metatypeV1.name);
        expect(metatypeV2.keys).not.eq([]);

        const fetchMKey = await mKeyRepo.where().query('ontology_version', 'eq', v2id).and().uuid('eq', mKeyV1.uuid).list();
        expect(fetchMKey.isError).false;
        const mKeyV2 = fetchMKey.value[0];
        expect(mKeyV2.id).not.eq(mKeyV1.id);
        expect(mKeyV2.uuid).eq(mKeyV1.uuid);
        expect(mKeyV2.name).eq(mKeyV1.name);
        expect(mKeyV2.metatype_id).eq(metatypeV2.id);

        const fetchRel = await relRepo.where().ontologyVersion('eq', v2id).and().uuid('eq', relV1.uuid).list();
        expect(fetchRel.isError).false;
        const relV2 = fetchRel.value[0];
        expect(relV2.id).not.eq(relV1.id);
        expect(relV2.uuid).eq(relV1.uuid);
        expect(relV2.name).eq(relV1.name);
        expect(relV2.keys).not.eq([]);

        const fetchRKey = await rKeyRepo.where().query('ontology_version', 'eq', v2id).and().uuid('eq', rKeyV1.uuid).list();
        expect(fetchRKey.isError).false;
        const rKeyV2 = fetchRKey.value[0];
        expect(rKeyV2.id).not.eq(rKeyV1.id);
        expect(rKeyV2.uuid).eq(rKeyV1.uuid);
        expect(rKeyV2.name).eq(rKeyV1.name);
        expect(rKeyV2.metatype_relationship_id).eq(relV2.id);

        const fetchPairs = await pairRepo.where().ontologyVersion('eq', v2id).and().uuid('eq', pairV1.uuid).list();
        expect(fetchPairs.isError).false;
        const pairV2 = fetchPairs.value[0];
        expect(pairV2.id).not.eq(pairV1.id);
        expect(pairV2.uuid).eq(pairV1.uuid);
        expect(pairV2.name).eq(pairV1.name);

        // verify that transformation matches ontology v1
        mapping.transformations?.forEach((t) => {
            if (t.metatype_id) {
                expect(t.metatype_id).eq(metatypeV1.id);
                expect(t.keys[0].metatype_key_id).eq(mKeyV1.id);
            }
            if (t.metatype_relationship_pair_id) {
                expect(t.metatype_relationship_pair_id).eq(pairV1.id);
                expect(t.keys[0].metatype_relationship_key_id).eq(rKeyV1.id);
            }
        });

        // upgrade mapping
        const upgraded = await repo.upgradeMappings(v2id, mapping);
        upgraded.forEach((u) => {
            expect(u.isError, JSON.stringify(u.error)).false;
            expect(u.value).true;
        });

        // verify that the upgraded transformation matches ontology v2
        const newMappings = await transformRepo.where().typeMappingID('eq', mapping.id).list();
        newMappings.value.forEach((t) => {
            if (t.metatype_id) {
                expect(t.metatype_id).eq(metatypeV2.id);
                expect(t.keys[0].metatype_key_id).eq(mKeyV2.id);
            }
            if (t.metatype_relationship_pair_id) {
                expect(t.metatype_relationship_pair_id).eq(pairV2.id);
                expect(t.keys[0].metatype_relationship_key_id).eq(rKeyV2.id);
            }
        });

        // clean up
        mapping.transformations?.forEach((t) => {
            mapping.removeTransformation(t);
        });
        await repo.delete(mapping);
        await metatypeRepo.delete(metatypeV1);
        await metatypeRepo.delete(dest_type);
        await metatypeRepo.delete(metatypeV2);
        await mKeyRepo.delete(mKeyV1);
        await mKeyRepo.delete(mKeyV2);
        await relRepo.delete(relV1);
        await relRepo.delete(relV2);
        await rKeyRepo.delete(rKeyV1);
        await rKeyRepo.delete(rKeyV2);
        await pairRepo.delete(pairV1);
        await pairRepo.delete(pairV2);
        await ontologyRepo.delete(ontologyV1);
        await ontologyRepo.delete(ontologyV2);
        return Promise.resolve();
    });
});

const test_raw_payload = {
    RAD: 0.1,
    COLOR: 'blue',
    TYPE: 'EQUIP',
    TEST: 'TEST',
    ITEM_ID: '123',
    ATTRIBUTES: {
        WHEELS: 1,
    },
};

const updated_payload = {
    RAD: 0.1,
    COLOR: 'yellow',
    ITEM_ID: '123',
    ATTRIBUTES: {
        WHEELS: 1,
    },
};
