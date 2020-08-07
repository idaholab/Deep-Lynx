import {Readable} from "stream";
import Result from "../result";
import fs from "fs";
import Logger from "../logger";
import {FileStorage, FileUploadResponse} from "./file_storage";
const http = require('http');
const https = require('https');

export default class MockFileStorageImpl implements FileStorage {
    name(): string {
        return "mock"
    }

    public async uploadPipe(filepath: string, fileName:string, stream: Readable| null, contentType?: string, encoding?: string, ): Promise<Result<FileUploadResponse>> {
        // how to use mimeType?
        // get name of the file from full path
        const filenameArr = filepath.match(/[\w.\- ]*$/);
        let filename = null;
        if (filenameArr) {
            filename = filenameArr[0];
        }
        // create local dir if it doesn't exist
        const dir = './files';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }

        const uploadPath = dir + '/' + filename;
        const filewrite = fs.createWriteStream(uploadPath, {encoding});

        return new Promise(resolve => {
            if (filepath.match(/(www\.|http)/)) {
                // determine http or https
                const url = new URL(filepath);
                const client = (url.protocol === "https"||"https:") ? https : http;
                // read the file from a remote source
                client.get(filepath, (res:any) => {
                    res.pipe(filewrite)
                        .on('finish', () => {
                            Logger.info(`Sucessful GET to ${filepath}`);
                            Logger.info(`File written to ${uploadPath}`);
                            resolve(Result.Success({
                                filepath: uploadPath,
                                filename: fileName,
                                size: 0,
                                metadata: {},
                                adapter_name: 'mock'
                            }));
                        })
                        .on('error', (error:any) => {
                            Logger.error(`Error with GET to ${filepath} and write to ${uploadPath}`);
                            Logger.error(`Error returned: ${error}`);
                            resolve(Result.Error(error));
                        })
                })
            } else {
                // read from file and pipe to write stream
                fs.createReadStream(filepath, {encoding})
                    .pipe(filewrite)
                    .on('finish', () => {
                        Logger.info(`Sucessful read from ${filepath}`);
                        Logger.info(`File written to ${uploadPath}`);
                        resolve(Result.Success({
                            filepath: uploadPath,
                            filename: fileName,
                            size: 0,
                            metadata: {},
                            adapter_name: 'mock'
                        }));
                    })
                    .on('error', (error) => {
                        Logger.error(`Error with GET to ${filepath} and write to ${uploadPath}`);
                        Logger.error(`Error returned: ${error}`);
                        resolve(Result.Error(error));
                    });
            }
        })
    }

    public async deleteFile(filepath: string): Promise<Result<boolean>> {
        return new Promise(resolve => {
            fs.unlink(filepath, (err: any) => {
                if (err) {
                    resolve(Result.Error(err));
                } else {
                    resolve(Result.Success(true))
                }
            })
        })
    }

}
