import Result from '../../common_classes/result';
import {Readable} from 'stream';
import Config from '../config';
import AzureBlobImpl from './azure_blob_impl';
import Filesystem from './filesystem_impl';
import LargeObject from './pg_large_file_impl';

/*
    BlobStorage is an interface that Deep Lynx uses to accept and store user uploads.
    Implementations should be able to handle any file type.
 */
export interface BlobStorage {
    uploadPipe(filepath: string, filename: string, stream: Readable | null, contentType?: string, encoding?: string): Promise<Result<BlobUploadResponse>>;
    deleteFile(filepath: string): Promise<Result<boolean>>;
    downloadStream(filepath: string): Promise<Readable | undefined>;
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

        case 'largeobject': {
            return new LargeObject();
        }
    }

    return null;
}
