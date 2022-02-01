import {expect} from 'chai';
import * as faker from 'faker';
import Logger from '../../../../services/logger';
import PostgresAdapter from '../../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import ContainerMapper from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_mapper';
import Container from '../../../../domain_objects/data_warehouse/ontology/container';
import {classToPlain, plainToClass} from 'class-transformer';
import MetatypeRelationshipPair from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';

describe('A Metatype Relationship Pair should', async () => {
    let containerID: string = process.env.TEST_CONTAINER_ID || '';

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

        return Promise.resolve();
    });

    after(async () => {
        await ContainerMapper.Instance.Delete(containerID);
        return PostgresAdapter.Instance.close();
    });

    it('be able to assign metatype ids on plainToClass transformation', async () => {
        const check = plainToClass(MetatypeRelationshipPair, {
            destination_metatype_id: '1',
            origin_metatype_id: '1',
            relationship_id: '1',
        });
        expect(check.originMetatype).not.undefined;
        expect(check.destinationMetatype).not.undefined;
        expect(check.relationship).not.undefined;

        // verify that the resulting object has simple strings for id's
        const plain = classToPlain(check);
        expect(plain.origin_metatype_id).to.be.a('string');
        expect(plain.origin_metatype).to.be.a('object');
        expect(plain.destination_metatype_id).to.be.a('string');
        expect(plain.destination_metatype).to.be.a('object');
        expect(plain.relationship).to.be.a('object');
        expect(plain.relationship_id).to.be.a('string');

        return Promise.resolve();
    });
});
