// Common Classes
import Result from '../../../../common_classes/result';

// Domain Objects
import Tag from '../../../../domain_objects/data_warehouse/data/tag';
import Edge from '../../../../domain_objects/data_warehouse/data/edge';
import File from '../../../../domain_objects/data_warehouse/data/file';
import Node from '../../../../domain_objects/data_warehouse/data/node';

// Mapper
import Mapper from '../../mapper';

// PostgreSQL
import {PoolClient, QueryConfig} from 'pg';
const format = require('pg-format');

export default class TagMapper extends Mapper {
    public resultClass = Tag;
    public static tableName = 'tags';

    private static instance: TagMapper;

    public static get Instance(): TagMapper {
        if (!TagMapper.instance) {
            TagMapper.instance = new TagMapper();
        }

        return TagMapper.instance;
    }

    // Operations

    public async Create(userID: string, t: Tag, transaction?: PoolClient): Promise<Result<Tag>> {
        const r = await super.run(this.createStatement(userID, t), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Retrieve(tag_name: string, transaction?: PoolClient): Promise<Result<Tag>> {
        const r = await super.run<Tag>(this.retrieveStatement(tag_name), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async RetrieveByID(id: string, transaction?: PoolClient): Promise<Result<Tag>> {
        return super.retrieve<Tag>(this.retrieveByIdStatement(id), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async Update(userID: string, tag: Tag, transaction?: PoolClient): Promise<Result<Tag>> {
        const r = await super.run(this.updateStatement(userID, tag), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Delete(tagID: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(tagID));
    }

    public async Import(userID: string, tag: Tag, transaction?: PoolClient): Promise<Result<Tag>> {
        const r = await super.run(this.importStatement(userID, tag), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async TagFile(tagID: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.tagFileStatement(tagID, fileID));
    }

    public async TagNode(tagID: string, nodeID: string): Promise<Result<boolean>> {
        return super.runStatement(this.tagNodeStatement(tagID, nodeID));
    }

    public async TagEdge(tagID: string, edgeID: string): Promise<Result<boolean>> {
        return super.runStatement(this.tagEdgeStatement(tagID, edgeID));
    }

    public async TagsForNode(nodeID: string): Promise<Result<Tag[]>> {
        return super.rows<Tag>(this.tagsForNode(nodeID), {
            resultClass: this.resultClass,
        });
    }

    public async TagsForFile(fileID: string): Promise<Result<Tag[]>> {
        return super.rows<Tag>(this.tagsForFile(fileID), {
            resultClass: this.resultClass,
        });
    }

    public async TagsForEdge(edgeID: string): Promise<Result<Tag[]>> {
        return super.rows<Tag>(this.tagsForEdge(edgeID), {
            resultClass: this.resultClass,
        });
    }

    public async NodesWithTag(tagID: string): Promise<Result<Node[]>> {
        return super.rows<Node>(this.nodesWithTag(tagID), {
            resultClass: Node,
        });
    }

    public async FilesWithTag(tagID: string): Promise<Result<File[]>> {
        return super.rows<File>(this.filesWithTag(tagID), {
            resultClass: File,
        });
    }

    public async EdgesWithTag(tagID: string): Promise<Result<Edge[]>> {
        return super.rows<Edge>(this.edgesWithTag(tagID), {
            resultClass: Edge,
        });
    }

    public async WebglFilesAndTags(containerID: string): Promise<Result<any>> {
        return super.rows<any>(this.webglFilesAndTags(containerID));
    }

    public async DetachTagFromNode(tagID: string, nodeID: string): Promise<Result<boolean>> {
        return super.runStatement(this.detachTagFromNodeStatement(tagID, nodeID));
    }

    public async DetachTagFromEdge(tagID: string, edgeID: string): Promise<Result<boolean>> {
        return super.runStatement(this.detachTagFromEdgeStatement(tagID, edgeID));
    }

    public async DetachTagFromFile(tagID: string, fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.detachTagFromFileStatement(tagID, fileID));
    }

    // Statements

    private createStatement(userID: string, ...tags: Tag[]): string {
        const text = `INSERT INTO tags(
            tag_name,
            container_id,
            metadata,
            created_by) VALUES %L 
            RETURNING *`;
        const values = tags.map((tag) => [tag.tag_name, tag.container_id, JSON.stringify(tag.metadata), userID]);

        return format(text, values);
    }

    private retrieveStatement(tag_name: string): QueryConfig {
        return {
            text: `SELECT * FROM tags WHERE tag_name = $1`,
            values: [tag_name],
        };
    }

    private retrieveByIdStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM tags WHERE id = $1`,
            values: [id],
        };
    }

    private updateStatement(userID: string, ...tags: Tag[]): string {
        const text = `INSERT INTO tags(
            id,
            tag_name,
            container_id,
            metadata,
            created_by,
            modified_by) VALUES %L 
            ON CONFLICT(id) DO UPDATE SET
                tag_name = EXCLUDED.tag_name,
                container_id = EXCLUDED.container_id,
                metadata = tags.metadata || EXCLUDED.metadata,
                modified_at = NOW()
            WHERE EXCLUDED.id = tags.id
            RETURNING *`;

        const values = tags.map((t) => [t.id, t.tag_name, t.container_id, JSON.stringify(t.metadata), userID, userID]);

        return format(text, values);
    }

    private deleteStatement(containerID: string): QueryConfig {
        return {
            text: `DELETE FROM tags WHERE id = $1`,
            values: [containerID],
        };
    }

    private importStatement(userID: string, ...tags: Tag[]): string {
        const text = `INSERT INTO tags(
                        id,
                        tag_name,
                        container_id,
                        metadata,
                        modified_at,
                        created_by,
                        modified_by,
                        created_at) VALUES %L
                        ON CONFLICT(id, tag_name) DO UPDATE SET
                            metadata = EXCLUDED.metadata,
                            modified_at = NOW()
                        WHERE EXCLUDED.id = tags.id 
                        RETURNING *`;

        const values = tags.map((t) => [
            t.id,
            t.tag_name,
            t.container_id,
            JSON.stringify(t.metadata),
            t.modified_at,
            userID,
            userID,
            t.created_at ? t.created_at : new Date().toISOString(),
        ]);

        return format(text, values);
    }

    private tagFileStatement(tagID: string, fileID: string): QueryConfig {
        return {
            text: `INSERT INTO file_tags(tag_id, file_id) VALUES ($1, $2) ON CONFLICT(tag_id, file_id) DO NOTHING`,
            values: [tagID, fileID],
        };
    }

    private tagNodeStatement(tagID: string, nodeID: string): QueryConfig {
        return {
            text: `INSERT INTO node_tags(tag_id, node_id) VALUES ($1, $2) ON CONFLICT(tag_id, node_id) DO NOTHING`,
            values: [tagID, nodeID],
        };
    }

    private tagEdgeStatement(tagID: string, edgeID: string): QueryConfig {
        return {
            text: `INSERT INTO edge_tags(tag_id, edge_id) VALUES ($1, $2) ON CONFLICT(tag_id, edge_id) DO NOTHING`,
            values: [tagID, edgeID],
        };
    }

    private tagsForNode(nodeID: string): QueryConfig {
        return {
            text: `SELECT tags.* FROM node_tags LEFT JOIN tags ON tags.id = node_tags.tag_id WHERE node_id = $1`,
            values: [nodeID],
        };
    }

    private tagsForFile(fileID: string): QueryConfig {
        return {
            text: `SELECT tags.* FROM file_tags LEFT JOIN tags ON tags.id = file_tags.tag_id WHERE file_id = $1`,
            values: [fileID],
        };
    }

    private tagsForEdge(edgeID: string): QueryConfig {
        return {
            text: `SELECT tags.* FROM edge_tags LEFT JOIN tags ON tags.id = edge_tags.tag_id WHERE edge_id = $1`,
            values: [edgeID],
        };
    }

    private nodesWithTag(tagID: string): QueryConfig {
        return {
            text: `SELECT DISTINCT ON (nodes.id) nodes.*
            FROM nodes 
            JOIN node_tags 
            ON nodes.id = node_tags.node_id 
            WHERE tag_id = $1
            AND nodes.deleted_at IS NULL
            ORDER BY nodes.id, nodes.created_at DESC`,
            values: [tagID],
        };
    }

    private filesWithTag(tagID: string): QueryConfig {
        return {
            text: `SELECT DISTINCT ON (file_name) 
                    files.* FROM files
                    LEFT JOIN file_tags
                    ON files.id = file_tags.file_id
                    WHERE tag_id = $1
                    ORDER BY file_name, created_at DESC;`,
            values: [tagID],
        };
    }

    private edgesWithTag(tagID: string): QueryConfig {
        return {
            text: `SELECT DISTINCT ON (edges.origin_id, edges.destination_id, edges.data_source_id, edges.relationship_pair_id) edges.*
            FROM edges 
            JOIN edge_tags 
            ON edges.id = edge_tags.edge_id 
            WHERE tag_id = $1
            AND edges.deleted_at IS NULL
            ORDER BY edges.origin_id, edges.destination_id, edges.data_source_id, edges.relationship_pair_id, edges.created_at DESC`,
            values: [tagID],
        };
    }

    private webglFilesAndTags(containerID: string): QueryConfig {
        return {
            text: `SELECT DISTINCT
                   ON (files.id) files.id AS file_id,
                       files.file_name,
                       files.file_size,
                       files.modified_at AS file_modified_at,
                       files.created_at AS file_created_at,
                       tags.*
                   FROM files
                   INNER JOIN file_tags
                   ON files.id = file_tags.file_id
                   INNER JOIN tags
                   ON tags.id = file_tags.tag_id
                   WHERE tags.metadata->>'webgl' = 'true'
                   AND files.container_id = $1
                   ORDER BY file_id, file_modified_at DESC;`,
            values: [containerID],
        };
    }

    private detachTagFromNodeStatement(tagID: string, nodeID: string): QueryConfig {
        return {
            text: `DELETE FROM node_tags WHERE tag_id = $1 AND node_id = $2`,
            values: [tagID, nodeID],
        };
    }

    private detachTagFromEdgeStatement(tagID: string, edgeID: string): QueryConfig {
        return {
            text: `DELETE FROM edge_tags WHERE tag_id = $1 AND edge_id = $2`,
            values: [tagID, edgeID],
        };
    }

    private detachTagFromFileStatement(tagID: string, fileID: string): QueryConfig {
        return {
            text: `DELETE FROM file_tags WHERE tag_id = $1 AND file_id = $2`,
            values: [tagID, fileID],
        };
    }
}
