import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import MetatypeKey from '../../../../domain_objects/data_warehouse/ontology/metatype_key';
import Logger from '../../../../services/logger';

const format = require('pg-format');

/*
    MetatypeKeyMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class MetatypeKeyMapper extends Mapper {
    public resultClass = MetatypeKey;
    public static tableName = 'metatype_keys';

    private static instance: MetatypeKeyMapper;

    public static get Instance(): MetatypeKeyMapper {
        if (!MetatypeKeyMapper.instance) {
            MetatypeKeyMapper.instance = new MetatypeKeyMapper();
        }

        return MetatypeKeyMapper.instance;
    }

    public async Create(userID: string, key: MetatypeKey, transaction?: PoolClient): Promise<Result<MetatypeKey>> {
        const r = await super.run(this.createStatement(userID, key), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        this.RefreshView().catch((e) => {
            Logger.error(`error refreshing metatype keys view ${e}`);
        });

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, keys: MetatypeKey[], transaction?: PoolClient): Promise<Result<MetatypeKey[]>> {
        this.RefreshView().catch((e) => {
            Logger.error(`error refreshing metatype keys view ${e}`);
        });

        return super.run(this.createStatement(userID, ...keys), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async Retrieve(id: string): Promise<Result<MetatypeKey>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass: this.resultClass});
    }

    public async ListForMetatype(metatypeID: string): Promise<Result<MetatypeKey[]>> {
        return super.rows(this.listStatement(metatypeID), {resultClass: this.resultClass});
    }

    public async ListForMetatypeIDs(metatype_ids: string[]): Promise<Result<MetatypeKey[]>> {
        return super.rows(this.listKeysStatement(metatype_ids));
    }

    public async ListFromViewForMetatype(metatypeID: string): Promise<Result<MetatypeKey[]>> {
        return super.rows(this.listViewStatement(metatypeID), {resultClass: this.resultClass});
    }

    public async ListFromViewForMetatypeIDs(metatype_ids: string[]): Promise<Result<MetatypeKey[]>> {
        return super.rows(this.listViewKeysStatement(metatype_ids));
    }

    public async ListFromViewIDs(ids: string[]): Promise<Result<MetatypeKey[]>> {
        return super.rows(this.listFromIDsStatement(ids), {resultClass: this.resultClass});
    }

    public async ListSelfKeysForMetatype(metatypeID: string): Promise<Result<MetatypeKey[]>> {
        return super.rows(this.listSelfKeysStatement(metatypeID), {resultClass: this.resultClass});
    }

    public async Update(userID: string, key: MetatypeKey, transaction?: PoolClient): Promise<Result<MetatypeKey>> {
        const r = await super.run(this.fullUpdateStatement(userID, key), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        this.RefreshView().catch((e) => {
            Logger.error(`error refreshing metatype keys view ${e}`);
        });

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(userID: string, keys: MetatypeKey[], transaction?: PoolClient): Promise<Result<MetatypeKey[]>> {
        this.RefreshView().catch((e) => {
            Logger.error(`error refreshing metatype keys view ${e}`);
        });

        return super.run(this.fullUpdateStatement(userID, ...keys), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async ListForExport(containerID: string, ontologyVersionID?: string): Promise<Result<MetatypeKey[]>> {
        return super.rows(this.forExportStatement(containerID, ontologyVersionID), {
            resultClass: this.resultClass,
        });
    }

    public async Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    public async BulkDelete(keys: MetatypeKey[], transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.bulkDeleteStatement(keys), {
            transaction,
        });
    }

    public async Archive(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.archiveStatement(id, userID));
    }

    public async ArchiveForImport(ontologyVersionID: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.archiveForImportStatement(ontologyVersionID), {transaction});
    }

    public async Unarchive(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.unarchiveStatement(id, userID));
    }

    public RefreshView(): Promise<Result<boolean>> {
        return super.runStatement(this.refreshViewStatement());
    }

    // these functions are copies only to be used on container import. they do not refresh the keys view.
    public async ImportBulkCreate(userID: string, keys: MetatypeKey[], transaction?: PoolClient): Promise<Result<MetatypeKey[]>> {
        return super.run(this.createStatement(userID, ...keys), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async ImportBulkUpdate(userID: string, keys: MetatypeKey[], transaction?: PoolClient): Promise<Result<MetatypeKey[]>> {
        return super.run(this.fullUpdateStatement(userID, ...keys), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async JSONCreate(metatypeKeys: MetatypeKey[]): Promise<Result<boolean>> {
        return super.runStatement(this.insertFromJSONStatement(metatypeKeys));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...keys: MetatypeKey[]): string {
        const text = `INSERT INTO
                        metatype_keys(
                                      metatype_id,
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
                        VALUES %L 
                            ON CONFLICT(metatype_id, property_name) DO UPDATE SET
                                created_by = EXCLUDED.created_by,
                                modified_by = EXCLUDED.created_by,
                                created_at = NOW(),
                                modified_at = NOW(),
                                deleted_at = NULL,
                                name = EXCLUDED.name,
                                metatype_id = EXCLUDED.metatype_id::bigint,
                                container_id = EXCLUDED.container_id::bigint,
                                description = EXCLUDED.description,
                                property_name = EXCLUDED.property_name,
                                required = EXCLUDED.required::boolean,
                                data_type = EXCLUDED.data_type,
                                options = EXCLUDED.options::jsonb,
                                default_value = EXCLUDED.default_value::jsonb,
                                validation = EXCLUDED.validation::jsonb
                            WHERE EXCLUDED.metatype_id = metatype_keys.metatype_id
                                AND EXCLUDED.property_name = metatype_keys.property_name
                            RETURNING *`;
        const values = keys.map((key) => [
            key.metatype_id,
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
            text: `SELECT * FROM metatype_keys WHERE id = $1`,
            values: [metatypeKeyID],
        };
    }

    private listFromIDsStatement(ids: string[]): string {
        const text = `SELECT * FROM metatype_full_keys WHERE id IN (%L)`;
        const values = ids;

        return format(text, values);
    }

    private archiveStatement(metatypeKeyID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE metatype_keys SET deleted_at = NOW(), modified_at = NOW(), modified_by = $2  WHERE id = $1`,
            values: [metatypeKeyID, userID],
        };
    }

    private archiveForImportStatement(ontologyVersionID: string): QueryConfig {
        return {
            text: `UPDATE metatype_keys SET deleted_at = NOW() WHERE ontology_version = $1`,
            values: [ontologyVersionID],
        };
    }

    private unarchiveStatement(metatypeKeyID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE metatype_keys SET deleted_at = NULL, modified_at = NOW(), modified_by = $2  WHERE id = $1`,
            values: [metatypeKeyID, userID],
        };
    }

    private bulkDeleteStatement(keys: MetatypeKey[]): string {
        const text = `DELETE FROM metatype_keys WHERE id IN(%L)`;
        const values = keys.filter((k) => k.id).map((k) => k.id as string);

        return format(text, values);
    }

    private deleteStatement(metatypeKeyID: string): QueryConfig {
        return {
            text: `DELETE FROM metatype_keys WHERE id = $1`,
            values: [metatypeKeyID],
        };
    }

    // list statement must reference the get_metatype_keys function so that we are getting
    // all keys back, both the metatype's own and the inherited keys
    private listViewStatement(metatypeID: string): QueryConfig {
        return {
            text: `SELECT * FROM metatype_full_keys WHERE metatype_id = $1`,
            values: [metatypeID],
        };
    }

    private listViewKeysStatement(metatype_ids: string[]): QueryConfig {
        const text = `SELECT * FROM metatype_full_keys WHERE metatype_id IN (%L)`;
        return format(text, metatype_ids);
    }

    private listStatement(metatypeID: string): QueryConfig {
        return {
            text: `SELECT * FROM get_metatype_keys($1::bigint) ORDER BY name`,
            values: [metatypeID],
        };
    }

    private listKeysStatement(metatype_ids: string[]): QueryConfig {
        const text = `WITH RECURSIVE parents AS (
            SELECT id, container_id, name, description, created_at,
                   modified_at, created_by, modified_by, ontology_version,
                   old_id, deleted_at, id AS key_parent, 1 AS lvl
            FROM metatypes_view
            UNION
            SELECT v.id, v.container_id, v.name, v.description, v.created_at,
                   v.modified_at, v.created_by, v.modified_by, v.ontology_version,
                   v.old_id, v.deleted_at, p.key_parent, p.lvl + 1
            FROM parents p JOIN metatypes_view v ON p.id = v.parent_id
        ) SELECT mk.id, p.id AS metatype_id, mk.name, mk.description,
                 mk.required, mk.property_name, mk.data_type, mk.options,
                 mk.default_value, mk.validation, mk.created_at, mk.modified_at,
                 mk.created_by, mk.modified_by, mk.ontology_version,
                 mk.container_id, mk.deleted_at
                      FROM parents p JOIN metatype_keys mk ON p.key_parent = mk.metatype_id
                      WHERE p.id IN (%L)
                      ORDER BY metatype_id, mk.name`;
        const values = metatype_ids;
        return format(text, values);
    }

    private listSelfKeysStatement(metatypeID: string): QueryConfig {
        return {
            text: `SELECT * FROM metatype_keys WHERE metatype_id = $1`,
            values: [metatypeID],
        };
    }

    private fullUpdateStatement(userID: string, ...keys: MetatypeKey[]): string {
        const text = `UPDATE metatype_keys AS m SET
                     name = k.name,
                     metatype_id = k.metatype_id::bigint,
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
                     k(id, name, metatype_id, container_id, description, property_name, required, data_type, options, default_value, validation, modified_by)
                 WHERE k.id::bigint = m.id RETURNING m.*`;
        const values = keys.map((key) => [
            key.id,
            key.name,
            key.metatype_id,
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

    private forExportStatement(containerID: string, ontologyVersionID?: string): QueryConfig {
        if (ontologyVersionID) {
            return {
                text: `SELECT  m.metatype_id, m.property_name, m.data_type, m.required, m.validation,
                    m.options, m.default_value, m.name, m.description, m.id as old_id
                    FROM metatype_keys m 
                    WHERE m.deleted_at IS NULL AND m.container_id = $1 AND m.ontology_version = $2`,
                values: [containerID, ontologyVersionID],
            };
        } else {
            return {
                text: `SELECT  m.metatype_id, m.property_name, m.data_type, m.required, m.validation,
                    m.options, m.default_value, m.name, m.description, m.id as old_id
                    FROM metatype_keys m 
                    WHERE m.deleted_at IS NULL AND m.container_id = $1 AND m.ontology_version IS NULL`,
                values: [containerID],
            };
        }
    }

    private refreshViewStatement(): QueryConfig {
        return {
            text: `REFRESH MATERIALIZED VIEW metatype_full_keys;`,
            values: [],
        };
    }

    // usees json_to_recordset to directly insert metatype keys from json
    private insertFromJSONStatement(keys: MetatypeKey[]) {
        const text = `INSERT INTO metatype_keys 
        (metatype_id, container_id, name, description, property_name, required, data_type, options, default_value, validation, created_by, modified_by)
        SELECT
            metatypes.id,
            ont_import.container_id,
            ont_import.name,
            ont_import.description,
            ont_import.property_name,
            ont_import.required,
            ont_import.data_type,
            ont_import.options,
            ont_import.default_value,
            ont_import.validation,
            ont_import.created_by,
            ont_import.modified_by
        FROM
            json_to_recordset(%L) AS ont_import 
                (container_id int8,
                name text,
                description text,
                property_name text,
                data_type text,
                required bool,
                validation jsonb,
                options jsonb,
                default_value jsonb,
                old_id int8,
                created_by text,
                modified_by text,
                metatype_id int8)
            LEFT JOIN metatypes ON metatypes.old_id = ont_import.metatype_id
            ON CONFLICT (metatype_id, property_name)
            DO UPDATE SET
                created_by = EXCLUDED.created_by,
                modified_by = EXCLUDED.created_by,
                created_at = NOW(),
                modified_at = NOW(),
                deleted_at = NULL,
                name = EXCLUDED.name,
                metatype_id = EXCLUDED.metatype_id::bigint,
                container_id = EXCLUDED.container_id::bigint,
                description = EXCLUDED.description,
                property_name = EXCLUDED.property_name,
                required = EXCLUDED.required::boolean,
                data_type = EXCLUDED.data_type,
                options = EXCLUDED.options::jsonb,
                default_value = EXCLUDED.default_value::jsonb,
                validation = EXCLUDED.validation::jsonb
            WHERE
                EXCLUDED.metatype_id = metatype_keys.metatype_id
                AND EXCLUDED.property_name = metatype_keys.property_name`;
        const values = JSON.stringify(keys);

        return format(text, values);
    }
}
