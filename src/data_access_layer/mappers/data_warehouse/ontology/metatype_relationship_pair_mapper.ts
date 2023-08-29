import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import MetatypeRelationshipPair from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import Logger from '../../../../services/logger';

const format = require('pg-format');

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
    public resultClass = MetatypeRelationshipPair;
    public static tableName = 'metatype_relationship_pairs';
    public static viewName = 'metatype_full_relationship_pairs';

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
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        this.RefreshView().catch((e) => {
            Logger.error(`error refreshing metatype keys view ${e}`);
        });

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, input: MetatypeRelationshipPair[], transaction?: PoolClient): Promise<Result<MetatypeRelationshipPair[]>> {
        const r = await super.run(this.createStatement(userID, ...input), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        this.RefreshView().catch((e) => {
            Logger.error(`error refreshing metatype keys view ${e}`);
        });

        return Promise.resolve(r);
    }

    public async BulkCreateFromExport(
        userID: string,
        ontologyVersionID: string,
        input: MetatypeRelationshipPair[],
        transaction?: PoolClient,
    ): Promise<Result<MetatypeRelationshipPair[]>> {
        return super.run(this.createFromExportStatement(userID, ontologyVersionID, ...input), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async Retrieve(id: string): Promise<Result<MetatypeRelationshipPair>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass: this.resultClass});
    }

    public async ListForMetatype(metatypeID: string, containerID: string): Promise<Result<MetatypeRelationshipPair[]>> {
        return super.rows(this.listStatement(metatypeID, containerID), {resultClass: this.resultClass});
    }

    public async ListForMetatypeIDs(metatype_ids: string[], containerID: string): Promise<Result<MetatypeRelationshipPair[]>> {
        return super.rows(this.listPairsStatement(metatype_ids, containerID));
    }

    public async ListFromViewForMetatype(metatypeID: string): Promise<Result<MetatypeRelationshipPair[]>> {
        return super.rows(this.listViewStatement(metatypeID), {resultClass: this.resultClass});
    }

    public async ListFromViewForMetatypeIDs(metatype_ids: string[]): Promise<Result<MetatypeRelationshipPair[]>> {
        return super.rows(this.listViewPairsStatement(metatype_ids));
    }

    public async Update(userID: string, p: MetatypeRelationshipPair, transaction?: PoolClient): Promise<Result<MetatypeRelationshipPair>> {
        const r = await super.run(this.fullUpdateStatement(userID, p), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(userID: string, p: MetatypeRelationshipPair[], transaction?: PoolClient): Promise<Result<MetatypeRelationshipPair[]>> {
        return super.run(this.fullUpdateStatement(userID, ...p), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async ListForExport(containerID: string, ontologyVersionID?: string): Promise<Result<MetatypeRelationshipPair[]>> {
        return super.rows(this.forExportStatement(containerID, ontologyVersionID), {
            resultClass: this.resultClass,
        });
    }

    public async Archive(pairID: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.archiveStatement(pairID, userID));
    }

    public async ArchiveForImport(ontologyVersionID: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.archiveForImportStatement(ontologyVersionID), {transaction});
    }

    public async Unarchive(pairID: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.unarchiveStatement(pairID, userID));
    }

    public async Delete(pairID: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(pairID));
    }

    public async JSONCreate(relationshipPairs: MetatypeRelationshipPair[]): Promise<Result<boolean>> {
        return super.runStatement(this.insertFromJSONStatement(relationshipPairs));
    }

    public RefreshView(): Promise<Result<boolean>> {
        return super.runStatement(this.refreshViewStatement());
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
                        VALUES %L 
                    ON CONFLICT(relationship_id,origin_metatype_id,destination_metatype_id) DO UPDATE SET
                        created_by = EXCLUDED.created_by,
                        modified_by = EXCLUDED.created_by,
                        created_at = NOW(),
                        modified_at = NOW(),
                        deleted_at = NULL,
                        name = EXCLUDED.name,
                        description = EXCLUDED.description
                    WHERE EXCLUDED.relationship_id = metatype_relationship_pairs.relationship_id
                    AND EXCLUDED.origin_metatype_id = metatype_relationship_pairs.origin_metatype_id
                    AND EXCLUDED.destination_metatype_id = metatype_relationship_pairs.destination_metatype_id
                        RETURNING *`;

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

    private createFromExportStatement(userID: string, ontologyVersionID: string, ...pairs: MetatypeRelationshipPair[]): string {
        const text = `INSERT INTO
                            metatype_relationship_pairs(
                                                        name,
                                                        description,
                                                        relationship_id,
                                                        origin_metatype_id,
                                                        destination_metatype_id,
                                                        relationship_type,
                                                        container_id,
                                                        ontology_version,
                                                        old_id,
                                                        created_by, modified_by)
                        VALUES %L 
                    ON CONFLICT(relationship_id,origin_metatype_id,destination_metatype_id) DO UPDATE SET
                        old_id = EXCLUDED.old_id,
                        created_by = EXCLUDED.created_by,
                        modified_by = EXCLUDED.created_by,
                        created_at = NOW(),
                        modified_at = NOW(),
                        deleted_at = NULL,
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        relationship_type = EXCLUDED.relationship_type
                    WHERE EXCLUDED.relationship_id = metatype_relationship_pairs.relationship_id
                    AND EXCLUDED.origin_metatype_id = metatype_relationship_pairs.origin_metatype_id
                    AND EXCLUDED.destination_metatype_id = metatype_relationship_pairs.destination_metatype_id
                        RETURNING *`;

        const values = pairs.map((pair) => [
            pair.name,
            pair.description,
            pair.relationship!.id,
            pair.originMetatype!.id,
            pair.destinationMetatype!.id,
            pair.relationship_type,
            pair.container_id,
            ontologyVersionID,
            pair.old_id,
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

    private archiveForImportStatement(ontologyVersionID: string): QueryConfig {
        return {
            text: `UPDATE metatype_relationship_pairs SET deleted_at = NOW() WHERE ontology_version = $1`,
            values: [ontologyVersionID],
        };
    }

    private unarchiveStatement(pairID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE metatype_relationship_pairs SET deleted_at = NULL, modified_at = NOW(), modified_by = $2  WHERE id = $1`,
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

    // list statement must reference the get_metatype_relationship_pairs function or view
    // so that we are getting all relationships back, both the metatype's own and the inherited pairs
    private listViewStatement(metatypeID: string): QueryConfig {
        return {
            text: `SELECT * FROM metatype_full_relationship_pairs WHERE metatype_id = $1`,
            values: [metatypeID],
        };
    }

    private listViewPairsStatement(metatype_ids: string[]): QueryConfig {
        const text = `SELECT * FROM metatype_full_relationship_pairs WHERE metatype_id IN (%L)`;
        return format(text, metatype_ids);
    }

    private listStatement(metatypeID: string, containerID: string): QueryConfig {
        return {
            text: `SELECT * FROM get_metatype_relationship_pairs($1::bigint, $2::bigint) ORDER BY name`,
            values: [metatypeID, containerID],
        };
    }

    private listPairsStatement(metatype_ids: string[], containerID: string): QueryConfig {
        const text = `WITH RECURSIVE parents AS (
            SELECT id, container_id, name, description, created_at,
                   modified_at, created_by, modified_by, ontology_version,
                   old_id, deleted_at, id AS pair_parent, 1 AS lvl
            FROM metatypes_view
            WHERE container_id = $2
            UNION
            SELECT v.id, v.container_id, v.name, v.description, v.created_at,
                   v.modified_at, v.created_by, v.modified_by, v.ontology_version,
                   v.old_id, v.deleted_at, p.pair_parent, p.lvl + 1
            FROM parents p JOIN metatypes_view v ON p.id = v.parent_id WHERE v.container_id = $2
        ) SELECT mk.id, mk.relationship_id, p.id AS metatype_id, mk.origin_metatype_id,
                 mk.destination_metatype_id, mk.container_id, mk.name, mk.description,
                 mk.relationship_type, mk.created_at, mk.modified_at,
                 mk.created_by, mk.modified_by, mk.ontology_version, mk.deleted_at,
                 p.lvl, origin.name        AS origin_metatype_name,
                 destination.name   AS destination_metatype_name,
                 relationships.name AS relationship_name
                      FROM parents p JOIN metatype_relationship_pairs mk ON p.pair_parent = mk.origin_metatype_id
                     LEFT JOIN metatypes origin ON mk.origin_metatype_id = origin.id
                     LEFT JOIN metatypes destination ON mk.destination_metatype_id = destination.id
                     LEFT JOIN metatype_relationships relationships ON mk.relationship_id = relationships.id
                      WHERE p.id IN ($1) AND mk.container_id = $2
                      ORDER BY metatype_id, mk.name`;
        const values = [metatype_ids, containerID];
        return format(text, values);
    }

    private forExportStatement(containerID: string, ontologyVersionID?: string): QueryConfig {
        if (ontologyVersionID) {
            return {
                text: `SELECT m.container_id, 
                          m.name, 
                          m.description, 
                          m.id as old_id, 
                          m.destination_metatype_id, 
                          m.origin_metatype_id, 
                          m.relationship_id, 
                          m.relationship_type
                    FROM metatype_relationship_pairs m 
                    WHERE m.deleted_at IS NULL AND m.container_id = $1 AND m.ontology_version = $2`,
                values: [containerID, ontologyVersionID],
            };
        } else {
            return {
                text: `SELECT m.container_id, 
                          m.name, 
                          m.description, 
                          m.id as old_id, 
                          m.destination_metatype_id, 
                          m.origin_metatype_id, 
                          m.relationship_id, 
                          m.relationship_type
                    FROM metatype_relationship_pairs m 
                    WHERE m.deleted_at IS NULL AND m.container_id = $1 AND m.ontology_version IS NULL`,
                values: [containerID],
            };
        }
    }

    private refreshViewStatement(): QueryConfig {
        return {
            text: `REFRESH MATERIALIZED VIEW metatype_full_relationship_pairs;`,
            values: [],
        };
    }

    // usees json_to_recordset to directly insert metatype relationship pairs from json
    private insertFromJSONStatement(relationshipPairs: MetatypeRelationshipPair[]) {
        const text = `INSERT INTO metatype_relationship_pairs 
                (relationship_id,
                origin_metatype_id,
                destination_metatype_id,
                container_id,
                name,
                description,
                relationship_type,
                created_by,
                modified_by,
                ontology_version)
            SELECT
                r.id,
                origin.id,
                destination.id,
                ont_import.container_id,
                ont_import.name,
                ont_import.description,
                ont_import.relationship_type,
                ont_import.created_by,
                ont_import.modified_by,
                ont_import.ontology_version
            FROM
                json_to_recordset(%L) AS ont_import 
                (container_id int8,
                name text,
                description text,
                relationship_type text,
                old_id int8,
                created_by text,
                modified_by text,
                ontology_version int8,
                "destinationMetatype" jsonb,
                "originMetatype" jsonb,
                relationship jsonb)
            LEFT JOIN ( 
                SELECT DISTINCT ON (name) name, id, old_id
                FROM metatype_relationships ORDER BY name, id DESC ) r
                ON r.old_id = (ont_import.relationship->>'id')::BIGINT
            LEFT JOIN ( 
                SELECT DISTINCT ON (name) name, id, old_id
                FROM metatypes ORDER BY name, id DESC ) origin
                ON origin.old_id = (ont_import."originMetatype"->>'id')::BIGINT    
            LEFT JOIN ( 
                SELECT DISTINCT ON (name) name, id, old_id 
                FROM metatypes ORDER BY name, id DESC ) destination
                ON destination.old_id = (ont_import."destinationMetatype"->>'id')::BIGINT
            ON CONFLICT(relationship_id,origin_metatype_id,destination_metatype_id) DO UPDATE SET
                    created_by = EXCLUDED.created_by,
                    modified_by = EXCLUDED.created_by,
                    created_at = NOW(),
                    modified_at = NOW(),
                    deleted_at = NULL,
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    relationship_type = EXCLUDED.relationship_type,
                    ontology_version = EXCLUDED.ontology_version
                WHERE EXCLUDED.relationship_id = metatype_relationship_pairs.relationship_id
                AND EXCLUDED.origin_metatype_id = metatype_relationship_pairs.origin_metatype_id
                AND EXCLUDED.destination_metatype_id = metatype_relationship_pairs.destination_metatype_id
                AND EXCLUDED.ontology_version = metatype_relationship_pairs.ontology_version`;
        const values = JSON.stringify(relationshipPairs);

        return format(text, values);
    }
}
