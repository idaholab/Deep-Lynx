import {expect} from 'chai';
import * as fs from 'fs';
import Logger from '../../../services/logger';
import File from '../../../domain_objects/data_warehouse/data/file';
import MinioBlobImpl from '../../../services/blob_storage/minio_impl';
import Config from '../../../services/config';

describe('Minio Storage can', async () => {
    let provider: MinioBlobImpl;

    before(async function () {
        if (process.env.MINIO_ENDPOINT === '') {
            Logger.debug('skipping minio tests, no connection string indicated');
            this.skip();
        }

        provider = new MinioBlobImpl({
            endPoint: Config.minio_endpoint,
            useSSL: Config.minio_ssl,
            port: Config.minio_port,
            accessKey: Config.minio_access_key,
            secretKey: Config.minio_secret_key,
        });
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

        file.short_uuid = result.value.short_uuid;
        // as long as the stream is open and not undefined, we can count this test as successful
        const stream = await provider.downloadStream(file);
        expect(stream).not.undefined;

        return provider.deleteFile(file);
    });
});
