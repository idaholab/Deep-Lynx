import {BlobStorage, BlobUploadResponse} from './blob_storage';
import Result from '../../common_classes/result';
import {Readable} from 'stream';
import {BlobServiceClient, ContainerClient, RestError} from '@azure/storage-blob';
import Logger from './../logger';
import File from '../../domain_objects/data_warehouse/data/file';
const short = require('short-uuid');
const digestStream = require('digest-stream');

/*
    AzureBlobImpl allows Deep Lynx to store and retrieve any kind of file using
    Microsoft Azure's Blob storage.
 */
export default class AzureBlobImpl implements BlobStorage {
    private _BlobServiceClient: BlobServiceClient;
    private _ContainerClient: ContainerClient;

    name(): string {
        return 'azure_blob';
    }

    async deleteFile(f: File): Promise<Result<boolean>> {
        let blobClient;
        if (f.short_uuid) {
            blobClient = this._ContainerClient.getBlockBlobClient(`${f.adapter_file_path}${f.file_name}${f.short_uuid}`);
        } else {
            blobClient = this._ContainerClient.getBlockBlobClient(`${f.adapter_file_path}${f.file_name}`);
        }

        const response = await blobClient.delete();
        if (response.errorCode) {
            Logger.error(`error deleting file in azure blob storage ${response.errorCode}`);
            return Promise.resolve(Result.Failure(response.errorCode));
        }

        return Promise.resolve(Result.Success(true));
    }

    async uploadPipe(filepath: string, filename: string, stream: Readable | null, contentType: string, encoding: string): Promise<Result<BlobUploadResponse>> {
        const shortUUID = short.generate();
        const blobClient = this._ContainerClient.getBlockBlobClient(`${filepath}${filename}${shortUUID}`);

        if (stream) {
            let md5hash = '';
            let dataLength = 0;

            // pipe through this man in the middle to gain the md5 hash and file size
            const dstream = digestStream('md5', 'hex', (resultDigest: string, length: number) => {
                md5hash = resultDigest;
                dataLength = length;
            });

            const newStream = stream.pipe(dstream); // md5hash and length calculated as it passes through

            // buffer size and max concurrency are set to their default values
            // we only have to set them manually because we need access to the
            // final parameter which are the upload options.
            const uploadResult = await blobClient.uploadStream(newStream, 8000, 5, {
                blobHTTPHeaders: {
                    blobContentType: contentType,
                    blobContentEncoding: encoding,
                },
            });

            if (uploadResult._response.status !== 201) {
                Logger.error(`error uploading file to azure blob storage ${uploadResult.errorCode}`);
                return Promise.resolve(Result.Failure(`azure service responded with a status ${uploadResult._response.status} on upload`));
            }

            return Promise.resolve(
                Result.Success({
                    filepath,
                    filename,
                    size: dataLength / 1000,
                    md5hash,
                    metadata: {},
                    adapter_name: this.name(),
                    short_uuid: shortUUID,
                }),
            );
        }

        return Promise.resolve(Result.Failure('must provide a valid Readable stream'));
    }

    constructor(connectionString: string, containerName: string) {
        this._BlobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

        // check to see if the container has been created already
        this._ContainerClient = this._BlobServiceClient.getContainerClient(containerName);

        this._BlobServiceClient.listContainers();

        this._ContainerClient
            .create()
            .then((response) => Logger.info('azure container successfully created'))
            .catch((e: RestError) => {
                // ignore conflict rest errors as those indicate the container
                // was created previously. We don't need to note that
                if (e.statusCode !== 409) {
                    Logger.error(`unable to create new azure container - ${e}`);
                }
            });
    }

    async downloadStream(f: File): Promise<Readable | undefined> {
        let blobClient;
        if (f.short_uuid) {
            blobClient = this._ContainerClient.getBlockBlobClient(`${f.adapter_file_path}${f.file_name}${f.short_uuid}`);
        } else {
            blobClient = this._ContainerClient.getBlockBlobClient(`${f.adapter_file_path}${f.file_name}`);
        }
        const download = await blobClient.download(0);

        return Promise.resolve(download.readableStreamBody as Readable);
    }
}
