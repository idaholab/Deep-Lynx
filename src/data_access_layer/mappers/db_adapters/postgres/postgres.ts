import Config from '../../../../services/config';
import {Pool, types} from 'pg';
import 'reflect-metadata'; // this is required for the class-transformer package we use

/*
    PostgresAdapter represents a connection to a PostgreSQL database and serves
    as the primary data storage adapter for all mappers.
 */
export default class PostgresAdapter {
    private static instance: PostgresAdapter;
    private pool!: Pool;

    static get Instance(): PostgresAdapter {
        if (!PostgresAdapter.instance) {
            PostgresAdapter.instance = new PostgresAdapter();
        }

        return PostgresAdapter.instance;
    }

    // init will set the connection pool from the configuration file.
    // eslint-disable-next-line @typescript-eslint/require-await
    public async init() {
        this.pool = new Pool({
            connectionString: Config.core_db_connection_string,
        });
        // ensures timestamps returned from the db are in UTC strings to match what is in the db
        types.setTypeParser(1114, (stringValue) => {
            return new Date(Date.parse(stringValue + '+0000'));
        });
    }

    public async close() {
        return this.pool.end();
    }

    get Pool(): Pool {
        return this.pool;
    }

    set Pool(p: Pool) {
        this.pool = p;
    }
}
