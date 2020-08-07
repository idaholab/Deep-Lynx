import {FileStorage, FileUploadResponse} from "../file_storage/file_storage";
import Result from "../result";
import {Readable} from "stream";
import * as fs from "fs";
import Logger from "../logger";

export default class Filesystem implements FileStorage {
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

    async uploadPipe(filepath: string, filename: string, stream: Readable | null, contentType?: string, encoding?: string): Promise<Result<FileUploadResponse>> {
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

        await stream?.pipe(writeStream)

        const stats = fs.statSync(`${this._directory}${filepath}${filename}`)

        return Promise.resolve(Result.Success({
            filename,
            filepath: `${this._directory}${filepath}`,
            size: stats.size,
            adapter_name: this.name()
        } as FileUploadResponse));
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
