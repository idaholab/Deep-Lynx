import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';

const format = require('pg-format');
const resultClass = Metatype;

/*
    MetatypeMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class MetatypeMapper extends Mapper {
    public static tableName = 'metatypes';
    public static viewName = 'metatypes_view';

    private static instance: MetatypeMapper;

    public static get Instance(): MetatypeMapper {
        if (!MetatypeMapper.instance) {
            MetatypeMapper.instance = new MetatypeMapper();
        }

        return MetatypeMapper.instance;
    }

    public async Create(userID: string, input: Metatype, transaction?: PoolClient): Promise<Result<Metatype>> {
        const r = await super.run(this.createStatement(userID, input), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, m: Metatype[], transaction?: PoolClient): Promise<Result<Metatype[]>> {
        return super.run(this.createStatement(userID, ...m), {
            transaction,
            resultClass,
        });
    }

    public async Retrieve(id: string): Promise<Result<Metatype>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass});
    }

    public async Update(userID: string, m: Metatype, transaction?: PoolClient): Promise<Result<Metatype>> {
        const r = await super.run(this.fullUpdateStatement(userID, m), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(userID: string, m: Metatype[], transaction?: PoolClient): Promise<Result<Metatype[]>> {
        return super.run(this.fullUpdateStatement(userID, ...m), {
            transaction,
            resultClass,
        });
    }

    public async InUse(id: string): Promise<Result<boolean>> {
        const results = await super.rows<any>(this.inUseStatement(id));
        if (results.isError) return Promise.resolve(Result.Pass(results));

        return Promise.resolve(Result.Success(results.value.length > 0));
    }

    public async Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    public async Archive(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.archiveStatement(id, userID));
    }

    public async Unarchive(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.unarchiveStatement(id, userID));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...metatypes: Metatype[]): string {
        const text = `INSERT INTO metatypes(container_id,name,description, created_by, modified_by, ontology_version) VALUES %L RETURNING *`;
        const values = metatypes.map((metatype) => [metatype.container_id, metatype.name, metatype.description, userID, userID, metatype.ontology_version]);

        return format(text, values);
    }

    // we must point all listing functions to the metatypes_view so that we can get the parent_id if it exists
    // without having to do a join each time
    private retrieveStatement(metatypeID: string): QueryConfig {
        return {
            text: `SELECT * FROM metatypes_view WHERE id = $1`,
            values: [metatypeID],
        };
    }

    private archiveStatement(metatypeID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE metatypes SET deleted_at = NOW(), modified_at = NOW(), modified_by = $2  WHERE id = $1`,
            values: [metatypeID, userID],
        };
    }

    private unarchiveStatement(metatypeID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE metatypes SET deleted_at = NULL, modified_at = NOW(), modified_by = $2  WHERE id = $1`,
            values: [metatypeID, userID],
        };
    }

    private deleteStatement(metatypeID: string): QueryConfig {
        return {
            text: `DELETE FROM metatypes WHERE id = $1`,
            values: [metatypeID],
        };
    }

    private fullUpdateStatement(userID: string, ...metatypes: Metatype[]): string {
        const text = `UPDATE metatypes AS m SET
                        name = u.name,
                        description = u.description,
                        modified_by = u.modified_by,
                        ontology_version = u.ontology_version::bigint,
                        modified_at = NOW()
                      FROM(VALUES %L) AS u(id, name, description, modified_by, ontology_version)
                      WHERE u.id::bigint = m.id RETURNING m.*`;
        const values = metatypes.map((metatype) => [metatype.id, metatype.name, metatype.description, userID, metatype.ontology_version]);

        return format(text, values);
    }

    private inUseStatement(id: string): QueryConfig {
        return {
            text: `(SELECT n.id FROM nodes n WHERE n.metatype_id = $1
                        UNION ALL
                    SELECT t.id FROM data_type_mapping_transformations WHERE t.metatype_id = $1 ) LIMIT 1`,
            values: [id],
        };
    }
}
