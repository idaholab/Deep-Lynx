/* tslint:disable */
import { expect } from 'chai'
import MockFileStorageImpl from "../../file_storage/mock_impl";


describe('A File Storage', async() => {
    it('can save a local file', async()=> {
        let fileStorage = new MockFileStorageImpl();

        let localUpload = await fileStorage.uploadPipe('../../.env-sample',
            '.env-sample',null, 'md', 'UTF-8');

        let result = localUpload.value;
        expect(localUpload.isError).false;
        expect(localUpload.value).not.empty;

        return fileStorage.deleteFile(result.filepath);
    });

    it('can save a file through http get', async()=> {
        let fileStorage = new MockFileStorageImpl();

        let localUpload = await fileStorage.uploadPipe(
            'https://raw.githubusercontent.com/idaholab/DIAMOND/master/README.md',
            'README.md', null, 'md','UTF-8');

        let result = localUpload.value;
        expect(localUpload.isError).false;
        expect(localUpload.value).not.empty;

        return fileStorage.deleteFile(result.filepath);
    });

});
