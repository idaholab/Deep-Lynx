import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import MetatypeRelationshipPair from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';

const format = require('pg-format');
const resultClass = MetatypeRelationshipPair;

/*
    MetatypeRelationshipPairMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class MetatypeRelationshipPairMapper extends Mapper {
    public static tableName = 'metatype_relationship_pairs';

    private static instance: MetatypeRelationshipPairMapper;

    public static get Instance(): MetatypeRelationshipPairMapper {
        if (!MetatypeRelationshipPairMapper.instance) {
            MetatypeRelationshipPairMapper.instance = new MetatypeRelationshipPairMapper();
        }

        return MetatypeRelationshipPairMapper.instance;
    }

    public async Create(userID: string, input: MetatypeRelationshipPair, transaction?: PoolClient): Promise<Result<MetatypeRelationshipPair>> {
        const r = await super.run(this.createStatement(userID, input), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, input: MetatypeRelationshipPair[], transaction?: PoolClient): Promise<Result<MetatypeRelationshipPair[]>> {
        return super.run(this.createStatement(userID, ...input), {
            transaction,
            resultClass,
        });
    }

    public async Retrieve(id: string): Promise<Result<MetatypeRelationshipPair>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass});
    }

    public async Update(userID: string, p: MetatypeRelationshipPair, transaction?: PoolClient): Promise<Result<MetatypeRelationshipPair>> {
        const r = await super.run(this.fullUpdateStatement(userID, p), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(userID: string, p: MetatypeRelationshipPair[], transaction?: PoolClient): Promise<Result<MetatypeRelationshipPair[]>> {
        return super.run(this.fullUpdateStatement(userID, ...p), {
            transaction,
            resultClass,
        });
    }

    public async Archive(pairID: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.archiveStatement(pairID, userID));
    }

    public async Delete(pairID: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(pairID));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...pairs: MetatypeRelationshipPair[]): string {
        const text = `INSERT INTO
                            metatype_relationship_pairs(
                                                        name,
                                                        description,
                                                        relationship_id,
                                                        origin_metatype_id,
                                                        destination_metatype_id,
                                                        relationship_type,
                                                        container_id,
                                                        created_by, modified_by)
                    VALUES %L RETURNING *`;

        const values = pairs.map((pair) => [
            pair.name,
            pair.description,
            pair.relationship!.id,
            pair.originMetatype!.id,
            pair.destinationMetatype!.id,
            pair.relationship_type,
            pair.container_id,
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...pairs: MetatypeRelationshipPair[]): string {
        const text = `UPDATE metatype_relationship_pairs AS p SET
                            name = u.name,
                            description = u.description,
                            relationship_type = u.relationship_type,
                            relationship_id = u.relationship_id::bigint,
                            origin_metatype_id = u.origin_metatype_id::bigint,
                            destination_metatype_id = u.destination_metatype_id::bigint,
                            container_id = u.container_id::bigint,
                            modified_by = u.modified_by,
                            modified_at = NOW()
                        FROM(VALUES %L) as u(id,
                                            name,
                                            description,
                                            relationship_type,
                                            relationship_id,
                                            origin_metatype_id,
                                            destination_metatype_id,
                                            container_id,
                                            modified_by)
                        WHERE u.id::bigint= p.id RETURNING p.*`;
        const values = pairs.map((p) => [
            p.id,
            p.name,
            p.description,
            p.relationship_type,
            p.relationship!.id,
            p.originMetatype!.id,
            p.destinationMetatype!.id,
            p.container_id,
            userID,
        ]);

        return format(text, values);
    }

    private archiveStatement(pairID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE metatype_relationship_pairs SET deleted_at = NOW(), modified_at = NOW(), modified_by = $2  WHERE id = $1`,
            values: [pairID, userID],
        };
    }

    private deleteStatement(pairID: string): QueryConfig {
        return {
            text: `DELETE FROM metatype_relationship_pairs WHERE id = $1`,
            values: [pairID],
        };
    }

    private retrieveStatement(pairID: string): QueryConfig {
        return {
            text: `SELECT * FROM metatype_relationship_pairs WHERE id = $1`,
            values: [pairID],
        };
    }
}
