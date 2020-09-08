import Config from "../../../config"
import {Pool, Client, types} from "pg";

// PostgresAdapter represents a connection to the PostgreSQL database.
export default class PostgresAdapter {
    private static instance: PostgresAdapter;
    private pool!: Pool;

    static get Instance(): PostgresAdapter {
        if (!PostgresAdapter.instance) {
            PostgresAdapter.instance = new PostgresAdapter()
        }

        return PostgresAdapter.instance
    }


    // init will set the connection pool from the configuration file.
    public async  init() {
        this.pool = new Pool({
            connectionString: Config.core_db_connection_string
        })
        // ensures timestamps returned from the db are in UTC strings to match what is in the db
        const timestampOID = 1114
        types.setTypeParser(1114, (stringValue) => {
            return new Date(Date.parse(stringValue + "+0000"))
        })
    }

    get Pool(): Pool {
        return this.pool
    }

    set Pool(p: Pool) {
       this.pool = p
    }

}
