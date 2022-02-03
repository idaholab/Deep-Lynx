import faker from 'faker';
import {expect} from 'chai';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../../../../services/logger';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import UserMapper from '../../../../data_access_layer/mappers/access_management/user_mapper';
import MetatypeRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import MetatypeRelationshipRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_repository';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';
import MetatypeRelationship from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipPair from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import MetatypeRelationshipPairRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_pair_repository';
import {User} from '../../../../domain_objects/access_management/user';

describe('A Metatype Relationship Pair Repository', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';
    let user: User;

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

    it('can save a Metatype Relationship Pair', async () => {
        const repo = new MetatypeRelationshipPairRepository();
        const metatypeRepo = new MetatypeRepository();
        const relationshipRepo = new MetatypeRelationshipRepository();

        // for this test we'll save/create the metatypes and relationships separately
        const metatype1 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const metatype2 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const metatypeResult = await metatypeRepo.bulkSave(user, [metatype1, metatype2]);
        expect(metatypeResult.isError).false;

        const relationship = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const relationshipResult = await relationshipRepo.save(relationship, user);
        expect(relationshipResult.isError).false;

        const pair = new MetatypeRelationshipPair({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            relationship_type: 'one:one',
            origin_metatype: metatype1,
            destination_metatype: metatype2,
            relationship,
            container_id: containerID,
        });

        const saved = await repo.save(pair, user);
        expect(saved.isError).false;
        expect(pair.id).not.undefined;
        expect(pair.origin_metatype_id).eq(metatype1.id);
        expect(pair.destination_metatype_id).eq(metatype2.id);
        expect(pair.relationship_id).eq(relationship.id);

        return repo.delete(pair);
    });

    it('can save a Metatype Relationship Pair with relationships', async () => {
        const repo = new MetatypeRelationshipPairRepository();

        // for this test we'll save/create the metatypes and relationships separately
        const metatype1 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const metatype2 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const relationship = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const pair = new MetatypeRelationshipPair({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            relationship_type: 'one:one',
            origin_metatype: metatype1,
            destination_metatype: metatype2,
            relationship,
            container_id: containerID,
        });

        const saved = await repo.save(pair, user, true);
        expect(saved.isError).false;
        expect(pair.id).not.undefined;
        expect(pair.origin_metatype_id).not.undefined;
        expect(pair.destination_metatype_id).not.undefined;
        expect(pair.relationship_id).not.undefined;

        return repo.delete(pair);
    });

    it('can bulk save Metatype Relationship Pairs', async () => {
        const repo = new MetatypeRelationshipPairRepository();

        // for this test we'll save/create the metatypes and relationships separately
        const metatype1 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const metatype2 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const relationship = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const pair = new MetatypeRelationshipPair({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            relationship_type: 'one:one',
            origin_metatype: metatype1,
            destination_metatype: metatype2,
            relationship,
            container_id: containerID,
        });

        const metatype3 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const metatype4 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const relationship2 = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const pair2 = new MetatypeRelationshipPair({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            relationship_type: 'many:many',
            origin_metatype: metatype3,
            destination_metatype: metatype4,
            relationship: relationship2,
            container_id: containerID,
        });

        const saved = await repo.bulkSave(user, [pair, pair2], true);
        expect(saved.isError).false;
        expect(pair.id).not.undefined;
        expect(pair.origin_metatype_id).not.undefined;
        expect(pair.destination_metatype_id).not.undefined;
        expect(pair.relationship_id).not.undefined;
        expect(pair2.id).not.undefined;
        expect(pair2.origin_metatype_id).not.undefined;
        expect(pair2.destination_metatype_id).not.undefined;
        expect(pair2.relationship_id).not.undefined;

        await repo.delete(pair);
        return repo.delete(pair2);
    });

    it('can save list Metatype Relationship Pairs by various means', async () => {
        const repo = new MetatypeRelationshipPairRepository();

        // for this test we'll save/create the metatypes and relationships separately
        const metatype1 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const metatype2 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const relationship = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const pair = new MetatypeRelationshipPair({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            relationship_type: 'one:one',
            origin_metatype: metatype1,
            destination_metatype: metatype2,
            relationship,
            container_id: containerID,
        });

        let saved = await repo.save(pair, user, true);
        expect(saved.isError).false;
        expect(pair.id).not.undefined;
        expect(pair.origin_metatype_id).not.undefined;
        expect(pair.destination_metatype_id).not.undefined;
        expect(pair.relationship_id).not.undefined;

        const metatype3 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const metatype4 = new Metatype({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });
        const relationship2 = new MetatypeRelationship({
            container_id: containerID,
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
        });

        const pair2 = new MetatypeRelationshipPair({
            name: faker.name.findName(),
            description: faker.random.alphaNumeric(),
            relationship_type: 'many:many',
            origin_metatype: metatype3,
            destination_metatype: metatype4,
            relationship: relationship2,
            container_id: containerID,
        });

        saved = await repo.save(pair2, user, true);
        expect(saved.isError).false;
        expect(pair2.id).not.undefined;
        expect(pair2.origin_metatype_id).not.undefined;
        expect(pair2.destination_metatype_id).not.undefined;
        expect(pair2.relationship_id).not.undefined;

        let results = await repo.where().origin_metatype_id('eq', pair.origin_metatype_id).list();
        expect(results.isError).false;
        expect(results.value.length).eq(1);
        expect(results.value[0].id).eq(pair.id);

        results = await repo.where().destination_metatype_id('eq', pair.destination_metatype_id).list();
        expect(results.isError).false;
        expect(results.value.length).eq(1);
        expect(results.value[0].id).eq(pair.id);

        results = await repo.where().destination_metatype_id('eq', pair.destination_metatype_id).and().origin_metatype_id('eq', pair.origin_metatype_id).list();
        expect(results.isError).false;
        expect(results.value.length).eq(1);
        expect(results.value[0].id).eq(pair.id);

        results = await repo.where().containerID('eq', containerID).and().relationship_type('eq', 'many:many').list();
        expect(results.isError).false;
        expect(results.value.length).eq(1);
        expect(results.value[0].id).eq(pair2.id);

        const count = await repo.where().containerID('eq', containerID).count();
        expect(count.isError).false;
        expect(count.value).eq(2);

        await repo.delete(pair);
        return repo.delete(pair2);
    });
});
