import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import FileMapper from '../../../mappers/data_warehouse/data/file_mapper';
import {User} from '../../../../domain_objects/access_management/user';
import Result from '../../../../common_classes/result';
import File from '../../../../domain_objects/data_warehouse/data/file';
import {PoolClient} from 'pg';
import {Readable} from 'stream';
import BlobStorageProvider from '../../../../services/blob_storage/blob_storage';
// we had to move the event repo into the repo instead of the mapper to avoid a cyclical import problem when dealing
// with listing results to a file
import EventRepository from "../../event_system/event_repository";
import Event from "../../../../domain_objects/event_system/event";
import Logger from "../../../../services/logger";

/*
    FileRepository contains methods for persisting and retrieving file records
    to storage. Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning.
 */
export default class FileRepository extends Repository implements RepositoryInterface<File> {
    #mapper: FileMapper = FileMapper.Instance;
    #eventRepo: EventRepository = new EventRepository();

    delete(f: File): Promise<Result<boolean>> {
        if (f.adapter) {
            const blobStorage = BlobStorageProvider(f.adapter);
            blobStorage?.deleteFile(f).then((result) => {
                if (result.isError) {
                    Logger.error(`unable to delete file from storage provider ${result.error?.error}`);
                }
            })
        }
        
        if (f.id) {
            return this.#mapper.Delete(f.id);
        }

        return Promise.resolve(Result.Failure(`file must have id`));
    }

    findByID(id: string): Promise<Result<File>> {
        return this.#mapper.Retrieve(id);
    }

    findByIDAndContainer(id: string, containerID: string): Promise<Result<File>> {
        return this.#mapper.DomainRetrieve(id, containerID);
    }

    async save(f: File, user: User, transaction?: PoolClient): Promise<Result<boolean>> {
        const errors = await f.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`file does not pass validation ${errors.join(',')}`));
        }

        if (f.id) {
            // to allow partial updates we must first fetch the original object
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
            const created = await this.#mapper.Create(user.id!, f);
            if (created.isError) return Promise.resolve(Result.Pass(created));

            Object.assign(f, created.value);

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

    // creates a readable stream for downloading a file
    downloadFile(f: File): Promise<Readable | undefined> {
        const blobStorage = BlobStorageProvider(f.adapter);
        if (!blobStorage) return Promise.resolve(undefined);

        return blobStorage.downloadStream(f);
    }

    /*
        uploadFile should be used when uploading an actual file, not for manipulating
        a file record in storage. This should hopefully be obvious as the function
        signature requires a Readable stream
     */
    async uploadFile(
        containerID: string,
        dataSourceID: string,
        user: User,
        filename: string,
        encoding: string,
        mimetype: string,
        stream: Readable,
    ): Promise<Result<File>> {
        const provider = BlobStorageProvider();

        if (!provider) return Promise.resolve(Result.Failure('no storage provider set'));

        // run the actual file upload the storage provider
        const result = await provider.uploadPipe(`containers/${containerID}/datasources/${dataSourceID}/`, filename, stream);
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
        });

        const saved = await this.save(file, user);
        if (saved.isError) return Promise.resolve(Result.Pass(saved));

        return Promise.resolve(Result.Success(file));
    }

    async updateFile(
        fileID: string,
        containerID: string,
        dataSourceID: string,
        user: User,
        filename: string,
        encoding: string,
        mimetype: string,
        stream: Readable,
    ): Promise<Result<File>> {
        const provider = BlobStorageProvider();

        if (!provider) return Promise.resolve(Result.Failure('no storage provider set'));

        // run the actual file upload the storage provider
        const result = await provider.uploadPipe(`containers/${containerID}/datasources/${dataSourceID}/`, filename, stream);
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

    short_uuid(operator: string, value: any) {
        super.query('short_uuid', operator, value);
        return this;
    }

    count(): Promise<Result<number>> {
        return super.count();
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<File[]>> {
        return super.findAll<File>(options, {transaction, resultClass: File});
    }
}
