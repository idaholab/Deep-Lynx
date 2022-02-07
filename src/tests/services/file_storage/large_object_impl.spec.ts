import {expect} from 'chai';
import * as fs from 'fs';
import LargeObject from '../../../services/blob_storage/pg_large_file_impl';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';

describe('Filesystem storage can', async () => {
    let provider: LargeObject;

    before(async function () {
        await PostgresAdapter.Instance.init();
        provider = new LargeObject();
    });

    it('can upload a file', async () => {
        const readable = fs.createReadStream('./.env-sample');

        const result = await provider.uploadPipe('test/', '.env-sample', readable, 'text/plain', 'utf8');
        if (result) {
            expect(result.isError).false;
        } else {
            expect(false).true;
        }

        return provider.deleteFile(`${result.value.filepath}${result.value.filename}`);
    });

    it('can download a file', async () => {
        const readable = fs.createReadStream('./.env-sample');

        const result = await provider.uploadPipe('test/', '.env-sample', readable, 'text/plain', 'utf8');
        if (result) {
            expect(result.isError).false;
        } else {
            expect(false).true;
        }

        // as long as the stream is open and not undefined, we can count this test as successful
        const stream = await provider.downloadStream(`${result.value.filepath}${result.value.filename}`);
        expect(stream).not.undefined;

        return provider.deleteFile(`${result.value.filepath}${result.value.filename}`);
    });
});
