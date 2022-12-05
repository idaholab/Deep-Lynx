import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Node, {NodeTransformation} from '../../../../domain_objects/data_warehouse/data/node';
import {NodeFile} from '../../../../domain_objects/data_warehouse/data/file';
import Tag from '../../../../domain_objects/data_warehouse/data/tag';

const format = require('pg-format');


export default class TagMapper extends Mapper {
    public resultClass = Tag;
    public static tableName = 'tags';
    public static viewname = 'current_tages';

    private static instance: TagMapper;

    public static get Instance(): TagMapper {
        if (!TagMapper.instance) {
            TagMapper.instance = new TagMapper();
        }

        return TagMapper.instance;
    }

    public async Create(userID: string, t: Tag, transaction?: PoolClient): Promise<Result<Tag>> {
        const r = await super.run(this.createStatement(userID, t), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Retrieve(id: string): Promise<Result<Tag>> {
        return super.retrieve<Tag>(this.retrieveStatement(id), {
            resultClass: this.resultClass,
        });
    }

    public async Delete(fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(fileID));
    }

    private createStatement(userID: string, ...tags: Tag[]): string {
        const text = `INSERT INTO tags(
            tag_name,
            container_id,
            metadata,
            created_by,
            modified_by
        ) VALUES %L RETURNING *`;
        const values = tags.map((tag) => [
            tag.tag_name,
            tag.container_id,
            JSON.stringify(tag.metadata),
            userID,
            userID,
        ])

        return format(text, values);
    }

    private deleteStatement(containerID: string): QueryConfig {
        return {
            text: `DELETE FROM files WHERE id = $1`,
            values: [containerID],
        };
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM files WHERE id = $1`,
            values: [id],
        };
    }
    

}