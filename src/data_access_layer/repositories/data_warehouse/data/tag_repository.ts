// Common Classes
import Result from '../../../../common_classes/result';

// Domain Objects
import Node from '../../../../domain_objects/data_warehouse/data/node';
import Edge from '../../../../domain_objects/data_warehouse/data/edge';
import File from '../../../../domain_objects/data_warehouse/data/file';
import Tag from '../../../../domain_objects/data_warehouse/data/tag';
import {User} from '../../../../domain_objects/access_management/user';

// Logger
import Logger from '../../../../services/logger';

// Mapper
import TagMapper from '../../../mappers/data_warehouse/data/tag_mapper';

// PostgreSQL
import {PoolClient} from 'pg';

// Repository
import RepositoryInterface, {Repository} from '../../repository';

export default class TagRepository extends Repository implements RepositoryInterface<Tag> {
    #mapper: TagMapper = TagMapper.Instance;
    
    constructor() {
        super(TagMapper.viewName)
    }

    async create(tag: Tag, user: User, transaction?: PoolClient): Promise<Result<Tag>> {

        const t = new Tag({
            tag_name: tag.tag_name!,
            container_id: tag.container_id!,
            metadata: tag.metadata!
        })

        const saved = await this.save(t, user, transaction);
        if (saved.isError) return Promise.resolve(Result.Pass(saved));

        return Promise.resolve(Result.Success(t));
    }

    async retrieve(tag_name: string, transaction?: PoolClient): Promise<Result<Tag>> {
        const tag = await this.#mapper.Retrieve(tag_name, transaction);
        if (tag.isError) Logger.error('unable to load tag');

        return Promise.resolve(tag);
    }

    async findByID(id: string, transaction?: PoolClient): Promise<Result<Tag>> {
        const tag = await this.#mapper.RetrieveByID(id, transaction);
        if (tag.isError) Logger.error('unable to load tag');

        return Promise.resolve(tag);
    }

    delete(tag: Tag): Promise<Result<boolean>> {
        if (tag.id) {
            return this.#mapper.Delete(tag.id);
        }

        return Promise.resolve(Result.Failure('tag must have id'));
    }

    async save(tag: Tag, user: User, transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction = false;
        const errors = await tag.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`tag does not pass validation ${errors.join(',')}`));

        if (!transaction) {
            const newTransaction = await this.#mapper.startTransaction();
            if (newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiate db transaction'));

            transaction = newTransaction.value;
            internalTransaction = true;
        }

        // If the incoming tag has an id, find the existing tag and update it
        if (tag.id) {
            const original = await this.findByID(tag.id!);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, tag);

            const results = await this.#mapper.Update(user.id!, original.value);
            if (results.isError) {
                if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                return Promise.resolve(Result.Pass(results));
            }

        } else {
            // If the incoming tag already exists in the database (tag name), update it
            const original = await this.retrieve(tag.tag_name!);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));
            else if (original.value) {
                Object.assign(original.value, tag);
                const results = await this.#mapper.Update(user.id!, original.value);
                if (results.isError) {
                    if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                    return Promise.resolve(Result.Pass(results));
                }
                Object.assign(tag, results.value);
            }
            else {
                // If the incoming tag doesn't exist in the database, create a new one
                const results = await this.#mapper.Create(user.id!, tag);
                if (results.isError) {
                    if (internalTransaction) await this.#mapper.rollbackTransaction(transaction);
                    return Promise.resolve(Result.Pass(results));
                }
                Object.assign(tag, results.value);
            }

        }

        if (internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction);
            if (commit.isError) return Promise.resolve(Result.Pass(commit));
        }

        return Promise.resolve(Result.Success(true));
    }

    async tagNode(tag: Tag, node: Node) : Promise<Result<boolean>> {

        if (!node.id) {
            return Promise.resolve(Result.Failure('node must have id'));
        }

        return this.#mapper.TagNode(tag.id!, node.id);
    }

    async tagEdge(tag: Tag, edge: Edge) : Promise<Result<boolean>> {

        if (!edge.id) {
            return Promise.resolve(Result.Failure('edge must have id'));
        }

        return this.#mapper.TagEdge(tag.id!, edge.id);
    }

    async tagFile(tag: Tag, file: File) : Promise<Result<boolean>> {

        if (!file.id) {
            return Promise.resolve(Result.Failure('file must have id'));
        }

        return this.#mapper.TagFile(tag.id!, file.id);
    }

    async listTagsForNode(node: Node) : Promise<Result<Tag[]>> {

        return this.#mapper.TagsForNode(node.id!);

    }

    async listTagsForFile(file: File) : Promise<Result<Tag[]>> {

        return this.#mapper.TagsForFile(file.id!);

    }

    async listTagsForEdge(edge: Edge) : Promise<Result<Tag[]>> {

        return this.#mapper.TagsForEdge(edge.id!);

    }

    async listNodesWithTag(tag: Tag) : Promise<Result<Node[]>> {
        
        return this.#mapper.NodesWithTag(tag.id!);

    }

    async listFilesWithTag(tag: Tag) : Promise<Result<File[]>> {
        
        return this.#mapper.FilesWithTag(tag.id!);
        
    }

    async listEdgesWithTag(tag: Tag) : Promise<Result<Edge[]>> {
        
        return this.#mapper.EdgesWithTag(tag.id!);
        
    }

}