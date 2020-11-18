/* tslint:disable */
import {expect} from 'chai'
import {MemoryCacheImpl}from "../../services/cache/cache"

describe('Memory Caching can', async() => {
    it('save an item to the cache', async()=> {
        const cache = new MemoryCacheImpl()

        const testObject = {
           test: "test",
           number: 1
        }

        expect(cache.set("test object", testObject, 1000)).true
    });

    it('retrieve an item from the cache', async()=> {
        const cache = new MemoryCacheImpl()

        const testObject = {
            test: "test",
            number: 1
        }

        expect(cache.set("test object", testObject, 1000)).true

        const retrieved = cache.get<any>("test object")

        expect(retrieved).not.undefined
        expect(retrieved).to.include(testObject)
    });

});
