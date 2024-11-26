import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import DataSourceRecord, {TimeseriesDataSourceConfig} from '../../../../domain_objects/data_warehouse/import/data_source';
import Event from '../../../../domain_objects/event_system/event';
import EventRepository from '../../../repositories/event_system/event_repository';
import PostgresAdapter from '../../db_adapters/postgres/postgres';
import QueryStream from 'pg-query-stream';
import {plainToClass} from 'class-transformer';
import {DataStaging} from '../../../../domain_objects/data_warehouse/import/import';
import Config from '../../../../services/config';
import {ReadStream} from 'fs';
import { CopyStreamQuery } from 'pg-copy-streams';
import { Readable } from 'stream';
import VectorData from '../../../../domain_objects/data_warehouse/data/vector';
import pgvector from 'pgvector/pg';

const format = require('pg-format');
const devnull = require('dev-null');
const copyFrom = require('pg-copy-streams');

export default class VectorMapper extends Mapper {
    public resultClass = DataSourceRecord;
    public static tableName = 'bdsis_vectors';

    private static instance: VectorMapper;

    private eventRepo = new EventRepository();

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
                    `COPY bdsis_vectors (textual_data, embedding)
                    FROM STDIN WITH (FORMAT csv, DELIMITER E'\t')`
                ));

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
                    try {
                        await client.query("SET maintenance_work_mem = '8GB'");
                        await client.query('SET max_parallel_maintenance_workers = 7');
                        await client.query('CREATE INDEX ON bdsis_vectors USING hnsw (embedding vector_cosine_ops)');
    
                        // update planner statistics for good measure
                        await client.query('ANALYZE bdsis_vectors');
                        done();
                        return resolve(Result.Success(true));
                    } catch (error) {
                        done();
                        return resolve(Result.Failure((error as Error).message));
                    }
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