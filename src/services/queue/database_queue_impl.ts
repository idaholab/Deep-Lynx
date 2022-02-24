import {QueueInterface} from './queue';
import {Transform, Writable} from 'stream';
import {Pool, types} from 'pg';
import Config from '../config';
import Logger from '../logger';

const format = require('pg-format');
const QueryStream = require('pg-query-stream');

/*
    DatabaseQueue is a very simple database queue implementation - utilizing
    a table created in the migrate script. This particular implementation was
    designed with local development and experimentation only - it should not
    be used in a production environment.
 */
export default class DatabaseQueue implements QueueInterface {
    private pool!: Pool;

    async Init(): Promise<boolean> {
        this.pool = new Pool({
            connectionString: Config.core_db_connection_string,
        });

        // ensures timestamps returned from the db are in UTC strings to match what is in the db
        types.setTypeParser(1114, (stringValue) => {
            return new Date(Date.parse(stringValue + '+0000'));
        });

        return Promise.resolve(true);
    }

    // starts an infinite loop of reading and outputting messages from the queue
    // table into a destination write stream
    Consume(queueName: string, destination: Writable): void {
        // in order to use the streaming query we have to call the client specifically
        void this.pool.connect((err, client, done) => {
            // stream is already in object mode
            const query = new QueryStream(`SELECT * FROM queue WHERE queue_name = $1 AND processed_at IS NULL ORDER BY created_at ASC`, [queueName]);
            const stream = client.query(query);

            // mark the task completed in the database
            stream.on('data', (data: any) => {
                this.pool.query({text: `DELETE FROM queue WHERE id = $1`, values: [data.id]}).catch((e) => {
                    Logger.error(`unable to mark queue item as done ${e}`);
                });
            });

            stream.on('end', () => {
                done();
                setTimeout(() => {
                    this.Consume(queueName, destination);
                }, 200); // throw a slight delay so that an empty queue doesn't swamp the database
            });

            // we need a transform stream to output only the message itself
            const transform = new Transform({
                transform(data: any, en, cb) {
                    this.push(data.data);
                    cb();
                },
                objectMode: true, // must maintain object mode
            });

            // the read stream ending will end write destination stream unless
            // we explicitly tell it not to. Since we're doing crazy recursion,
            // tell it to not end when the stream does
            stream.pipe(transform).pipe(destination, {end: false});
        });
    }

    // inserts a record into the queue table
    async Put(queueName: string, data: any): Promise<boolean> {
        try {
            await this.pool.query(format(`INSERT INTO queue(queue_name, data) VALUES (%L)`, [queueName, data]));
            return Promise.resolve(true);
        } catch (e) {
            Logger.error(`unable to insert message onto database queue ${e}`);
            return Promise.resolve(false);
        }
    }
}
