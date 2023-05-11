import test from 'ava'

import {BucketRepository} from '../index.js'
import {PassThrough} from "stream";
import fs from "fs";

test('bucket creation', async (t) => {
    let repo = new BucketRepository();
    await repo.init({
        dbConnectionString: "postgresql://postgres:deeplynxcore@localhost/deep_lynx",
        maxColumns: 100
    })

    try {
        let check = await repo.createBucket({
            name: "Test Bucket",
            columns: [{
                name: "test column",
                shortName: "test",
                dataType: "INT"
            }]
        })

        t.assert(check.id)
        await repo.deleteBucket(check.id)
    } catch (e) {
        return Promise.reject(e)
    }

    // should create a new bucket as names are not unique
    try {
        let check = await repo.createBucket({
            name: "Test Bucket",
            columns: [{
                name: "test column",
                shortName: "test",
                dataType: "INT"
            }]
        })

        t.assert(check.id)

        return repo.deleteBucket(check.id)
    } catch (e) {
        return Promise.reject(e)
    }
})


test('bucket retrieval', async (t) => {
    let repo = new BucketRepository();
    await repo.init({
        dbConnectionString: "postgresql://postgres:deeplynxcore@localhost/deep_lynx",
        maxColumns: 100
    })
    // should create a new bucket as names are not unique
    try {
        let check = await repo.createBucket({
            name: "Test Bucket",
            columns: [{
                name: "test column",
                shortName: "test",
                dataType: "INT"
            }]
        })
        t.assert(check.id)

        let retrieved = await repo.retrieveBucket(check.id)
        t.assert(retrieved.id)

        return repo.deleteBucket(check.id)
    } catch (e) {
        return Promise.reject(e)
    }
})

test('ingestion async test', async (t) => {
    let repo = new BucketRepository();
    await repo.init({
        dbConnectionString: "postgresql://postgres:deeplynxcore@localhost/deep_lynx",
        maxColumns: 100
    })
    // should create a new bucket as names are not unique
    try {
        let check = await repo.createBucket({
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
        })
        t.assert(check.id)

        await repo.beginCsvIngestion(check.id)

        return new Promise((resolve, reject) => {
            const pass = new PassThrough();

            pass.on('data', (chunk) => {
                repo.readData(chunk)
            });

            pass.on('finish', () => {
                repo.completeIngestion()
                    .then(() => {
                        repo.deleteBucket(check.id)
                            .then(() => resolve())
                            .catch((e) => reject(e))
                    })
                    .catch((e) => reject(e))
            });

            let stream = fs.createReadStream('./test_files/sparse_ingestion_test.csv');
            stream.pipe(pass);
        })
    } catch (e) {
        return Promise.reject(e)
    }
})

test('bucket update', async (t) => {
    let repo = new BucketRepository();
    await repo.init({
        dbConnectionString: "postgresql://postgres:deeplynxcore@localhost/deep_lynx",
        maxColumns: 100
    })
    // should create a new bucket as names are not unique
    try {
        let check = await repo.createBucket({
            name: "Test Bucket",
            columns: [{
                name: "test column",
                shortName: "test",
                dataType: "INT"
            }]
        })
        t.assert(check.id)

        let new_name = "New Bucket"
        let updated = await repo.updateBucket(check.id, {
            name: new_name,
            columns: [{
                name: "test column",
                shortName: "test",
                dataType: "TEXT"
            }]
        })

        t.assert(updated.name === "New Bucket")

        return repo.deleteBucket(updated.id)
    } catch (e) {
        return Promise.reject(e)
    }
})