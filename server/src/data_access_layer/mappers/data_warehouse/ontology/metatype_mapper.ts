import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';
import MetatypeInheritance from '../../../../domain_objects/data_warehouse/ontology/metatype_inheritance';

const format = require('pg-format');

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
    public resultClass = Metatype;
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
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, m: Metatype[], transaction?: PoolClient): Promise<Result<Metatype[]>> {
        return super.run(this.createStatement(userID, ...m), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async Retrieve(id: string): Promise<Result<Metatype>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass: this.resultClass});
    }

    public async RetrieveByUUID(id: string): Promise<Result<Metatype>> {
        return super.retrieve(this.retrieveStatementByUUID(id), {resultClass: this.resultClass});
    }

    public async RetrieveByOldID(oldId: string, transaction?: PoolClient): Promise<Result<Metatype>> {
        return super.retrieve(this.retrieveStatementByOldID(oldId), {resultClass: this.resultClass});
    }

    public async BulkRetrieveByOldID(oldId: string[], transaction?: PoolClient): Promise<Result<Metatype[]>> {
        return super.run(this.retrieveStatementByMultipleOldIDs(...oldId), {
            transaction,
            resultClass: this.resultClass
        });
    }

    public async Update(userID: string, m: Metatype, transaction?: PoolClient): Promise<Result<Metatype>> {
        const r = await super.run(this.fullUpdateStatement(userID, m), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(userID: string, m: Metatype[], transaction?: PoolClient): Promise<Result<Metatype[]>> {
        return super.run(this.fullUpdateStatement(userID, ...m), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async ListForExport(containerID: string, ontologyVersionID?: string): Promise<Result<Metatype[]>> {
        return super.rows(this.forExportStatement(containerID, ontologyVersionID), {
            resultClass: this.resultClass,
        });
    }

    public async ListInheritancesForExport(m: Metatype[], transaction?: PoolClient): Promise<Result<MetatypeInheritance[]>> {
        return super.rows(this.forExportInheritancesStatement(...m), {
            transaction,
            resultClass: MetatypeInheritance,
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

    public async ArchiveForImport(ontologyVersionID: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.archiveForImportStatement(ontologyVersionID), {transaction});
    }

    public async Unarchive(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.unarchiveStatement(id, userID));
    }

    public async JSONCreate(metatypes: Metatype[]): Promise<Result<boolean>> {
        return super.runStatement(this.insertFromJSONStatement(metatypes));
    }

    public async UpdateInheritance(m: Metatype[], transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.upsertMetatypesInheritance(m), {
            transaction,
        });
    }

    public async DeleteInheritance(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteMetatypesInheritance(id));
    }

    public async InheritanceBulkInsert(pairs: [string, string][]): Promise<Result<boolean>> {
        return super.runStatement(this.metatypesInheritanceBulkInsert(pairs));
    }

    public async DisableInheritanceTrigger(): Promise<Result<boolean>> {
        return super.runStatement(this.disableInheritanceTrigger());
    }

    public async EnableInheritanceTrigger(): Promise<Result<boolean>> {
        return super.runStatement(this.enableInheritanceTrigger());
    }

    public async upsertInheritances(mi: MetatypeInheritance[]): Promise<Result<boolean>> {
        return super.runStatement(this.upsertMetatypeInheritances(mi));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...metatypes: Metatype[]): string {
        const text = `INSERT INTO metatypes(
                      container_id,
                      name,
                      description, 
                      created_by, 
                      modified_by, 
                      ontology_version) VALUES %L 
                      ON CONFLICT (container_id, name, ontology_version) DO UPDATE SET
                          name = EXCLUDED.name,
                          created_by = EXCLUDED.created_by,
                          modified_by = EXCLUDED.created_by,
                          created_at = NOW(),
                          modified_at = NOW(),
                          deleted_at = NULL
                      WHERE EXCLUDED.name = metatypes.name 
                      AND EXCLUDED.container_id = metatypes.container_id 
                      AND EXCLUDED.ontology_version = metatypes.ontology_version
                      RETURNING *`;
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

    private retrieveStatementByUUID(metatypeID: string): QueryConfig {
        return {
            text: `SELECT * FROM metatypes_view 
                    WHERE uuid = $1 AND ontology_version IN (SELECT id FROM ontology_versions WHERE status = 'published' ORDER BY id DESC LIMIT 1)`,
            values: [metatypeID],
        };
    }

    private retrieveStatementByOldID(metatypeOldID: string): QueryConfig {
        return {
            text: `SELECT * FROM metatypes_view WHERE old_id = $1 
                    ORDER BY id DESC LIMIT 1`,
            values: [metatypeOldID],
        };
    }

    private retrieveStatementByMultipleOldIDs(...metatypeOldIDs: string[]): string {
        const text = `SELECT * FROM metatypes_view WHERE old_id in %L 
                        ORDER BY id DESC`;
        const values = [metatypeOldIDs];
        return format(text, values);
    }

    private archiveStatement(metatypeID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE metatypes SET deleted_at = NOW(), modified_at = NOW(), modified_by = $2  WHERE id = $1`,
            values: [metatypeID, userID],
        };
    }

    private archiveForImportStatement(ontologyVersionID: string): QueryConfig {
        return {
            text: `UPDATE metatypes SET deleted_at = NOW() WHERE ontology_version = $1`,
            values: [ontologyVersionID],
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

    private forExportStatement(containerID: string, ontologyVersionID?: string): QueryConfig {
        if (ontologyVersionID) {
            return {
                text: `SELECT m.name, m.description, m.id as old_id
                    FROM metatypes m 
                    WHERE m.deleted_at IS NULL AND m.container_id = $1 AND m.ontology_version = $2`,
                values: [containerID, ontologyVersionID],
            };
        } else {
            return {
                text: `SELECT m.name, m.description, m.id as old_id
                    FROM metatypes m 
                    WHERE m.deleted_at IS NULL AND m.container_id = $1 AND m.ontology_version IS NULL`,
                values: [containerID],
            };
        }
    }

    private forExportInheritancesStatement(...metatypes: Metatype[]): string {
        const text = `SELECT * FROM metatypes_inheritance WHERE parent_id IN (%L)`;
        const values = metatypes.map((metatype) => [metatype.old_id]);
        return format(text, values);
    }

    // uses json_to_recordset to directly insert metatypes from json
    private insertFromJSONStatement(metatypes: Metatype[]) {
        const text = `INSERT INTO metatypes(
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
                    WHERE EXCLUDED.name = metatypes.name 
                    AND EXCLUDED.container_id = metatypes.container_id 
                    AND EXCLUDED.ontology_version = metatypes.ontology_version`;
        const values = JSON.stringify(metatypes);

        return format(text, values);
    }

    // accommodates both new inheritance inserts and parent_id updates
    private upsertMetatypesInheritance(metatypes: Metatype[]) {
        const text = `INSERT INTO metatypes_inheritance (parent_id, child_id) 
                    VALUES %L
                    ON CONFLICT (child_id) DO UPDATE
                    SET parent_id = excluded.parent_id`;
        const values = metatypes.map((metatype) => [metatype.parent_id, metatype.id]);

        return format(text, values);
    }

    private deleteMetatypesInheritance(metatypeID: string) {
        return {
            text: `DELETE FROM metatypes_inheritance WHERE child_id = $1`,
            values: [metatypeID],
        };
    }

    private metatypesInheritanceBulkInsert(pairs: [string, string][]) {
        const text = `INSERT INTO metatypes_inheritance (parent_id, child_id)
                    VALUES %L
                    ON CONFLICT (child_id) DO UPDATE
                    SET parent_id = excluded.parent_id`;
        const values = pairs;

        return format(text, values);
    }

    private disableInheritanceTrigger(): QueryConfig {
        return {
            text: `ALTER TABLE metatypes_inheritance DISABLE TRIGGER check_metatype_inheritance;`,
            values: [],
        };
    }

    private enableInheritanceTrigger(): QueryConfig {
        return {
            text: `ALTER TABLE metatypes_inheritance ENABLE TRIGGER check_metatype_inheritance;`,
            values: [],
        };
    }

    // accommodates both new inheritance inserts and parent_id updates
    private upsertMetatypeInheritances(metatypesInheritance: MetatypeInheritance[]): QueryConfig {
        const text = `INSERT INTO metatypes_inheritance (parent_id, child_id) 
                    VALUES %L
                    ON CONFLICT (parent_id, child_id) DO UPDATE
                    SET parent_id = excluded.parent_id`;
        const values = metatypesInheritance.map((metatype) => [metatype.parent_id, metatype.child_id]);
        return format(text, values);
    }
}
