import {expect} from 'chai';
import { PassThrough } from 'stream';
import TimeseriesService from '../../../services/timeseries/timeseries';
import fs from "fs";

describe('The Timeseries Bucket service', async () => {
    it('can create a bucket', async () => {
        const repo = TimeseriesService.Instance;

        const bucket = await (await repo).createBucket({
            name: "Test Bucket",
            columns: [{
                name: "test column",
                shortName: "test",
                dataType: "INT"
            }]
        });

        expect(bucket.id).not.undefined;
        expect(bucket.name).eq('Test Bucket');
        expect(bucket.structure[0].name).eq('test column');
        expect(bucket.structure[0].shortName).eq('test');
        expect(bucket.structure[0].dataType).eq('INT');

        return (await repo).deleteBucket(bucket.id);
    });

    it('can create two buckets with the same name but different IDs', async () => {
        const repo = TimeseriesService.Instance;

        const bucket1 = await (await repo).createBucket({
            name: "Test Bucket",
            columns: [{
                name: "test column",
                shortName: "test",
                dataType: "INT"
            }]
        });

        expect(bucket1.id).not.undefined;
        expect(bucket1.name).eq('Test Bucket');
        expect(bucket1.structure[0].name).eq('test column');
        expect(bucket1.structure[0].shortName).eq('test');
        expect(bucket1.structure[0].dataType).eq('INT');

        // should create a new bucket as names are not unique
        const bucket2 = await (await repo).createBucket({
            name: "Test Bucket",
            columns: [{
                name: "test column",
                shortName: "test",
                dataType: "INT"
            }]
        });

        expect(bucket2.id).not.undefined;
        expect(bucket2.name).eq('Test Bucket');
        expect(bucket2.structure[0].name).eq('test column');
        expect(bucket2.structure[0].shortName).eq('test');
        expect(bucket2.structure[0].dataType).eq('INT');

        // ensure that the two bucket IDs are different
        expect(bucket1.id).not.eq(bucket2.id);

        await (await repo).deleteBucket(bucket1.id);
        return (await repo).deleteBucket(bucket2.id);
    });

    it('can retrieve a bucket', async () => {
        const repo = TimeseriesService.Instance;

        const bucket = await (await repo).createBucket({
            name: "Test Bucket",
            columns: [{
                name: "test column",
                shortName: "test",
                dataType: "INT"
            }]
        })
        expect(bucket.id).not.undefined;

        const retrieved = await (await repo).retrieveBucket(bucket.id);
        expect(retrieved.id).not.undefined;

        expect(retrieved.name).eq('Test Bucket');
        expect(retrieved.structure[0].name).eq('test column');
        expect(retrieved.structure[0].shortName).eq('test');
        expect(retrieved.structure[0].dataType).eq('INT');

        return (await repo).deleteBucket(bucket.id);
    });

    it('can ingest data into a bucket', async () => {
        const repo = TimeseriesService.Instance;

        const bucket = await (await repo).createBucket({
            name: "Test Bucket",
            columns: [{
                name: "int",
                shortName: "int",
                dataType: "INT"
            },{
                name: "bigint",
                shortName: "bigint",
                dataType: "BIGINT"
            }]
        });
        expect(bucket.id).not.undefined;
        expect(bucket.structure[0].name).eq('int');
        expect(bucket.structure[1].name).eq('bigint');

        await (await repo).beginCsvIngestion(bucket.id);

        return new Promise((resolve, reject) => {
            const pass = new PassThrough();

            pass.on('data', async (chunk) => {
                (await repo).readData(chunk);
            });

            pass.on('finish', async () => {
                (await repo).completeIngestion()
                    .then(async () => {
                        (await repo).deleteBucket(bucket.id)
                            .then(() => resolve())
                            .catch((e) => reject(e));
                    })
                    .catch((e) => reject(e));
            });

            let stream = fs.createReadStream(`${__dirname}/sparse_ingestion_test.csv`);
            stream.pipe(pass);
        });
    });

    it('can update a bucket', async () => {
        const repo = TimeseriesService.Instance;

        const bucket = await (await repo).createBucket({
            name: "Test Bucket",
            columns: [{
                name: "test column",
                shortName: "test",
                dataType: "INT"
            }]
        });
        expect(bucket.id).not.undefined;
        expect(bucket.name).eq('Test Bucket');
        expect(bucket.structure[0].dataType).eq('INT');

        const newName = "New Bucket";
        const updated = await (await repo).updateBucket(bucket.id, {
            name: newName,
            columns: [{
                name: "test column",
                shortName: "test",
                dataType: "TEXT"
            }]
        });
        expect(updated.id).not.undefined;
        expect(updated.id).eq(bucket.id);
        expect(updated.name).eq('New Bucket');
        expect(updated.structure[0].dataType).eq('TEXT');

        return (await repo).deleteBucket(updated.id);
    });
});