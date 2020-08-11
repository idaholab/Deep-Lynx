/* tslint:disable */
import { expect } from 'chai'
import * as fs from "fs";
import Logger from "../../logger";
import Filesystem from "../../file_storage/filesystem_impl";


describe('Filesystem storage can', async() => {
    let provider: Filesystem

    before(async function() {
        if (process.env.FILESYSTEM_STORAGE_DIRECTORY === "" || process.env.FILESYSTEM_STORAGE_DIRECTORY === undefined) {
            Logger.debug("skipping filesystem storage tests, no storage directory indicated");
            this.skip()
        }

        provider = new Filesystem(process.env.FILESYSTEM_STORAGE_DIRECTORY || "", process.platform === 'win32')
    });

    it('can upload a file', async()=> {
        const readable = fs.createReadStream('./.env-sample')

        const result = await provider.uploadPipe("test/", '.env-sample', readable, "text/plain", 'utf8')
        if(result) {
            expect(result.isError).false
        } else {
            expect(false).true
        }

        return provider.deleteFile(`${result.value.filepath}${result.value.filename}`);
    });

});
