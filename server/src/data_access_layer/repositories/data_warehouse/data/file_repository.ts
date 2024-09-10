import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import FileMapper from '../../../mappers/data_warehouse/data/file_mapper';
import {User} from '../../../../domain_objects/access_management/user';
import Result from '../../../../common_classes/result';
import File, { FileDescription, FileDescriptionColumn, FilePathMetadata, FileUploadOptions } from '../../../../domain_objects/data_warehouse/data/file';
import {PoolClient} from 'pg';
import {Readable} from 'stream';
import BlobStorageProvider from '../../../../services/blob_storage/blob_storage';
// we had to move the event repo into the repo instead of the mapper to avoid a cyclical import problem when dealing
// with listing results to a file
import EventRepository from '../../event_system/event_repository';
import Event from '../../../../domain_objects/event_system/event';
import Logger from '../../../../services/logger';
import { serialize } from 'v8';
import Cache from '../../../../services/cache/cache';
import Config from '../../../../services/config';
import { plainToClass } from 'class-transformer';
const short = require('short-uuid');

/*
    FileRepository contains methods for persisting and retrieving file records
    to storage. Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning.
 */
export default class FileRepository extends Repository implements RepositoryInterface<File> {
    #mapper: FileMapper = FileMapper.Instance;
    #eventRepo: EventRepository = new EventRepository();

    async delete(f: File): Promise<Result<boolean>> {
        if (f.adapter) {
            const blobStorage = BlobStorageProvider(f.adapter);
            blobStorage?.deleteFile(f).then((result) => {
                if (result.isError) {
                    Logger.error(`unable to delete file from storage provider ${result.error?.error}`);
                }
            });
        }

        if (f.id) {
            const detached = await this.#mapper.DetachFileFromNodes(f.id);
            if (detached.isError) {
                return Promise.resolve(Result.Failure(`unable to detach file from nodes`));
            } else {
                return this.#mapper.Delete(f.id);
            }
        }

        return Promise.resolve(Result.Failure(`file must have id`));
    }

    findByID(id: string): Promise<Result<File>> {
        return this.#mapper.RetrieveByID(id);
    }

    findNodeByID(id: string): Promise<Result<File>> {
        return this.#mapper.RetrieveNodeByID(id);
    }

    findByIDAndContainer(id: string, containerID: string): Promise<Result<File>> {
        return this.#mapper.DomainRetrieve(id, containerID);
    }

