import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import MetatypeRelationship from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship';

const format = require('pg-format');

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
    public resultClass = MetatypeRelationship;
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
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, m: MetatypeRelationship[], transaction?: PoolClient): Promise<Result<MetatypeRelationship[]>> {
        return super.run(this.createStatement(userID, ...m), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async BulkCreateFromExport(
        userID: string,
        ontologyVersionID: string,
        m: MetatypeRelationship[],
        transaction?: PoolClient,
    ): Promise<Result<MetatypeRelationship[]>> {
        return super.run(this.createFromExportStatement(userID, ontologyVersionID, ...m), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async Retrieve(id: string): Promise<Result<MetatypeRelationship>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass: this.resultClass});
    }

    public async Update(userID: string, m: MetatypeRelationship, transaction?: PoolClient): Promise<Result<MetatypeRelationship>> {
        const r = await super.run(this.fullUpdateStatement(userID, m), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(userID: string, m: MetatypeRelationship[], transaction?: PoolClient): Promise<Result<MetatypeRelationship[]>> {
        return super.run(this.fullUpdateStatement(userID, ...m), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async ListForExport(containerID: string, ontologyVersionID?: string): Promise<Result<MetatypeRelationship[]>> {
        return super.rows(this.forExportStatement(containerID, ontologyVersionID), {
            resultClass: this.resultClass,
        });
    }

    public async Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
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

    public async JSONCreate(relationships: MetatypeRelationship[]): Promise<Result<boolean>> {
        return super.runStatement(this.insertFromJSONStatement(relationships))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...relationships: MetatypeRelationship[]): string {
        const text = `INSERT INTO metatype_relationships(
                                   container_id,
                                   name,
                                   description,
                                   created_by,
                                   modified_by) VALUES %L
                      ON CONFLICT (container_id, name, ontology_version) DO UPDATE SET
                        name = EXCLUDED.name,
                        created_by = EXCLUDED.created_by,
                        modified_by = EXCLUDED.created_by,
                        created_at = NOW(),
                        modified_at = NOW(),
                        deleted_at = NULL
                            WHERE EXCLUDED.name = metatype_relationships.name
                                AND EXCLUDED.container_id = metatype_relationships.container_id
                                AND EXCLUDED.ontology_version = metatype_relationships.ontology_version 
                                   RETURNING *`;
        const values = relationships.map((r) => [r.container_id, r.name, r.description, userID, userID]);

        return format(text, values);
    }

    private createFromExportStatement(userID: string, ontologyVersionID: string, ...relationships: MetatypeRelationship[]): string {
        const text = `INSERT INTO metatype_relationships(
                                   container_id,
                                   name,
                                   description,
                                   ontology_version,
                                   old_id,
                                   created_by,
                                   modified_by) VALUES %L
                      ON CONFLICT (container_id, name, ontology_version) DO UPDATE SET
                        name = EXCLUDED.name,
                        old_id = EXCLUDED.old_id,
                        created_by = EXCLUDED.created_by,
                        modified_by = EXCLUDED.created_by,
                        created_at = NOW(),
                        modified_at = NOW(),
                        deleted_at = NULL
                            WHERE EXCLUDED.name = metatype_relationships.name
                                AND EXCLUDED.container_id = metatype_relationships.container_id
                                AND EXCLUDED.ontology_version = metatype_relationships.ontology_version 
                                   RETURNING *`;
        const values = relationships.map((r) => [r.container_id, r.name, r.description, ontologyVersionID, r.old_id, userID, userID]);

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

    private archiveForImportStatement(ontologyVersionID: string): QueryConfig {
        return {
            text: `UPDATE metatype_relationships SET deleted_at = NOW() WHERE ontology_version = $1`,
            values: [ontologyVersionID],
        };
    }

    private unarchiveStatement(relationshipID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE metatype_relationships SET deleted_at = NULL, modified_at = NOW(), modified_by = $2  WHERE id = $1`,
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

    private forExportStatement(containerID: string, ontologyVersionID?: string): QueryConfig {
        if (ontologyVersionID) {
            return {
                text: `SELECT m.name, m.description, m.id as old_id
                    FROM metatype_relationships m 
                    WHERE m.deleted_at IS NULL AND m.container_id = $1 AND m.ontology_version = $2`,
                values: [containerID, ontologyVersionID],
            };
        } else {
            return {
                text: `SELECT m.name, m.description, m.id as old_id
                    FROM metatype_relationships m 
                    WHERE m.deleted_at IS NULL AND m.container_id = $1 AND m.ontology_version IS NULL`,
                values: [containerID],
            };
        }
    }

    // usees json_to_recordset to directly insert metatype relationships from json
    private insertFromJSONStatement(relationships: MetatypeRelationship[]): string {
        const text = `INSERT INTO metatype_relationships(
                        container_id,
                        name,
                        description,
                        created_by,
                        modified_by,
                        ontology_version,
                        old_id)
                    SELECT *
                    FROM json_to_recordset(%L)
                    AS ont_import(container_id int8, name text, description text, created_by text, modified_by text, ontology_version int8, old_id int8)
                    ON CONFLICT (container_id, name, ontology_version) DO UPDATE SET
                        name = EXCLUDED.name,
                        old_id = EXCLUDED.old_id,
                        created_by = EXCLUDED.created_by,
                        modified_by = EXCLUDED.created_by,
                        created_at = NOW(),
                        modified_at = NOW(),
                        deleted_at = NULL
                    WHERE EXCLUDED.name = metatype_relationships.name
                    AND EXCLUDED.container_id = metatype_relationships.container_id
                    AND EXCLUDED.ontology_version = metatype_relationships.ontology_version`;
        const values = JSON.stringify(relationships);

        return format(text, values);
    }
}
