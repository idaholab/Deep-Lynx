/* tslint:disable */
import { expect } from 'chai'
import MockFileStorageImpl from "../../file_storage/mock_impl";
import FileStorageProvider from "../../file_storage/file_storage";
import * as fs from "fs";


describe('Azure Blob Storage can', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
        // return Promise.resolve()
    });

    it('can upload a file', async()=> {
        let fileStorage = FileStorageProvider()
        expect(fileStorage).not.null

        const readable = fs.createReadStream('./.env-sample')

        const result = await fileStorage?.uploadPipe("bob/test", readable, "", "")
        console.log(result!.value)


        return fileStorage!.deleteFile("");
    });

    it('can save a file through http get', async()=> {
        let fileStorage = new MockFileStorageImpl();

        let localUpload = await fileStorage.uploadPipe(
            'https://raw.githubusercontent.com/idaholab/DIAMOND/master/README.md',
            null, 'UTF-8', 'md');

        let filepath = localUpload.value;
        expect(localUpload.isError).false;
        expect(localUpload.value).not.empty;

        return fileStorage.deleteFile(filepath);
    });

});
