import Config from "../../../../config"
import {Db, MongoClient} from "mongodb";

export default class MongoAdapter {
    private static instance: MongoAdapter;
    // @ts-ignore
    public client: MongoClient;
    public database!: Db;

    static get Instance(): MongoAdapter {
        if (!MongoAdapter.instance) {
            MongoAdapter.instance = new MongoAdapter()
        }

        return MongoAdapter.instance
    }

    private constructor() {}

    public async init() {
        this.client = await MongoClient.connect(
            Config.mongo_source_uri,
            {useUnifiedTopology: true}
        );

        this.database = this.client.db(Config.mongo_source_db)
    }
}
