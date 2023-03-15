import {BlobStorage, BlobUploadResponse} from './blob_storage';
import Result from '../../common_classes/result';
import {Readable, Writable} from 'stream';
import PostgresAdapter from '../../data_access_layer/mappers/db_adapters/postgres/postgres';
import File from '../../domain_objects/data_warehouse/data/file';
const LargeObjectManager = require('pg-large-object').LargeObjectManager;
const digestStream = require('digest-stream');

/*
    Filesystem is a very simple implementation of BlobStorage and allows Deep Lynx
    to store and retrieve files on the host system. Note: using this in a sharded
    environment could have unintended consequences
 */
export default class LargeObject implements BlobStorage {
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
