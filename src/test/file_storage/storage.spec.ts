/* tslint:disable */
import { expect } from 'chai'
import MockFileStorageImpl from "../../file_storage/file_storage";


describe('A File Storage', async() => {
    var containerID:string = process.env.TEST_CONTAINER_ID || "";

    before(async function() {
        // return Promise.resolve()
    });

    it('can save a local file', async()=> {
        let fileStorage = new MockFileStorageImpl();

        let localUpload = await fileStorage.uploadPipe('../../.env-sample',
            'UTF-8', 'md');

        let filepath = localUpload.value;
        expect(localUpload.isError).false;
        expect(localUpload.value).not.empty;

        return fileStorage.deleteFile(filepath);
    });

    it('can save a file through http get', async()=> {
        let fileStorage = new MockFileStorageImpl();

        let localUpload = await fileStorage.uploadPipe(
            'https://raw.githubusercontent.com/idaholab/DIAMOND/master/README.md', 
            'UTF-8', 'md');

        let filepath = localUpload.value;
        expect(localUpload.isError).false;
        expect(localUpload.value).not.empty;

        return fileStorage.deleteFile(filepath);
    });

});
