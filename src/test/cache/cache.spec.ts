/* tslint:disable */
import {expect} from 'chai'
import {MemoryCacheImpl, RedisCacheImpl} from "../../services/cache/cache"

describe('Memory Cache implementation can', async() => {
    it('save an item to the cache', async()=> {
        const cache = new MemoryCacheImpl()

        const testObject = {
           test: "test",
           number: 1
        }

        const set = await cache.set("test object", testObject, 1000)
        expect(set).true
    });

    it('retrieve an item from the cache', async()=> {
        const cache = new MemoryCacheImpl()

        const testObject = {
            test: "test",
            number: 1
        }

        const set = await cache.set("test object", testObject, 1000)
        expect(set).true

        const retrieved = await cache.get<any>("test object")

        expect(retrieved).not.undefined
        expect(retrieved).to.include(testObject)
    });


    it('remove an item from the cache', async()=> {
        const cache = new MemoryCacheImpl()

        const testObject = {
            test: "test",
            number: 1
        }

        const set = await cache.set("test object", testObject, 1000)
        expect(set).true

        let retrieved = await cache.get<any>("test object")

        expect(retrieved).not.undefined
        expect(retrieved).to.include(testObject)

        const deleted = await cache.del("test object")
        expect(deleted).true

        retrieved = await cache.get<any>("test object")
        expect(retrieved).undefined
    });

});

describe('Redis cache implementation can', async() => {
    it('save an item to the cache', async()=> {
        const cache = new RedisCacheImpl()

        const testObject = {
            test: "test",
            number: 1
        }

        const set = await cache.set("test object", testObject, 1000)
        expect(set).true
    });

    it('retrieve an item from the cache', async()=> {
        const cache = new RedisCacheImpl()

        const testObject = {
            test: "test",
            number: 1
        }

        const set = await cache.set("test object", testObject, 1000)
        expect(set).true

        const retrieved = await cache.get<any>("test object")

        expect(retrieved).not.undefined
        expect(retrieved).to.include(testObject)

        const notExist = await cache.get<any>("fails")

        expect(notExist).undefined
    });


    it('remove an item from the cache', async()=> {
        const cache = new RedisCacheImpl()

        const testObject = {
            test: "test",
            number: 1
        }

        const set = await cache.set("test object", testObject, 1000)
        expect(set).true

        let retrieved = await cache.get<any>("test object")

        expect(retrieved).not.undefined
        expect(retrieved).to.include(testObject)

        const deleted = await cache.del("test object")
        expect(deleted).true

        retrieved = await cache.get<any>("test object")
        expect(retrieved).undefined
    });

});
