import {BlobStorage, BlobUploadResponse} from "./blob_storage";
import Result from "../../common_classes/result";
import {Readable} from "stream";
import * as fs from "fs";
import Logger from "./../logger";
const digestStream = require('digest-stream')

/*
    Filesystem is a very simple implementation of BlobStorage and allows Deep Lynx
    to store and retrieve files on the host system. Note: using this in a sharded
    environment could have unintended consequences
 */
export default class Filesystem implements BlobStorage {
    private _directory: string
    private _isWindows: boolean | undefined

    async deleteFile(filepath: string): Promise<Result<boolean>> {
        if(this._isWindows) filepath = filepath.replace(new RegExp("/", "g"), `\\` )

        fs.unlinkSync(filepath)

        if(fs.existsSync(filepath)) {
            return Promise.resolve(Result.Failure("unable to delete file"));
        }

        return Promise.resolve(Result.Success(true));
    }

    name(): string {
        return "filesystem";
    }

    async uploadPipe(filepath: string, filename: string, stream: Readable | null, contentType?: string, encoding?: string): Promise<Result<BlobUploadResponse>> {
        if(!this._directory) {
            return Promise.resolve(Result.Failure("directory does not exist or was unable to be opened"))
        }

       // Windows directories use backslashes instead of forward slashes in unix like systems
        if(this._isWindows) filepath = filepath.replace(new RegExp("/", "g"), `\\` )

        if(!fs.existsSync(`${this._directory}${filepath}`)){
            fs.mkdirSync(`${this._directory}${filepath}`, {recursive: true})
        }

        const writeStream = fs.createWriteStream(`${this._directory}${filepath}${filename}`, {flags: 'w'})

        stream?.on('error', (err: Error) => {
           Logger.error(`error saving file to filesystem ${err}`)
        })

        let md5hash: string = "";
        let dataLength: number = 0;

        // pipe through this man in the middle to gain the md5 hash and file size
        const dstream = digestStream('md5', 'hex', (resultDigest: string, length: number) => {
            md5hash = resultDigest;
            dataLength = length;
        });

        await stream?.pipe(dstream).pipe(writeStream)

        return Promise.resolve(Result.Success({
            filename,
            filepath: `${this._directory}${filepath}`,
            size: dataLength / 1000,
            md5hash,
            adapter_name: this.name()
        } as BlobUploadResponse));
    }

    downloadStream(filepath: string): Promise<Readable | undefined> {
        return Promise.resolve(fs.createReadStream(`${filepath}`))
    }

    // the isWindows could be solved by looking at process.platform instead, but I'd rather limit the access
    // to environment variables and environment to the config file, meaning the user is in charge of telling
    // this class whether or not its operating in a windows environment
    constructor(directory: string, isWindows?: boolean) {
        if(!fs.existsSync(directory)) {
            fs.mkdirSync(directory, {recursive: true})
        }

        this._directory = directory
        this._isWindows = isWindows
    }
}
