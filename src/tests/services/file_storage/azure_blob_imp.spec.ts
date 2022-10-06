import { expect } from 'chai';
import * as fs from 'fs';
import AzureBlobImpl from '../../../services/blob_storage/azure_blob_impl';
import Logger from '../../../services/logger';
import File from '../../../domain_objects/data_warehouse/data/file';

describe('Azure Blob Storage can', async () => {
    let provider: AzureBlobImpl;

    before(async function () {
        if (process.env.AZURE_BLOB_CONNECTION_STRING === '' || process.env.AZURE_BLOB_CONNECTION_STRING === undefined) {
            Logger.debug('skipping azure tests, no connection string indicated');
            this.skip();
        }

        provider = new AzureBlobImpl(process.env.AZURE_BLOB_CONNECTION_STRING!, process.env.AZURE_BLOB_TEST_CONTAINER!);
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

        console.log(result);

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

        // as long as the stream is open and not undefined, we can count this test as successful
        const stream = await provider.downloadStream(file);
        expect(stream).not.undefined;

        return provider.deleteFile(file);
    });
});
