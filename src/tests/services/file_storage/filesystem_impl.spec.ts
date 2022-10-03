import { expect } from 'chai';
import * as fs from 'fs';
import Logger from '../../../services/logger';
import Filesystem from '../../../services/blob_storage/filesystem_impl';
import File from '../../../domain_objects/data_warehouse/data/file';

describe('Filesystem storage can', async () => {
    let provider: Filesystem;

    before(async function () {
        if (process.env.FILESYSTEM_STORAGE_DIRECTORY === '' || process.env.FILESYSTEM_STORAGE_DIRECTORY === undefined) {
            Logger.debug('skipping filesystem storage tests, no storage directory indicated');
            this.skip();
        }

        provider = new Filesystem(process.env.FILESYSTEM_STORAGE_DIRECTORY || '', process.platform === 'win32');
    });

    it('can upload a file', async () => {
        const readable = fs.createReadStream('./.env-sample');

        const file = new File({
            file_name: '.env-sample',
            file_size: 200,
            adapter_file_path: 'test/',
            adapter: '',
            container_id: ''
        })

        const result = await provider.uploadPipe(file.adapter_file_path!, file.file_name!, readable, 'text/plain', 'utf8');
        if (result) {
            expect(result.isError).false;
        } else {
            expect(false).true;
        }

        // manually overwriting filepath with directory
        file.adapter_file_path = result.value.filepath;

        return provider.deleteFile(file);
    });

    it('can download a file', async () => {
        const readable = fs.createReadStream('./.env-sample');

        const file = new File({
            file_name: '.env-sample',
            file_size: 200,
            adapter_file_path: 'test/',
            adapter: '',
            container_id: ''
        })

        const result = await provider.uploadPipe(file.adapter_file_path!, file.file_name!, readable, 'text/plain', 'utf8');
        if (result) {
            expect(result.isError).false;
        } else {
            expect(false).true;
        }

        // manually overwriting filepath with directory
        file.adapter_file_path = result.value.filepath;

        // as long as the stream is open and not undefined, we can count this test as successful
        const stream = await provider.downloadStream(file);
        expect(stream).not.undefined;

        return provider.deleteFile(file);
    });
});
