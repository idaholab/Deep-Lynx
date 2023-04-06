import {BlobStorage, BlobUploadResponse} from './blob_storage';
import Result from '../../common_classes/result';
import {Readable} from 'stream';
import {BlobServiceClient, ContainerClient, RestError} from '@azure/storage-blob';
import Logger from './../logger';
import File from '../../domain_objects/data_warehouse/data/file';
import {Client} from 'minio';
const Minio = require('minio');
const short = require('short-uuid');
const digestStream = require('digest-stream');
import Config from '../config';

/*
    AzureBlobImpl allows Deep Lynx to store and retrieve any kind of file using
    Microsoft Azure's Blob storage.
 */
export default class MinioBlobImpl implements BlobStorage {
    private _client: Client;

    name(): string {
        return 'minio';
    }

    constructor(options: {endPoint: string; useSSL: boolean; port: number; accessKey: string; secretKey: string}) {
        this._client = new Client({
            endPoint: options.endPoint,
            port: options.port,
            useSSL: options.useSSL,
            accessKey: options.accessKey,
            secretKey: options.secretKey,
        });

        this._client.bucketExists(Config.minio_bucket_name, (err, exists) => {
            if (err) {
                Logger.error(`unable to check if bucket exists in minio ${err}`);
                return;
            }

            if (!exists) {
                this._client.makeBucket(Config.minio_bucket_name).catch((e) => Logger.error(`error attempting to make bucket in minio ${e}`));
            }
        });
    }

    async deleteFile(f: File): Promise<Result<boolean>> {
        if (f.short_uuid) {
            try {
                await this._client.removeObject(Config.minio_bucket_name, `${f.adapter_file_path}${f.file_name}${f.short_uuid}`);
            } catch (e: any) {
                return Promise.resolve(Result.Error(e));
            }
        } else {
            try {
                await this._client.removeObject(Config.minio_bucket_name, `${f.adapter_file_path}${f.file_name}`);
            } catch (e: any) {
                return Promise.resolve(Result.Error(e));
            }
        }

        return Promise.resolve(Result.Success(true));
    }

    async uploadPipe(filepath: string, filename: string, stream: Readable | null, contentType: string, encoding: string): Promise<Result<BlobUploadResponse>> {
        const shortUUID = short.generate();
        const name = `${filepath}${filename}${shortUUID}`;

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
            try {
                await this._client.putObject(Config.minio_bucket_name, name, stream);

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
            } catch (e: any) {
                return Promise.resolve(Result.Error(e));
            }
        }

        return Promise.resolve(Result.Failure('must provide a valid Readable stream'));
    }

    async downloadStream(f: File): Promise<Readable | undefined> {
        if (f.short_uuid) {
            try {
                return this._client.getObject(Config.minio_bucket_name, `${f.adapter_file_path}${f.file_name}${f.short_uuid}`);
            } catch (e: any) {
                return Promise.reject(e);
            }
        } else {
            try {
                return this._client.getObject(Config.minio_bucket_name, `${f.adapter_file_path}${f.file_name}`);
            } catch (e: any) {
                return Promise.reject(e);
            }
        }
    }
}
