// This is a very simple migration system. It reads all .sql scripts inside
// the "migrations" directory and executes them in alphanumeric order. Each
// script is treated as a transaction. Configuration comes from the same config
// file that the main application uses.

import {Pool} from "pg";
import PostgresAdapter from "./data_storage/adapters/postgres/postgres";
import Config from "./config"
import * as fs from "fs";
import Logger from "./logger"
import pgtools from "pgtools";

class Migrator {
    private pool!: Pool;

    constructor() {
        pgtools.createdb(Config.core_db_connection_string, Config.db_name, (err: any, res: string) => {
            if (err) {
                if (err.name === 'duplicate_database') {
                    Logger.info(`${Config.db_name} database already exists. Proceeding to migration scripts`)
                    this.init();
                } else {
                    Logger.error(`creation of ${Config.db_name} database failed - this is frequently caused by an incorrect connection string. Verify your CORE_DB_CONNECTION string environment variable and try again.`)
                    process.exit(-1);
                }
            } else {
                Logger.info(`successful creation of ${Config.db_name} database`)
                this.init();
            }
        })
    }

    init() {
        const adapter = PostgresAdapter.Instance;
        adapter.init();
        this.pool = PostgresAdapter.Instance.Pool
        this.migrate();
    }

    async migrate() {
       // create the migrations table if it doesn't already exist
        await this.pool.query('BEGIN');
        const createStatement = `CREATE TABLE IF NOT EXISTS migrations (
                                 name character varying(255) NOT NULL UNIQUE)`;

        try {
            await this.pool.query(createStatement);
            await this.pool.query('COMMIT')

        } catch(e) {
            await this.pool.query('ROLLBACK');
            Logger.error(`unable to create migrations table, stopping ${e}`)
        }


        // read the migrations directory
        fs.readdir("./migrations",
            async (err, files)=>{
            if(err){
                Logger.error('unable to read migration directory');
                return
            }

            // for each file create a new transaction and run each sql statement
            // contained within
            for(const file of files) {
                await this.pool.query('BEGIN');

                try {
                    // check to see if the migration ran
                    const results = await this.pool.query(`SELECT * FROM migrations WHERE name = '${file}'`);
                    if(results.rows.length !== 0) {
                        Logger.info(`${file} already migrated, skipping`);
                        await this.pool.query('COMMIT');
                        continue
                    }


                    // run the file's statements as part of the transaction
                    Logger.info(`beginning migration of ${file}`);

                    await this.pool.query({text:`INSERT INTO migrations(name) VALUES($1)`, values:[file]});
                    const statements = fs.readFileSync(`./migrations/${file}`).toString();

                    await this.pool.query(statements)

                    await this.pool.query('COMMIT')
                } catch(e) {
                    await this.pool.query('ROLLBACK');
                    Logger.error(`unable to execute migration, rolling back ${e}`)
                    return Promise.resolve()
                }

                Logger.info(`migration of ${file} successful`)
            }

            return Promise.resolve()
        });

        return Promise.resolve()
    }
}

const migrator = new Migrator();
