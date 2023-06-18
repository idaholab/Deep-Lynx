import Config from '../config';
import {RedisGraphLoader} from 'redis_graph_loader';

export default class RedisGraphLoaderService {
    private loader: RedisGraphLoader;

    public static GetInstance(): Promise<RedisGraphLoaderService> {
        const instance = new RedisGraphLoaderService();
        return new Promise((resolve, reject) => {
            instance
                .init(Config.core_db_connection_string, Config.redis_connection_string)
                .then(() => {
                    resolve(instance);
                })
                .catch((e) => {
                    reject(e);
                });
        });
    }

    init(dbConnectionString: string, redisConnectionString: string): Promise<void> {
        return this.loader.init({dbConnectionString, redisConnectionString});
    }

    constructor() {
        this.loader = new RedisGraphLoader();
    }

    loadGraph(containerID: string, timestamp?: string): Promise<void> {
        return this.loader.generateRedisGraph(containerID, timestamp);
    }
}
