import Result from '../../common_classes/result';
import { Readable } from 'stream';
import Config from '../config';
import AzureBlobImpl from './azure_blob_impl';
import Filesystem from './filesystem_impl';
import LargeObjectImpl from './pg_large_file_impl';
import File from '../../domain_objects/data_warehouse/data/file';
import MinioBlobImpl from './minio_impl';

/*
    BlobStorage is an interface that DeepLynx uses to accept and store user uploads.
    Implementations should be able to handle any file type.
 */
export interface BlobStorage {
    uploadPipe(
        filepath: string,
        filename: string,
        stream: Readable | null,
        contentType?: string,
        encoding?: string,
        options?: BlobUploadOptions,
    ): Promise<Result<BlobUploadResponse>>;

    // for cloud blob providers that support partial file uploads
    // chunk id should come in as a query param from the user/caller
    uploadPart(
        filepath: string,
        filename: string,
        fileUUID: string,
        part_id: string,
        part: Readable | null,
    ): Promise<Result<string>>;
    commitParts(
        filepath: string,
        filename: string,
        fileUUID: string,
        parts: string[],
        options?: BlobUploadOptions
    ): Promise<Result<BlobUploadResponse>>;

    appendPipe(file: File, stream: Readable | null): Promise<Result<boolean>>;
    deleteFile(file: File): Promise<Result<boolean>>;
    renameFile?(file: File): Promise<Result<boolean>>;
    downloadStream(file: File): Promise<Readable | undefined>;
    name(): string;
}

// a specific response type for convenience
export type BlobUploadResponse = {
    filename: string;
    filepath: string;
    size: number; // size in KB
    md5hash: string; // hex encoded md5 hash
    metadata: {[key: string]: any}; // adapter specific metadata if needed
    adapter_name: string;
    short_uuid?: string;
};

// Returns an instantiated FileStorage provider if provider method is set, or user
// can provide a specific adapter name to fetch an instance of specified adapter
export default function BlobStorageProvider(adapterName?: string): BlobStorage | null {
    switch (adapterName ? adapterName : Config.file_storage_method) {
        case 'azure_blob': {
            return new AzureBlobImpl(Config.azure_blob_connection_string, Config.azure_blob_container_name);
        }

        case 'filesystem': {
            return new Filesystem(Config.filesystem_storage_directory, Config.is_windows);
        }

        // NOTE: largeobject is kept here only for backwards compatibility
        // with existing files that may be stored using largeobject. Going
        // forward it should be considered deprecated and should not be used.
        case 'largeobject': {
            return new LargeObjectImpl();
        }

        case 'minio': {
            return new MinioBlobImpl({
                endPoint: Config.minio_endpoint,
                port: Config.minio_port,
                useSSL: Config.minio_ssl,
                accessKey: Config.minio_access_key,
                secretKey: Config.minio_secret_key,
            });
        }
    }

    return null;
}

export type BlobUploadOptions = {
    canAppend?: boolean;
    timeseries?: boolean;
};
