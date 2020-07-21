import Config from "../../../config"
import {Pool, Client} from "pg";

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
    }

    get Pool(): Pool {
        return this.pool
    }

    set Pool(p: Pool) {
       this.pool = p
    }

}