    async save(f: File, user: User, transaction?: PoolClient): Promise<Result<boolean>> {
        const errors = await f.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`file does not pass validation ${errors.join(',')}`));
        }

        // If the incoming file has an id, find the existing file and update it
        if (f.id) {
            const original = await this.findByID(f.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, f);

            const updated = await this.#mapper.Update(user.id!, original.value);
            if (updated.isError) return Promise.resolve(Result.Pass(updated));

            Object.assign(f, updated.value);

            this.#eventRepo.emit(
                new Event({
                    containerID: f.container_id,
                    dataSourceID: f.data_source_id,
                    eventType: 'file_modified',
                    event: {fileID: f.id},
                }),
            );
        } else {
            // If the incoming file doesn't exist in the database, create a new one
            const results = await this.#mapper.Create(user.id!, f);
            if (results.isError) {
                return Promise.resolve(Result.Pass(results));
            }
            Object.assign(f, results.value);

            this.#eventRepo.emit(
                new Event({
                    containerID: f.container_id,
                    dataSourceID: f.data_source_id,
                    eventType: 'file_created',
                    event: {fileID: f.id},
                }),
            );
        }
        return Promise.resolve(Result.Success(true));
    }

    // return the file instead of a boolean
    async bulkSave(user: User, f: File[]): Promise<Result<File[]>> {
        // separate which files need to be created and and which need to be updated
        const toCreate: File[] = [];
        const toUpdate: File[] = [];
        const toReturn: File[] = [];

        for (const file of f) {
            const errors = await file.validationErrors();
            if (errors) {
                return Promise.resolve(Result.Failure(`some files do not pass validation: ${errors.join(',')}`));
            }

            if (file.id) {
                toUpdate.push(file);
                void this.deleteCachedDesc(file.id);
            } else {
                toCreate.push(file);
            }
        }

        // run the bulk save in a transaction so we don't end up with partial updates
        const transaction = await this.#mapper.startTransaction();
        if (transaction.isError) return Promise.resolve(Result.Failure(`unable to initiate db transaction`));

        if (toUpdate.length > 0) {
            const results = await this.#mapper.BulkUpdate(user.id!, toUpdate, transaction.value);
            if (results.isError) {
                await this.#mapper.rollbackTransaction(transaction.value);
                return Promise.resolve(Result.Pass(results));
            }

            toReturn.push(...results.value);
        }

        if (toCreate.length > 0) {
            const results = await this.#mapper.BulkCreate(user.id!, toCreate, transaction.value);
            if (results.isError) {
                await this.#mapper.rollbackTransaction(transaction.value);
                return Promise.resolve(Result.Pass(results));
            }

            toReturn.push(...results.value);
        }

        const committed = await this.#mapper.completeTransaction(transaction.value);
        if (committed.isError) {
            void this.#mapper.rollbackTransaction(transaction.value);
            return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`));
        }

        // assign the db object back to the initial domain object to capture IDs
        toReturn.forEach((result, i) => {
            Object.assign(f[i], result);
        });

        return Promise.resolve(Result.Success(toReturn));
    }

    // creates a readable stream for downloading a file
    downloadFile(f: File): Promise<Readable | undefined> {
        const blobStorage = BlobStorageProvider(f.adapter);
        if (!blobStorage) return Promise.resolve(undefined);

        return blobStorage.downloadStream(f);
    }

    async listDescriptionColumns(id: string): Promise<Result<FileDescriptionColumn[]>> {
        // check for a cached description
        const cached = await this.getCachedDesc(id);
        if (cached) return Promise.resolve(Result.Success(cached));

        // if no cached version, fetch from DB and cache
        const retrieved = await this.#mapper.ListDescriptionColumns(id);
        if (!retrieved.isError) {
            await this.setDescCashe(id, retrieved.value);
        }

        return Promise.resolve(retrieved);
    }

    async listPathMetadata(...fileIDs: string[]): Promise<Result<FilePathMetadata[]>> {
        const listed = await this.#mapper.ListPathMetadata(...fileIDs);
        if (listed.isError) {return Promise.resolve(Result.Failure(`unable to find file information`))}
        return Promise.resolve(Result.Success(listed.value));
    }

    async setDescriptions(d: FileDescription[]): Promise<Result<boolean>> {
        for (const desc of d) {
            const errors = await desc.validationErrors();
            if (errors) {
                return Promise.resolve(Result.Failure(`one or more file descriptions did not pass validation ${errors.join(',')}`));
            }

            // extract actual id and save back to object
            desc.file_id = desc.file_id?.replace("file_", "");
        }

        return this.#mapper.SetDescriptions(d);
    }

    async checkTimeseries(fileIDs: string[]): Promise<Result<boolean>> {
        const tsResults = await this.#mapper.CheckTimeseries(fileIDs);
        if (tsResults.isError) {return Promise.resolve(Result.Pass(tsResults))}

        // if there are no results, none of the files exist- return an error
        if(tsResults.value.length === 0) {
            return Promise.resolve(Result.Failure(`no valid file IDs supplied: ${fileIDs}`));
        }

        // check each result and if any are not ts, return with a failure
        const nonTS = tsResults.value.filter(r => !r.timeseries).map(f => f.id!);

        if (nonTS.length !== 0) {
            return Promise.resolve(Result.Failure(`one or more files are not timeseries: [${nonTS.join(', ')}]`));
        }

        return Promise.resolve(Result.Success(true));
    }

    /*
        uploadFile should be used when uploading an actual file, not for manipulating
        a file record in storage. This should hopefully be obvious as the function
        signature requires a Readable stream
     */
    async uploadFile(containerID: string, user: User, filename: string, stream: Readable, dataSourceID?: string, options?: FileUploadOptions): Promise<Result<File>> {
        const provider = BlobStorageProvider();

        if (!provider) return Promise.resolve(Result.Failure('no storage provider set'));

        // run the actual file upload the storage provider
        const result = await provider.uploadPipe(`containers/${containerID}/datasources/${dataSourceID ? dataSourceID : '0'}/`, filename, stream, undefined, undefined, {timeseries: options?.timeseries});
        if (result.isError) return Promise.resolve(Result.Pass(result));

        const file = new File({
            file_name: filename,
            file_size: result.value.size,
            md5hash: result.value.md5hash,
            adapter_file_path: result.value.filepath,
            adapter: provider.name(),
            metadata: result.value.metadata,
            container_id: containerID,
            data_source_id: dataSourceID,
            short_uuid: result.value.short_uuid,
            timeseries: options && options.timeseries
        });

        const saved = await this.save(file, user);
        if (saved.isError) return Promise.resolve(Result.Pass(saved));

        return Promise.resolve(Result.Success(file));
    }

    async updateFile(fileID: string, containerID: string, user: User, filename: string, stream: Readable, dataSourceID?: string): Promise<Result<File>> {
        const provider = BlobStorageProvider();

        if (!provider) return Promise.resolve(Result.Failure('no storage provider set'));

        // run the actual file upload the storage provider
        const result = await provider.uploadPipe(`containers/${containerID}/datasources/${dataSourceID ? dataSourceID : '0'}/`, filename, stream);
        if (result.isError) return Promise.resolve(Result.Pass(result));

        const file = new File({
            id: fileID,
            file_name: filename,
            file_size: result.value.size,
            md5hash: result.value.md5hash,
            adapter_file_path: result.value.filepath,
            adapter: provider.name(),
            metadata: result.value.metadata,
            container_id: containerID,
            data_source_id: dataSourceID,
            short_uuid: result.value.short_uuid,
        });

        const saved = await this.save(file, user);
        if (saved.isError) return Promise.resolve(Result.Pass(saved));

        // clear any cached details on file description if file was updated
        const cacheDeleted = await this.deleteCachedDesc(fileID);
        if (!cacheDeleted) Logger.error(`unable to clear cache for file ${fileID}`);

        return Promise.resolve(Result.Success(file));
    }

    constructor() {
        super(FileMapper.tableName);
    }

    id(operator: string, value: any) {
        super.query('id', operator, value);
        return this;
    }

    containerID(operator: string, value: any) {
        super.query('container_id', operator, value);
        return this;
    }

    dataSourceID(operator: string, value: any) {
        super.query('data_source_id', operator, value);
        return this;
    }

    adapter(operator: string, value: any) {
        super.query('adapter', operator, value);
        return this;
    }

    file_name(operator: string, value: any) {
        super.query('file_name', operator, value);
        return this;
    }

    count(): Promise<Result<number>> {
        return super.count();
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<File[]>> {
        return super.findAll<File>(options, {transaction, resultClass: File});
    }

    listFiles(containerID: string): Promise<Result<File[]>> {
        return this.#mapper.ListForContainer(containerID);
    }

    // caching for file descriptions
    private async setDescCashe(id: string, desc: FileDescriptionColumn[]): Promise<boolean> {
        const set = await Cache.set(
            `${FileMapper.tableName}:fileID:${id}:description`,
            serialize(desc),
            Config.cache_default_ttl
        )

        return Promise.resolve(set);
    }

    private async getCachedDesc(id: string): Promise<FileDescriptionColumn[] | undefined> {
        const cached = await Cache.get<object[]>(`${FileMapper.tableName}:fileID:${id}:description`);
        if (cached) {
            const description = plainToClass(FileDescriptionColumn, cached);
            return Promise.resolve(description);
        }

        return Promise.resolve(undefined);
    }

    private async deleteCachedDesc(id: string): Promise<boolean> {
        const deleted = await Cache.del(`${FileMapper.tableName}:fileID:${id}:description`);
        if (!deleted) Logger.error(`unable to remove file description ${id} from cache`);

        return Promise.resolve(deleted);
    }
}
