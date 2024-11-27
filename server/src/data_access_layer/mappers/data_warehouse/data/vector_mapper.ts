import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import { PoolClient } from 'pg';
import PostgresAdapter from '../../db_adapters/postgres/postgres';
import { CopyStreamQuery } from 'pg-copy-streams';
import VectorData from '../../../../domain_objects/data_warehouse/data/vector';
import pgvector from 'pgvector/pg';

const copyFrom = require('pg-copy-streams').from;

export default class VectorMapper extends Mapper {
    public resultClass = VectorData;
    public static tableName = 'bdsis_vectors';

    private static instance: VectorMapper;

    public static get Instance(): VectorMapper {
        if (!VectorMapper.instance) {
            VectorMapper.instance = new VectorMapper();
        }

        return VectorMapper.instance;
    }

    // takes a JSON set of embedding data and inserts into embedding table
    public async CopyFromJson(embeddingData: VectorData[]): Promise<Result<boolean>> {
        return new Promise((resolve, reject) => {
            PostgresAdapter.Instance.Pool.connect((err: Error, client: PoolClient, done: any) => {
                if (err) {
                    return resolve(Result.Failure('unable to secure postgres client'));
                }

                const stream = client.query(copyFrom(
                    `COPY bdsis_vectors (embedding, textual_data)
                    FROM STDIN WITH (FORMAT csv, DELIMITER E'\t')`
                ));

                // Set max listeners to avoid warning
                stream.setMaxListeners(embeddingData.length + 10); // +10 to provide some buffer

                embeddingData.forEach(async ({text, embedding}) => {
                    const line = `${pgvector.toSql(embedding)}\t${text}\n`;
                    await this.copyRow(stream, line);
                })

                stream.on('error', (error: Error) => {
                    done();
                    return resolve(Result.Failure(error.message));
                });
    
                // create indexes on the table after loading data
                stream.on('finish', async () => {
                    done();
                    return resolve(Result.Success(true));
                });
    
                stream.end();
            })
        })
    }

    // write lines to stream- helper function copied from pgvector documentation:
    // https://github.com/pgvector/pgvector-node/blob/master/examples/loading/example.js#L23
    private copyRow(stream: CopyStreamQuery, line: string): Promise<void> {
        return new Promise<void>((resolve) => {
            let ok = stream.write(line);
            if (!ok) {
                // if buffer is full, wait for space to write line
                stream.once('drain', () => resolve());
            } else {
                resolve();
            }
        })
    }
}