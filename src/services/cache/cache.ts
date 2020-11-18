const NodeCache = require("node-cache")
import Config from "../../config"

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

            default: {
                this.cache = new MemoryCacheImpl()
                break;
            }
        }
    }
}

export interface CacheInterface {
    set(key: string, val: any, ttl?: number): boolean
    get<T>(key: string): T | undefined
}

export class MemoryCacheImpl implements CacheInterface {
    private _cache: any
    get<T>(key: string): T | undefined {
        const value = this._cache.get(key)

        if(undefined) return undefined

        return value
    }

    set(key: string, val: any, ttl?: number): boolean {
        return this._cache.set(key, val, ttl)
    }

    constructor() {
        this._cache = new NodeCache()
    }
}

export default Cache.Instance.cache
