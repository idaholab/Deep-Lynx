import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import MetatypeRelationship from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship';

const format = require('pg-format');
const resultClass = MetatypeRelationship;

/*
    MetatypeRelationshipMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class MetatypeRelationshipMapper extends Mapper {
    public static tableName = 'metatype_relationships';
    public static viewName = 'metatype_relationships_view';

    private static instance: MetatypeRelationshipMapper;

    public static get Instance(): MetatypeRelationshipMapper {
        if (!MetatypeRelationshipMapper.instance) {
            MetatypeRelationshipMapper.instance = new MetatypeRelationshipMapper();
        }

        return MetatypeRelationshipMapper.instance;
    }

    public async Create(userID: string, input: MetatypeRelationship, transaction?: PoolClient): Promise<Result<MetatypeRelationship>> {
        const r = await super.run(this.createStatement(userID, input), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, m: MetatypeRelationship[], transaction?: PoolClient): Promise<Result<MetatypeRelationship[]>> {
        return super.run(this.createStatement(userID, ...m), {
            transaction,
            resultClass,
        });
    }

    public async Retrieve(id: string): Promise<Result<MetatypeRelationship>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass});
    }

    public async Update(userID: string, m: MetatypeRelationship, transaction?: PoolClient): Promise<Result<MetatypeRelationship>> {
        const r = await super.run(this.fullUpdateStatement(userID, m), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(userID: string, m: MetatypeRelationship[], transaction?: PoolClient): Promise<Result<MetatypeRelationship[]>> {
        return super.run(this.fullUpdateStatement(userID, ...m), {
            transaction,
            resultClass,
        });
    }

    public async Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    public async Archive(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.archiveStatement(id, userID));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...relationships: MetatypeRelationship[]): string {
        const text = `INSERT INTO metatype_relationships(container_id,name,description,created_by,modified_by) VALUES %L RETURNING *`;
        const values = relationships.map((r) => [r.container_id, r.name, r.description, userID, userID]);

        return format(text, values);
    }

    // must run statement against the view so that we get the parent id
    private retrieveStatement(relationshipID: string): QueryConfig {
        return {
            text: `SELECT * FROM metatype_relationships_view WHERE id = $1`,
            values: [relationshipID],
        };
    }

    private archiveStatement(relationshipID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE metatype_relationships SET deleted_at = NOW(), modified_at = NOW(), modified_by = $2  WHERE id = $1`,
            values: [relationshipID, userID],
        };
    }

    private deleteStatement(relationshipID: string): QueryConfig {
        return {
            text: `DELETE FROM metatype_relationships WHERE id = $1`,
            values: [relationshipID],
        };
    }

    private fullUpdateStatement(userID: string, ...relationships: MetatypeRelationship[]): string {
        const text = `UPDATE metatype_relationships AS m SET
                        name = u.name,
                        description = u.description,
                        modified_by = u.modified_by,
                        modified_at = NOW()
                      FROM(VALUES %L) AS u(id, name, description, modified_by)
                      WHERE u.id::bigint = m.id RETURNING m.*`;
        const values = relationships.map((r) => [r.id, r.name, r.description, userID]);

        return format(text, values);
    }
}
