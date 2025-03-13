import { BlobStorage, BlobUploadOptions, BlobUploadResponse } from './blob_storage';
import Result from '../../common_classes/result';
import { Readable, PassThrough } from 'stream';
import { BlobServiceClient, ContainerClient, RestError } from '@azure/storage-blob';
import Logger from './../logger';
import File from '../../domain_objects/data_warehouse/data/file';
import { buffer } from 'stream/consumers';
import short from 'short-uuid';
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

    // put_block at the blob, return block id
    // https://learn.microsoft.com/en-us/javascript/api/%40azure/storage-blob/blockblobclient?view=azure-node-latest#@azure-storage-blob-blockblobclient-stageblock
    async uploadPart(
        filepath: string,
        fileUUID: string,
        part_id: string,
        part: Readable | null,
    ): Promise<Result<string>> {
        const blob_client = this._ContainerClient.getBlockBlobClient(`${filepath}${fileUUID}_${part_id}`);

        Logger.debug("staging block...");

        const part_passthrough = new PassThrough();
        let totalLen = 0;
        const chunks: Buffer[] = [];

        Logger.debug("PassThrough begin");
        part_passthrough.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
            totalLen += chunk.length;
        });

        Logger.debug("pipe the part");
        // Logger.debug(`part: ${part}`); // it's not null
        // this line breaks? no waiting, just a 500 error gets returned before I can do anything.
        // info: PUT /containers/4/import/datasources/4/files?... 500
        // error: <Azurite Container Error> changes depending on azurite status.
        part?.pipe(part_passthrough);

        Logger.debug("await the promise (of better days)");
        await new Promise((resolve, reject) => {
            Logger.debug("in the promise we find peace");
            part_passthrough.on("end", resolve);
            part_passthrough.on("error", reject);
        });

        Logger.debug("PassThrough end!");
        Logger.debug(`totalLen: ${totalLen}`);

        const buffer = Buffer.concat(chunks);

        Logger.debug("Attempting upload...");
        const result = await blob_client.stageBlock(part_id, buffer, totalLen);

        if (result.errorCode) {
            return Promise.resolve(
                Result.Failure(`${result.errorCode} on part_id: ${part_id}`)
            );
        }

        return Promise.resolve(Result.Success(part_id));
    }

    // put_block_list to commit block list to blob
    // https://learn.microsoft.com/en-us/javascript/api/%40azure/storage-blob/blockblobclient?view=azure-node-latest#@azure-storage-blob-blockblobclient-commitblocklist
    async commitParts(
        filepath: string,
        filename: string,
        fileUUID: string,
        parts: string[],
        options?: BlobUploadOptions
    ): Promise<Result<BlobUploadResponse>> {
        const blob_client = this._ContainerClient.getBlockBlobClient(`${filepath}${fileUUID}${filename}`);

        const result = await blob_client.commitBlockList(parts);

        if (result.errorCode) {
            return Promise.resolve(Result.Failure(`Failed to commit uploaded parts for ${filepath}${filename} to it's blob in Azure`));
        }

        return Promise.resolve(
            Result.Success({
                filepath,
                filename,
                size: 0,
                md5hash: '',
                metadata: {
                    contentType: null,
                    encoding: null,
                    canAppend: options?.canAppend,
                },
                adapter_name: this.name(),
                short_uuid: fileUUID,
            }),
        );
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
