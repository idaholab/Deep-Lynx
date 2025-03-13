import { BlobStorage, BlobUploadOptions, BlobUploadResponse } from './blob_storage';
import Result from '../../common_classes/result';
import { Readable } from 'stream';
import * as fs from 'fs';
import Logger from './../logger';
import File from '../../domain_objects/data_warehouse/data/file';
const short = require('short-uuid');
const digestStream = require('digest-stream');

/*
    Filesystem is a very simple implementation of BlobStorage and allows DeepLynx
    to store and retrieve files on the host system. Note: using this in a sharded
    environment could have unintended consequences
 */
export default class Filesystem implements BlobStorage {
    private _directory: string;
    private _isWindows: boolean | undefined;

    async deleteFile(f: File): Promise<Result<boolean>> {
        let filePath;
        if (f.short_uuid) {
            if (f.timeseries === true) {
                filePath = `${f.adapter_file_path}${f.short_uuid}${f.file_name}`;
            } else {
                filePath = `${f.adapter_file_path}${f.file_name}${f.short_uuid}`;
            }
        } else {
            filePath = `${f.adapter_file_path}${f.file_name}`;
        }
        if (this._isWindows) filePath = filePath.replace(new RegExp('/', 'g'), `\\`);

        fs.unlinkSync(filePath);

        if (fs.existsSync(filePath)) {
            return Promise.resolve(Result.Failure('unable to delete file'));
        }

        return Promise.resolve(Result.Success(true));
    }

    name(): string {
        return 'filesystem';
    }

    async uploadPipe(
        filepath: string,
        filename: string,
        stream: Readable | null,
        contentType?: string,
        encoding?: string,
        options?: BlobUploadOptions,
    ): Promise<Result<BlobUploadResponse>> {
        if (!this._directory) {
            if (stream) {
                // unpipe and end the stream so that busboy finish event will be emitted
                stream.unpipe();
                stream.emit('end');
            }
            return Promise.resolve(Result.Failure('directory does not exist or was unable to be opened'));
        }

        const shortUUID = short.generate();

        // Windows directories use backslashes instead of forward slashes in unix like systems
        if (this._isWindows) filepath = filepath.replace(new RegExp('/', 'g'), `\\`);

        if (!fs.existsSync(`${this._directory}${filepath}`)) {
            fs.mkdirSync(`${this._directory}${filepath}`, { recursive: true });
        }

        let filePath;
        if (options?.timeseries === true) {
            filePath = `${this._directory}${filepath}${shortUUID}${filename}`;
        } else {
            filePath = `${this._directory}${filepath}${filename}${shortUUID}`;
        }

        const writeStream = fs.createWriteStream(filePath, { flags: 'w' });

        stream?.on('error', (err: Error) => {
            Logger.error(`error saving file to filesystem ${err}`);
        });

        let md5hash = '';
        let dataLength = 0;

        // pipe through this man in the middle to gain the md5 hash and file size
        const dstream = digestStream('md5', 'hex', (resultDigest: string, length: number) => {
            md5hash = resultDigest;
            dataLength = length;
        });

        await stream?.pipe(dstream).pipe(writeStream);

        return Promise.resolve(
            Result.Success({
                filename,
                filepath: `${this._directory}${filepath}`,
                size: dataLength / 1000,
                md5hash,
                metadata: {},
                adapter_name: this.name(),
                short_uuid: shortUUID,
            } as BlobUploadResponse),
        );
    }

    async appendPipe(file: File, stream: Readable | null): Promise<Result<boolean>> {
        if (!this._directory) {
            if (stream) {
                // unpipe and end the stream so that busboy finish event will be emitted
                stream.unpipe();
                stream.emit('end');
            }
            return Promise.resolve(Result.Failure('directory does not exist or was unable to be opened'));
        }

        const shortUUID = short.generate();

        // Windows directories use backslashes instead of forward slashes in unix like systems

        if (!fs.existsSync(file.adapter_file_path!)) {
            fs.mkdirSync(file.adapter_file_path!, { recursive: true });
        }

        let filePath;
        if (file.timeseries === true) {
            filePath = `${file.adapter_file_path}${file.short_uuid}${file.file_name}`;
        } else {
            filePath = `${file.adapter_file_path}${file.file_name}${file.short_uuid}`;
        }

        const writeStream = fs.createWriteStream(filePath, { flags: 'a' });

        stream?.on('error', (err: Error) => {
            Logger.error(`error saving file to filesystem ${err}`);
        });

        stream?.pipe(writeStream);

        return Promise.resolve(Result.Success(true));
    }

    downloadStream(f: File): Promise<Readable | undefined> {
        let filePath;
        if (f.short_uuid) {
            if (f.timeseries === true) {
                filePath = `${f.adapter_file_path}${f.short_uuid}${f.file_name}`;
            } else {
                filePath = `${f.adapter_file_path}${f.file_name}${f.short_uuid}`;
            }
        } else {
            filePath = `${f.adapter_file_path}${f.file_name}`;
        }
        return Promise.resolve(fs.createReadStream(filePath));
    }

    // the isWindows could be solved by looking at process.platform instead, but I'd rather limit the access
    // to environment variables and environment to the config file, meaning the user is in charge of telling
    // this class whether or not its operating in a windows environment
    constructor(directory: string, isWindows?: boolean) {
        if (!fs.existsSync(directory)) {
            try {
                fs.mkdirSync(directory, { recursive: true });
            } catch (err) {
                Logger.error(`error creating directory ${err}`);
            }
        }

        this._directory = directory;
        this._isWindows = isWindows;
    }

    renameFile(f: File): Promise<Result<boolean>> {
        // only rename file if short uuid is present; otherwise, file should already be accessible
        if (!f.short_uuid) {
            return Promise.resolve(Result.Success(true));
        } else {
            try {
                /* eslint-disable-next-line security/detect-non-literal-fs-filename --
                * TypeScript wants to guard against malicious file renaming,
                * but since the rename is generated server-side and not by the end user,
                * there is no security risk
                **/
                const rename_res = fs.rename(
                    `${f.adapter_file_path}${f.file_name}${f.short_uuid}`,
                    `${f.adapter_file_path}${f.short_uuid}${f.file_name}`,
                    (err) => {
                        if (err) throw err;
                });

                if (rename_res === null || rename_res === undefined) {
                    return Promise.resolve(Result.Success(true));
                }
            } catch (e) {
                Logger.error(`filesystem rename error: ${e}`);
                return Promise.resolve(Result.Success(false));
            }

            return Promise.resolve(Result.Success(false));
        }
    }

    uploadPart(
        filepath: string,
        filename: string,
        fileUUID: string,
        part_id: string,
        part: Readable | null,
    ): Promise<Result<string>> {
        throw new Error('Method not implemented.');
    }
    commitParts(
        filepath: string,
        filename: string,
        fileUUID: string,
        parts: string[],
        options?: BlobUploadOptions
    ): Promise<Result<BlobUploadResponse>> {
        throw new Error('Method not implemented.');
    }
}
