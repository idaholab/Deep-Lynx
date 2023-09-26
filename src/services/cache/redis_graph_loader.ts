import Config from '../config';
import {RedisGraphLoader} from 'deeplynx';
import Result from '../../common_classes/result';
import {Redis} from 'ioredis';
import {Query} from '../../graphql/schema';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {RedisStatic} from 'ioredis';

export default class RedisGraphService {
    private loader: RedisGraphLoader;
    private _redis: Redis;

    public static GetInstance(): Promise<RedisGraphService> {
        const instance = new RedisGraphService();
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
        this._redis = new Redis(Config.redis_connection_string);
        this.setQueryTransformer();
    }

    setQueryTransformer() {
        Redis.Command.setReplyTransformer('GRAPH.RO_QUERY', (result) => {
            const metaInformation = this.parseMetaInformation(result.pop());

            let parsedResults: any[] = [];

            if (result.length > 1) {
                // if there are results to parse
                const columnHeaders = result[0];
                const resultSet = result[1];

                parsedResults = resultSet.map((result: any) => {
                    return this.parseResult(columnHeaders, result);
                });
            }

            return parsedResults;
        });
    }

    parseMetaInformation(array: any[]): any {
        const meta: any = {};
        for (const prop of array) {
            let [name, value] = prop.split(': ');
            if (value) {
                value = value.trim();
                name = name;
                meta[name] = value;
            }
        }
        return meta;
    }

    parseResult(columnHeaders: string[], singleResult: any): any {
        const columns = columnHeaders.map((columnHeader: string, index: number) => {
            const name = columnHeader;
            let value = singleResult[index];

            if (Array.isArray(value)) {
                value = Object.fromEntries(value);
            }

            if (value.labels && value.labels.length === 1) {
                value.labels = value.labels[0];
            }

            if (value.properties && Array.isArray(value.properties)) {
                value.properties = Object.fromEntries(value.properties);
            }

            try {
                return [name, JSON.parse(value)];
            } catch (error) {
                return [name, value];
            }
        });

        return Object.fromEntries(columns);
    }

    loadGraph(containerID: string, timestamp?: string, ttl?: number): Promise<string> {
        return this.loader.generateRedisGraph(containerID, timestamp, ttl);
    }

    async queryGraph(containerID: string, query: Query, timestamp?: string): Promise<Result<any>> {
        const keyTimestamp = timestamp || 'default';
        let key = `${containerID}-${keyTimestamp}`;

        await this._redis
            .exists(key)
            .then(async (result) => {
                if (result === 0) {
                    // graph for this container and timestamp combination has not been created, create it
                    const loader = await RedisGraphService.GetInstance();
                    key = await loader.loadGraph(containerID, timestamp);
                }
            })
            .catch((e) => console.log(e));

        try {
            const result = await this._redis.call('GRAPH.RO_QUERY', key, query.query);
            return Promise.resolve(Result.Success(result));
        } catch (e: any) {
            return Promise.resolve(Result.Failure(e.toString()));
        }
    }
}
