// Common Classes
import Result from '../../../../common_classes/result';

// Domain Objects
import Tag from '../../../../domain_objects/data_warehouse/data/tag';

// Mapper
import Mapper from '../../mapper';

// PostgreSQL
import {PoolClient, QueryConfig} from 'pg';
const format = require('pg-format');

export default class TagMapper extends Mapper {
    public resultClass = Tag;
    public static tableName = 'tags';
    public static viewName = 'current_tages';

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

    public async Retrieve(id: string, transaction?: PoolClient): Promise<Result<Tag>> {
        return super.retrieve<Tag>(this.retrieveStatement(id), {
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

    // Statements

    private createStatement(userID: string, ...tags: Tag[]): string {
        const text = `INSERT INTO tags(
            tag_name,
            container_id,
            data_source_id,
            metadata,
            created_by) VALUES %L RETURNING *`;
        const values = tags.map((tag) => [
            tag.tag_name,
            tag.container_id,
            tag.data_source_id,
            JSON.stringify(tag.metadata),
            userID,
        ])

        return format(text, values);
    }

    private retrieveStatement(id: string): QueryConfig {
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
            data_source_id,
            metadata,
            created_by,
            modified_by) VALUES %L 
            ON CONFLICT(id, tag_name) DO UPDATE SET
                properties = EXCLUDED.properties,
                metadata = EXCLUDED.metadata,
                modified_at = NOW()
            WHERE EXCLUDED.id = tags.id
            RETURNING *`;

        const values = tags.map((t) => [
            t.id,
            t.tag_name,
            t.container_id,
            t.data_source_id,
            JSON.stringify(t.metadata),
            userID,
            userID,
        ]);

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
                        data_source_id,
                        metadata,
                        modified_at,
                        created_by,
                        modified_by,
                        created_at) VALUES %L
                        ON CONFLICT(id, tag_name) DO UPDATE SET
                            properties = EXCLUDED.properties,
                            metadata = EXCLUDED.metadata,
                            modified_at = NOW()
                        WHERE EXCLUDED.id = tags.id 
                        RETURNING *`;

        const values = tags.map((t) => [
            t.id,
            t.tag_name,
            t.container_id,
            t.data_source_id,
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
            text: `INSERT INTO file_tags(tag_id, file_id) VALUES ($1, $2)`,
            values: [tagID, fileID],
        };
    }

    private tagNodeStatement(tagID: string, nodeID: string): QueryConfig {
        return {
            text: `INSERT INTO node_tags(tag_id, node_id) VALUES ($1, $2)`,
            values: [tagID, nodeID]
        }
    }

    private tagEdgeStatement(tagID: string, edgeID: string): QueryConfig {
        return {
            text: `INSERT INTO edge_tags(tag_id, edge_id) VALUES ($1, $2)`,
            values: [tagID, edgeID]
        }
    }
}