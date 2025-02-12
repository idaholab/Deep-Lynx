import {BlobStorage, BlobUploadOptions, BlobUploadResponse} from './blob_storage';
import Result from '../../common_classes/result';
import {Readable} from 'stream';
import {BlobServiceClient, ContainerClient, RestError} from '@azure/storage-blob';
import Logger from './../logger';
import File from '../../domain_objects/data_warehouse/data/file';
import {buffer} from 'stream/consumers';
const short = require('short-uuid');
const digestStream = require('digest-stream');

/*
    AzureBlobImpl allows DeepLynx to store and retrieve any kind of file using
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
            if (f.timeseries === true) {
                blobClient = this._ContainerClient.getBlockBlobClient(`${f.adapter_file_path}${f.short_uuid}${f.file_name}`);
            } else {
                blobClient = this._ContainerClient.getBlockBlobClient(`${f.adapter_file_path}${f.file_name}${f.short_uuid}`);
            }
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

    async uploadPipe(
        filepath: string,
        filename: string,
        stream: Readable | null,
        contentType: string,
        encoding: string,
        options?: BlobUploadOptions,
    ): Promise<Result<BlobUploadResponse>> {
        const shortUUID = short.generate();

        // if they're uploading a file they want to append to, we'll need to create it as an append blob as block blobs
        // are immutable
        if (stream && options?.canAppend) {
            let appendBlobClient;
            if (options?.timeseries === true) {
                appendBlobClient = this._ContainerClient.getAppendBlobClient(`${filepath}${shortUUID}${filename}`);
            } else {
                appendBlobClient = this._ContainerClient.getAppendBlobClient(`${filepath}${filename}${shortUUID}`);
            }
            const result = await appendBlobClient.createIfNotExists();

            if (result._response.status > 299 || result._response.status < 200) {
                Logger.error(`error uploading file to azure blob storage ${result.errorCode}`);
                return Promise.resolve(Result.Failure(`azure service responded with a status ${result._response.status} on upload`));
            }

            if (stream) {
                const buf = await buffer(stream);

                try {
                    await appendBlobClient.appendBlock(buf, buf.length);
                } catch (e: any) {
                    return Promise.resolve(Result.Error(e));
                }

                return Promise.resolve(
                    Result.Success({
                        filepath,
                        filename,
                        size: buf.length,
                        md5hash: '',
                        metadata: {
                            contentType,
                            encoding,
                            canAppend: options?.canAppend,
                        },
                        adapter_name: this.name(),
                        short_uuid: shortUUID,
                    }),
                );
            }
        }

        let blobClient;
        if (options?.timeseries === true) {
            blobClient = this._ContainerClient.getBlockBlobClient(`${filepath}${shortUUID}${filename}`);
        } else {
            blobClient = this._ContainerClient.getBlockBlobClient(`${filepath}${filename}${shortUUID}`);
        }

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
                    metadata: {
                        contentType,
                        encoding,
                        canAppend: options?.canAppend,
                    },
                    adapter_name: this.name(),
                    short_uuid: shortUUID,
                }),
            );
        }

        return Promise.resolve(Result.Failure('must provide a valid Readable stream'));
    }

    async appendPipe(file: File, stream: Readable | null): Promise<Result<boolean>> {
        let appendBlobClient;
        if (file.timeseries === true) {
            appendBlobClient = this._ContainerClient.getAppendBlobClient(`${file.adapter_file_path}${file.short_uuid}${file.file_name}`);
        } else {
            appendBlobClient = this._ContainerClient.getAppendBlobClient(`${file.adapter_file_path}${file.file_name}${file.short_uuid}`);
        }
        const result = await appendBlobClient.createIfNotExists();

        if (result._response.status > 299 || result._response.status < 200) {
            Logger.error(`error uploading file to azure blob storage ${result.errorCode}`);
            return Promise.resolve(Result.Failure(`azure service responded with a status ${result._response.status} on upload`));
        }

        if (stream && file.metadata.canAppend) {
            const buf = await buffer(stream);

            try {
                await appendBlobClient.appendBlock(buf, buf.length);
            } catch (e: any) {
                return Promise.resolve(Result.Error(e));
            }

            return Promise.resolve(Result.Success(true));
        }

        return Promise.resolve(Result.Failure('must provide a valid Readable stream or appendable blob'));
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
            if (f.timeseries === true) {
                blobClient = this._ContainerClient.getBlockBlobClient(`${f.adapter_file_path}${f.short_uuid}${f.file_name}`);
            } else {
                blobClient = this._ContainerClient.getBlockBlobClient(`${f.adapter_file_path}${f.file_name}${f.short_uuid}`);
            }
        } else {
            blobClient = this._ContainerClient.getBlockBlobClient(`${f.adapter_file_path}${f.file_name}`);
        }
        const download = await blobClient.download(0);

        return Promise.resolve(download.readableStreamBody as Readable);
    }

    async renameFile(f: File): Promise<Result<boolean>> {
        // only perform the rename if uuid is present; otherwise, file should already be accessible
        if (!f.short_uuid) {
            return Promise.resolve(Result.Success(true));
        } else {
            const newFileClient = this._ContainerClient.getBlockBlobClient(`${f.adapter_file_path}${f.short_uuid}${f.file_name}`);
            const oldFileClient = this._ContainerClient.getBlockBlobClient(`${f.adapter_file_path}${f.file_name}${f.short_uuid}`);

            try {
                const copyPoller = await newFileClient.beginCopyFromURL(oldFileClient.url);
                const copy_res = await copyPoller.pollUntilDone();

                if (copy_res._response.status === 201 || copy_res._response.status === 202) {
                    const delete_res = await oldFileClient.delete();

                    if (delete_res._response.status === 201 || delete_res._response.status === 202) {
                        return Promise.resolve(Result.Success(true));
                    }
                }
            } catch (e) {
                Logger.error(`azure rename blob error: ${e}`);
                return Promise.resolve(Result.Success(false));
            }

            return Promise.resolve(Result.Success(false));
        }
    }
}
