/*
 This is a very simple migration system. It reads all .sql scripts inside
 the "migrations" directory and executes them in alphanumeric order. Each
 script is treated as a transaction. Configuration comes from the same config
 file that the main application uses.
*/

import PostgresAdapter from './mappers/db_adapters/postgres/postgres';
import Config from '../services/config';
import * as fs from 'fs';
import Logger from '../services/logger';
import * as path from 'path';
import {Pool, QueryResult} from 'pg';
import {ConnectionOptions} from 'pg-connection-string';

const pgParse = require('pg-connection-string').parse;
const format = require('pg-format');

class Migrator {
    private pool!: any;

    constructor() {
        // check to see if production environment, if so we do not want to create
        // the database as we most likely do not have permissions to do so
        if(process.env.NODE_ENV !== 'production') {
        // we will attempt to create the database named by the environment variables prior to migration
        // this allows us to work on a pristine instance of Postgres without having to have the user
        // perform any database operations manually
            const connectionDetails: ConnectionOptions = pgParse.parse(Config.core_db_connection_string);

            // we're going to use the raw node-pg library here, as we need to make a connection
            // sans database name. This connection will be used to create the db if it doesn't
            // exist

            const pool = new Pool({
                host: connectionDetails.host!, // pg-node can handle multiple hosts
                port: connectionDetails.port ? Number(connectionDetails.port) : 5432,
                user: connectionDetails.user,
                password: connectionDetails.password,
                ssl: Config.ssl_enabled
            });

            // first check to see if the database specified by the connection string already exists
            pool.query(format(`SELECT datname FROM pg_catalog.pg_database WHERE datname = %L`, connectionDetails.database))
                .then((results: QueryResult<any>) => {
                // if results are returned, a database matching the name exists, run migrate
                    if(results.rows.length > 0) {
                        Logger.info(`${connectionDetails.database} database already exists. Proceeding to migration scripts`);
                        this.init();
                        return
                    }

                    pool.query(format(`CREATE DATABASE %s`, connectionDetails.database))
                        .then(() => {
                            Logger.info(`successful creation of ${connectionDetails.database} database`);
                            this.init();
                        })
                        .catch((e: any) => {
                            Logger.error(
                                `creation of ${connectionDetails.database} database failed -
                         this is frequently caused by an incorrect connection string. 
                         Verify your CORE_DB_CONNECTION string environment variable and try again: ${e}`,
                            );
                            process.exit(-1);
                        })
                })
                .catch((e: any) => {
                    Logger.error(`unable to verify if database specified by connection string exists: ${e}`)
                })
        } else {
            this.init()
        }
    }

    init() {
        const adapter = PostgresAdapter.Instance;
        void adapter.init();
        this.pool = PostgresAdapter.Instance.Pool;
        void this.migrate();
    }

    async migrate() {
        // create the migrations table if it doesn't already exist
        await this.pool.query('BEGIN');
        const createStatement = `CREATE TABLE IF NOT EXISTS migrations (
                                 name character varying(255) NOT NULL UNIQUE)`;

        try {
            await this.pool.query(createStatement);
            await this.pool.query('COMMIT');
        } catch (e) {
            await this.pool.query('ROLLBACK');
            Logger.error(`unable to create migrations table, stopping ${e}`);
        }

        // read the migrations directory
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        fs.readdir(path.resolve(__dirname, `../../src/data_access_layer/migrations`), async (err, files) => {
            if (err) {
                Logger.error('unable to read migration directory');
                return;
            }

            // for each file create a new transaction and run each sql statement
            // contained within
            for (const file of files) {
                // if this is a timescaledb migration, check first to see if we're in a timescale enabled environment
                if(file.includes('[ts]') && !Config.timescaledb_enabled) {
                    Logger.warn(`Skipping ${file}, TimescaleDB is not enabled`)
                    continue;
                }

                await this.pool.query('BEGIN');

                try {
                    // check to see if the migration ran
                    const results = await this.pool.query(`SELECT * FROM migrations WHERE name = '${file}'`);
                    if (results.rows.length !== 0) {
                        Logger.info(`${file} already migrated, skipping`);
                        await this.pool.query('COMMIT');
                        continue;
                    }

                    // run the file's statements as part of the transaction
                    Logger.info(`beginning migration of ${file}`);

                    await this.pool.query({
                        text: `INSERT INTO migrations(name) VALUES($1)`,
                        values: [file],
                    });
                    const statements = fs.readFileSync(path.resolve(__dirname, `../../src/data_access_layer/migrations/${file}`)).toString();

                    await this.pool.query(statements);

                    await this.pool.query('COMMIT');
                } catch (e) {
                    await this.pool.query('ROLLBACK');
                    Logger.error(`unable to execute migration, rolling back ${e}`);
                    return Promise.resolve();
                }

                Logger.info(`migration of ${file} successful`);
            }

            return Promise.resolve();
        });

        return Promise.resolve();
    }
}

const migrator = new Migrator();
