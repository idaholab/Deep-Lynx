// This is a very simple migration system. It reads all .sql scripts inside
// the "migrations" directory and executes them in alphanumeric order. Each
// script is treated as a transaction. Configuration comes from the same config
// file that the main application uses.

import {Pool} from "pg";
import PostgresAdapter from "./data_storage/adapters/postgres/postgres";
import * as fs from "fs";
import Logger from "./logger"

class Migrator {
    private pool!: Pool;

    constructor() {
        const adapter = PostgresAdapter.Instance;
        adapter.init();
        this.pool = PostgresAdapter.Instance.Pool
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
                    Logger.error(`unable to create migrations table, stopping ${e}`)
                }

                Logger.info(`migration of ${file} successful`)
            }

            return Promise.resolve()
        });

        return Promise.resolve()
    }
}

const migrator = new Migrator();
migrator.migrate();
