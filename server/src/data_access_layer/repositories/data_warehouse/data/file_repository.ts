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
        return this.#mapper.ListDescriptionColumns(id);
    }

    async listPathMetadata(...fileIDs: string[]): Promise<Result<FilePathMetadata[]>> {
        const listed = await this.#mapper.ListPathMetadata(...fileIDs);
        if (listed.isError) {return Promise.resolve(Result.Failure(`unable to find file information`))}
        return Promise.resolve(Result.Success(listed.value));
    }

    async setDescriptions(descriptions: FileDescription[]): Promise<Result<boolean>> {
        return this.#mapper.SetDescriptions(descriptions);
    }

    async checkTimeseries(fileIDs: string[]): Promise<Result<boolean>> {
        const tsResults = await this.#mapper.CheckTimeseries(fileIDs);
        if (tsResults.isError) {return Promise.resolve(Result.Pass(tsResults))}

        // verify that the resultant IDs match the supplied file IDs- otherwise some files do not exist
        const missingIDs = fileIDs.filter(id => !tsResults.value.map(result => result.id).includes(id));
        if(missingIDs.length > 0) {
            return Promise.resolve(Result.Failure(`one or more files not found: [${missingIDs.join(', ')}]`));
        }

        // check each result and if any are not ts, return with a failure
        const nonTimeseries = tsResults.value.filter(r => !r.timeseries).map(f => f.id!);
        if (nonTimeseries.length > 0) {
            return Promise.resolve(Result.Failure(`one or more files are not timeseries: [${nonTimeseries.join(', ')}]`));
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

    createMultipartUpload(): Promise<Result<string>> {
        return Promise.resolve(Result.Success(short.generate()));
    }

    // upload the data to the path in the blob storage provider
    async uploadFilePart(
        container_id: string,
        data_source_id: string,
        fileUUID: string,
        part_id: string,
        part: Buffer
    ): Promise<Result<string>> {
        const provider = BlobStorageProvider();

        if (!provider) return Promise.resolve(Result.Failure('no storage provider set'));

        const result = await provider.uploadPart(`containers/${container_id}/datasources/${data_source_id}/`, fileUUID, part_id, part);
        if (result.isError) return Promise.resolve(Result.Pass(result));

        return Promise.resolve(Result.Success(part_id));
    }

    // commit parts and create the file as it will appear in deeplynx
    async commitFileParts(container_id: string, data_source_id: string, filename: string, fileUUID: string, parts: string[], user: User) {
        const provider = BlobStorageProvider();

        if (!provider) return Promise.resolve(Result.Failure('no storage provider set'));

        // todo: put the filename back!
        const result = await provider.commitParts(
            `containers/${container_id}/datasources/${data_source_id}/`,
            filename,
            fileUUID,
            parts);
        if (result.isError) return Promise.resolve(Result.Pass(result));

        const ext = filename.split('.').pop()?.toLowerCase();

        const file = new File({
            file_name: filename,
            file_size: result.value.size,
            md5hash: result.value.md5hash,
            adapter_file_path: result.value.filepath,
            adapter: provider.name(),
            metadata: result.value.metadata,
            container_id,
            data_source_id,
            short_uuid: fileUUID,
            timeseries: (ext === 'csv' || ext === 'json') ? true : false
        });

        const saved = await this.save(file, user);
        if (saved.isError) return Promise.resolve(Result.Pass(saved));

        return Promise.resolve(Result.Success(file));
    }

    async updateMetadata(fileID: string, containerID: string, user: User, metadata: {[key: string]: any}, dataSourceID?: string) {
        // todo: pass in or figure out the missing fields from Ingest

        // todo: save metadata in a db transaction -> use updateStatement
        // gah I did this before and lost it
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

        return Promise.resolve(Result.Success(file));
    }

    async renameFile(file: File, user: User): Promise<Result<boolean>> {
        const newFile = new File({
            id: file.id,
            file_name: file.file_name!,
            file_size: file.file_size!,
            md5hash: file.md5hash,
            adapter_file_path: file.adapter_file_path!,
            adapter: file.adapter!,
            metadata: file.metadata,
            container_id: file.container_id!,
            data_source_id: file.data_source_id,
            short_uuid: file.short_uuid!,
            timeseries: true,
        });

        const provider = BlobStorageProvider(file.adapter)!;
        const blob_res = await provider.renameFile?.(newFile);
        if (blob_res?.isError) {
            return Promise.resolve(Result.Pass(blob_res));
        }

        const db_res = await this.#mapper.Update(user.id!, newFile);
        if (db_res.isError) {
            return Promise.resolve(Result.Pass(db_res));
        }

        return Promise.resolve(Result.Success(true));
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
}
