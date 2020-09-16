/* tslint:disable */
import { expect } from 'chai'
import * as fs from "fs";
import AzureBlobImpl from "../../file_storage/azure_blob_impl";
import Logger from "../../logger";


describe('Azure Blob Storage can', async() => {
    let provider: AzureBlobImpl

    before(async function() {
        if (process.env.AZURE_BLOB_CONNECTION_STRING === "" || process.env.AZURE_BLOB_CONNECTION_STRING === undefined) {
            Logger.debug("skipping azure tests, no connection string indicated");
            this.skip()
        }

        provider = new AzureBlobImpl(process.env.AZURE_BLOB_CONNECTION_STRING!, process.env.AZURE_BLOB_TEST_CONTAINER!)
    });

    it('can upload a file', async()=> {
        const readable = fs.createReadStream('./.env-sample')

        const result = await provider.uploadPipe("test/", '.env-sample', readable, "text/plain", 'utf8')
        if(result) {
            expect(result.isError).false
        } else {
            expect(false).true
        }

        return provider.deleteFile("test/.env-sample");
    });

    it('can download a file', async()=> {
        const readable = fs.createReadStream('./.env-sample')

        const result = await provider.uploadPipe("test/", '.env-sample', readable, "text/plain", 'utf8')
        if(result) {
            expect(result.isError).false
        } else {
            expect(false).true
        }

        // as long as the stream is open and not undefined, we can count this test as successful
        const stream = await provider.downloadStream(`${result.value.filepath}${result.value.filename}`)
        expect(stream).not.undefined

        return provider.deleteFile(`${result.value.filepath}${result.value.filename}`);
    });

});
