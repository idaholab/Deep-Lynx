import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import MetatypeRelationshipKey from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_key';

const format = require('pg-format');
const resultClass = MetatypeRelationshipKey;

/*
    MetatypeRelationshipKeyMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class MetatypeRelationshipKeyMapper extends Mapper {
    public static tableName = 'metatype_relationship_keys';

    private static instance: MetatypeRelationshipKeyMapper;

    public static get Instance(): MetatypeRelationshipKeyMapper {
        if (!MetatypeRelationshipKeyMapper.instance) {
            MetatypeRelationshipKeyMapper.instance = new MetatypeRelationshipKeyMapper();
        }

        return MetatypeRelationshipKeyMapper.instance;
    }

    public async Create(userID: string, key: MetatypeRelationshipKey, transaction?: PoolClient): Promise<Result<MetatypeRelationshipKey>> {
        const r = await super.run(this.createStatement(userID, key), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, keys: MetatypeRelationshipKey[], transaction?: PoolClient): Promise<Result<MetatypeRelationshipKey[]>> {
        return super.run(this.createStatement(userID, ...keys), {
            transaction,
            resultClass,
        });
    }

    public async Retrieve(id: string): Promise<Result<MetatypeRelationshipKey>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass});
    }

    public async Update(userID: string, key: MetatypeRelationshipKey, transaction?: PoolClient): Promise<Result<MetatypeRelationshipKey>> {
        const r = await super.run(this.fullUpdateStatement(userID, key), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(userID: string, keys: MetatypeRelationshipKey[], transaction?: PoolClient): Promise<Result<MetatypeRelationshipKey[]>> {
        return super.run(this.fullUpdateStatement(userID, ...keys), {
            transaction,
            resultClass,
        });
    }

    public async BulkDelete(keys: MetatypeRelationshipKey[], transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.bulkDeleteStatement(keys), {
            transaction,
        });
    }

    public async ListForRelationship(relationshipID: string): Promise<Result<MetatypeRelationshipKey[]>> {
        return super.rows(this.listStatement(relationshipID), {resultClass});
    }

    public async ListFromIDs(ids: string[]): Promise<Result<MetatypeRelationshipKey[]>> {
        return super.rows(this.listFromIDsStatement(ids), {resultClass});
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
    private createStatement(userID: string, ...keys: MetatypeRelationshipKey[]): string {
        const text = `INSERT INTO
                        metatype_relationship_keys(metatype_relationship_id,
                                                   container_id,
                                                   name,
                                                   description,
                                                   property_name,
                                                   required,
                                                   data_type,
                                                   options,
                                                   default_value,
                                                   validation,
                                                   created_by,
                                                   modified_by)
                        VALUES %L RETURNING *`;
        const values = keys.map((key) => [
            key.metatype_relationship_id,
            key.container_id,
            key.name,
            key.description,
            key.property_name,
            key.required,
            key.data_type,
            JSON.stringify(key.options),
            JSON.stringify(key.default_value),
            JSON.stringify(key.validation),
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private retrieveStatement(metatypeKeyID: string): QueryConfig {
        return {
            text: `SELECT * FROM metatype_relationship_keys WHERE id = $1`,
            values: [metatypeKeyID],
        };
    }

    private listFromIDsStatement(ids: string[]): string {
        const text = `SELECT * FROM metatype_relationship_keys WHERE id IN(%L)`;
        const values = ids;

        return format(text, values);
    }

    private archiveStatement(metatypeKeyID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE metatype_relationship_keys SET deleted_at = NOW(), modified_at = NOW(), modified_by = $2  WHERE id = $1`,
            values: [metatypeKeyID, userID],
        };
    }

    private deleteStatement(metatypeKeyID: string): QueryConfig {
        return {
            text: `DELETE FROM metatype_relationship_keys WHERE id = $1`,
            values: [metatypeKeyID],
        };
    }

    private bulkDeleteStatement(keys: MetatypeRelationshipKey[]): string {
        const text = `DELETE FROM metatype_relationship_keys WHERE id IN(%L)`;
        const values = keys.filter((k) => k.id).map((k) => k.id as string);

        return format(text, values);
    }

    private listStatement(relationshipID: string): QueryConfig {
        return {
            text: `SELECT * FROM get_metatype_relationship_keys($1)`,
            values: [relationshipID],
        };
    }

    private fullUpdateStatement(userID: string, ...keys: MetatypeRelationshipKey[]): string {
        const text = `UPDATE metatype_relationship_keys AS m SET
                     name = k.name,
                     metatype_relationship_id = k.metatype_relationship_id::bigint,
                     container_id = k.container_id::bigint,
                     description = k.description,
                     property_name = k.property_name,
                     required = k.required::boolean,
                     data_type = k.data_type,
                     options = k.options::jsonb,
                     default_value = k.default_value::jsonb,
                     validation = k.validation::jsonb,
                     modified_by = k.modified_by,
                     modified_at = NOW()
                 FROM(VALUES %L) AS 
                 k(id, name, metatype_relationship_id, container_id, description, property_name, required, data_type, options, default_value, validation, modified_by)
                 WHERE k.id::bigint = m.id RETURNING m.*`;
        const values = keys.map((key) => [
            key.id,
            key.name,
            key.metatype_relationship_id,
            key.container_id,
            key.description,
            key.property_name,
            key.required,
            key.data_type,
            JSON.stringify(key.options),
            JSON.stringify(key.default_value),
            JSON.stringify(key.validation),
            userID,
        ]);

        return format(text, values);
    }
}
