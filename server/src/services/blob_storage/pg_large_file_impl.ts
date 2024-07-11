/* DEPRECATED */

import {BlobStorage, BlobUploadOptions, BlobUploadResponse} from './blob_storage';
import Result from '../../common_classes/result';
import {Readable, Writable} from 'stream';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import File from '../../domain_objects/data_warehouse/data/file';
import {LargeObject} from 'pg-large-object';
const LargeObjectManager = require('pg-large-object').LargeObjectManager;
const digestStream = require('digest-stream');

/*
    Largeobject should no longer be used and is only maintained in the codebase to
    retrieve existing file records in the DB
 */
export default class LargeObjectImpl implements BlobStorage {
    async deleteFile(f: File): Promise<Result<boolean>> {
        return new Promise((resolve, reject) => {
            PostgresAdapter.Instance.Pool.connect()
                .then((client) => {
                    client
                        .query('BEGIN')
                        .then(() => {
                            client
                                .query({text: 'SELECT lo_unlink($1);', values: [parseInt(f.adapter_file_path!, 10)]})
                                .then(() => {
                                    client
                                        .query('COMMIT')
                                        .then(() => {
                                            client.release();
                                            resolve(Result.Success(true));
                                        })
                                        .catch((e) => reject(e));
                                })
                                .catch((e) => reject(e));
                        })
                        .catch((e) => reject(e));
                })
                .catch((e) => reject(e));
        });
    }

    name(): string {
        return 'largeobject';
    }

    async uploadPipe(
        filepath: string,
        filename: string,
        stream: Readable | null,
        contentType?: string,
        encoding?: string,
        options?: BlobUploadOptions,
    ): Promise<Result<BlobUploadResponse>> {
        let md5hash = '';
        let dataLength = 0;
        const name = this.name();

        // pipe through this man in the middle to gain the md5 hash and file size
        const dstream = digestStream('md5', 'hex', (resultDigest: string, length: number) => {
            md5hash = resultDigest;
            dataLength = length;
        });

        return new Promise((resolve, reject) => {
            PostgresAdapter.Instance.Pool.connect()
                .then((client) => {
                    const manager = new LargeObjectManager({pg: client});

                    client
                        .query('BEGIN')
                        .then(() => {
                            manager.createAndWritableStream(16384, (err: any, oid: any, writeStream: Writable) => {
                                if (err) {
                                    reject(err);
                                }

                                // The server has generated an oid
                                writeStream.on('finish', function () {
                                    // Actual writing of the large object in DB may
                                    // take some time, so one should provide a
                                    // callback to client.query.
                                    client
                                        .query('COMMIT')
                                        .then(() => {
                                            client.release();
                                            resolve(
                                                Result.Success({
                                                    filename,
                                                    filepath: String(oid),
                                                    size: dataLength / 1000,
                                                    md5hash,
                                                    adapter_name: name,
                                                    metadata: {},
                                                }),
                                            );
                                        })
                                        .catch((e) => reject(e));
                                });

                                stream?.pipe(dstream).pipe(writeStream);
                            });
                        })
                        .catch((e) => reject(e));
                })
                .catch((e) => reject(e));
        });
    }

    async appendPipe(file: File, stream: Readable | null): Promise<Result<boolean>> {
        return new Promise((resolve, reject) => {
            PostgresAdapter.Instance.Pool.connect()
                .then((client) => {
                    const manager = new LargeObjectManager({pg: client});

                    void client
                        .query('BEGIN')
                        .then(() => {
                            manager.open(file.adapter_file_path, LargeObjectManager.READWRITE, (err: any, result: LargeObject) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }

                                // you have to set the cursor to the end or else you'll overwrite the current contents
                                result.seek(0, LargeObject.SEEK_END);

                                const writeStream = result.getWritableStream();

                                // The server has generated an oid
                                writeStream.on('finish', function () {
                                    // Actual writing of the large object in DB may
                                    // take some time, so one should provide a
                                    // callback to client.query.
                                    client
                                        .query('COMMIT')
                                        .then(() => {
                                            client.release();
                                            resolve(Result.Success(true));
                                        })
                                        .catch((e) => reject(e));
                                });

                                writeStream.on('error', (e) => {
                                    reject(e);
                                });

                                stream?.pipe(writeStream);
                            });
                        })
                        .catch((e: any) => reject(e));
                })
                .catch((e) => reject(e));
        });
    }

    downloadStream(f: File): Promise<Readable | undefined> {
        return new Promise((resolve, reject) => {
            PostgresAdapter.Instance.Pool.connect()
                .then((client) => {
                    const manager = new LargeObjectManager({pg: client});

                    client
                        .query('BEGIN')
                        .then(() => {
                            manager.openAndReadableStream(parseInt(f.adapter_file_path!, 10), 16384, (err: any, size: any, stream: Readable) => {
                                if (err) reject(err);

                                stream.on('end', () => {
                                    void client.query('COMMIT');
                                    void client.release();
                                });

                                resolve(stream);
                            });
                        })
                        .catch((e) => reject(e));
                })
                .catch((e) => reject(e));
        });
    }
}
