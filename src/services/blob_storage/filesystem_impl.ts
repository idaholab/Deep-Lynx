import {BlobStorage, BlobUploadResponse} from './blob_storage';
import Result from '../../common_classes/result';
import {Readable} from 'stream';
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
        let filepath;
        if (f.short_uuid) {
            filepath = `${f.adapter_file_path}${f.file_name}${f.short_uuid}`;
        } else {
            filepath = `${f.adapter_file_path}${f.file_name}`;
        }
        if (this._isWindows) filepath = filepath.replace(new RegExp('/', 'g'), `\\`);

        fs.unlinkSync(filepath);

        if (fs.existsSync(filepath)) {
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
            fs.mkdirSync(`${this._directory}${filepath}`, {recursive: true});
        }

        const writeStream = fs.createWriteStream(`${this._directory}${filepath}${filename}${shortUUID}`, {flags: 'w'});

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

    downloadStream(f: File): Promise<Readable | undefined> {
        let filepath;
        if (f.short_uuid) {
            filepath = `${f.adapter_file_path}${f.file_name}${f.short_uuid}`;
        } else {
            filepath = `${f.adapter_file_path}${f.file_name}`;
        }
        return Promise.resolve(fs.createReadStream(filepath));
    }

    // the isWindows could be solved by looking at process.platform instead, but I'd rather limit the access
    // to environment variables and environment to the config file, meaning the user is in charge of telling
    // this class whether or not its operating in a windows environment
    constructor(directory: string, isWindows?: boolean) {
        if (!fs.existsSync(directory)) {
            try {
                fs.mkdirSync(directory, {recursive: true});
            } catch (err) {
                Logger.error(`error creating directory ${err}`);
            }
        }

        this._directory = directory;
        this._isWindows = isWindows;
    }
}
