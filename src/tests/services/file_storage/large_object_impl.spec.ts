import {expect} from 'chai';
import * as fs from 'fs';
import LargeObject from '../../../services/blob_storage/pg_large_file_impl';
import PostgresAdapter from '../../../data_access_layer/mappers/db_adapters/postgres/postgres';
import File from '../../../domain_objects/data_warehouse/data/file';

describe('Large object storage can', async () => {
    let provider: LargeObject;

    before(async function () {
        await PostgresAdapter.Instance.init();
        provider = new LargeObject();
    });

    it('can upload a file', async () => {
        const readable = fs.createReadStream('./.env-sample');

        const file = new File({
            file_name: '.env-sample',
            file_size: 200,
            adapter_file_path: 'test/',
            adapter: '',
            container_id: '',
        });

        const result = await provider.uploadPipe(file.adapter_file_path!, file.file_name!, readable, 'text/plain', 'utf8');
        if (result) {
            expect(result.isError).false;
        } else {
            expect(false).true;
        }

        // for testing purposes we just manually overwrite our bogus filepath with OID
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
            container_id: '',
        });

        const result = await provider.uploadPipe(file.adapter_file_path!, file.file_name!, readable, 'text/plain', 'utf8');
        if (result) {
            expect(result.isError).false;
        } else {
            expect(false).true;
        }

        // for testing purposes we just manually overwrite our bogus filepath with OID
        file.adapter_file_path = result.value.filepath;

        const s = fs.createWriteStream('bob.json');

        // as long as the stream is open and not undefined, we can count this test as successful
        const stream = await provider.downloadStream(file);
        expect(stream).not.undefined;

        stream?.pipe(s);

        fs.unlinkSync('bob.json');
        return provider.deleteFile(file);
    });
});
