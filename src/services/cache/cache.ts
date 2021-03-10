const NodeCache = require("node-cache")
const Redis = require("ioredis")
// @ts-ignore
import {RedisStatic} from "ioredis";
import Config from "../../config"
import Logger from "../../logger"

class Cache {
    public cache: CacheInterface
    private static instance: Cache

    public static get Instance(): Cache {
        if(!Cache.instance) {
            Cache.instance = new Cache()
        }

        return Cache.instance
    }

    constructor() {
        switch(Config.cache_provider) {
            case "memory": {
                this.cache = new MemoryCacheImpl()
                break;
            }

            case "redis": {
                this.cache = new RedisCacheImpl()
                break;
            }

            default: {
                this.cache = new MemoryCacheImpl()
                break;
            }
        }
    }
}

export interface CacheInterface {
    set(key: string, val: any, ttl?: number): Promise<boolean>
    del(key: string): Promise<boolean>
    get<T>(key: string): Promise<T | undefined>
}

export class MemoryCacheImpl implements CacheInterface {
    private _cache: any
    get<T>(key: string): Promise<T | undefined> {
        const value = this._cache.get(key)

        if(!value) return new Promise(resolve => resolve(undefined))

        try {
            const parsed = JSON.parse(value)
            return new Promise(resolve => resolve(parsed as T))
        } catch {
            return new Promise(resolve => resolve(value as T))
        }
    }

    set(key: string, val: any, ttl?: number): Promise<boolean> {
        return new Promise(resolve => resolve(this._cache.set(key, val, ttl)))
    }

    del(key: string): Promise<boolean> {
        const deleted = this._cache.del(key)
        if(deleted !== 1 && deleted !== 0) {
            Logger.error(`error deleting value from memory: ${deleted}`)
            return new Promise(resolve => resolve(false))
        }

        return new Promise(resolve => resolve(true))
    }

    constructor() {
        this._cache = new NodeCache()
    }
}

export class RedisCacheImpl implements CacheInterface {
    private _redis: RedisStatic
    async get<T>(key: string): Promise<T | undefined> {
        const val = await this._redis.get(key)

        if(val === null) {
            return new Promise(resolve => resolve(undefined))
        }

        return new Promise(resolve => resolve(JSON.parse(val) as T))
    }

    async set(key: string, val: any, ttl?: number): Promise<boolean> {
        let set: string

        if(ttl) {
            set = await this._redis.set(key, JSON.stringify(val), "EX", ttl)
        } else {
            set = await this._redis.set(key, JSON.stringify(val))
        }

        if(set !== "OK") {
            Logger.error(`error inserting value into redis: ${set}`)
            return new Promise(resolve => resolve(false))
        }

        return new Promise(resolve => resolve(true))
    }

    async del(key: string): Promise<boolean> {
        const deleted = await this._redis.del(key)

        // returns 1 if deleted, 0 if key doesn't exist - we won't error out on
        // attempting to delete a non-existent key
        if(deleted !== 1 && deleted !== 0) {
            Logger.error(`error deleting value from redis: ${deleted}`)
            return new Promise(resolve => resolve(false))
        }

        return new Promise(resolve => resolve(true))
    }

    constructor() {
        this._redis = new Redis(Config.redis_connection_string)
    }

}

export default Cache.Instance.cache
