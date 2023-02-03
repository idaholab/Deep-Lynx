import {expect} from 'chai';
import {MemoryCacheImpl, RedisCacheImpl} from '../../../services/cache/cache';
import Logger from '../../../services/logger';
import EventEmitter from 'events';

const emptyEmitter = new EventEmitter();

describe('Memory Cache implementation can', async () => {
    it('save an item to the cache', async () => {
        const cache = new MemoryCacheImpl(emptyEmitter);

        const testObject = {
            test: 'test',
            number: 1,
        };

        const set = await cache.set('test object', testObject, 1000);
        expect(set).true;
    });

    it('retrieve an item from the cache', async () => {
        const cache = new MemoryCacheImpl(emptyEmitter);

        const testObject = {
            test: 'test',
            number: 1,
        };

        const set = await cache.set('test object', testObject, 1000);
        expect(set).true;

        const retrieved = await cache.get<any>('test object');

        expect(retrieved).not.undefined;
        expect(retrieved).to.include(testObject);
    });

    it('remove an item from the cache', async () => {
        const cache = new MemoryCacheImpl(emptyEmitter);

        const testObject = {
            test: 'test',
            number: 1,
        };

        const set = await cache.set('test object', testObject, 1000);
        expect(set).true;

        let retrieved = await cache.get<any>('test object');

        expect(retrieved).not.undefined;
        expect(retrieved).to.include(testObject);

        const deleted = await cache.del('test object');
        expect(deleted).true;

        retrieved = await cache.get<any>('test object');
        expect(retrieved).undefined;
    });

    it('flush the entire cache when pattern is called', async () => {
        // memory cache will flush entire cache instead of pattern matching when 'byPattern' is called
        const cache = new MemoryCacheImpl(emptyEmitter);

        const testKeys = [
            {
                metatypeID: 1,
                test: 'test',
                keyID: 1,
            },
            {
                metatypeID: 1,
                test: 'test',
                keyID: 2,
            },
            {
                metatypeID: 2,
                test: 'test',
                keyID: 3,
            }
        ]

        testKeys.forEach(async (key) => {
            const set = await cache.set(`metatypes:${key.metatypeID}:keys:${key.keyID}`, key, 1000);
            expect(set).true;
        });

        // this should flush the entire cache- regardless of the pattern supplied
        const flushed = await cache.flushByPattern(`metatypes:${testKeys[0].metatypeID}:keys:*`);
        expect(flushed).true;

        // test to ensure that no keys are retrieved
        testKeys.forEach(async (key) => {
            const retrieved = await cache.get<any>(`metatypes:${key.metatypeID}:keys:${key.keyID}`);
            expect(retrieved).undefined;
        });
    })
});

describe('Redis cache implementation can', async () => {
    before(function () {
        if (process.env.CACHE_REDIS_CONNECTION_STRING === '') {
            Logger.debug('skipping redis tests, no redis instance configured');
            this.skip();
        }
    });

    it('save an item to the cache', async () => {
        const cache = new RedisCacheImpl(emptyEmitter);

        const testObject = {
            test: 'test',
            number: 1,
        };

        const set = await cache.set('test object', testObject, 1000);
        expect(set).true;
    });

    it('retrieve an item from the cache', async () => {
        const cache = new RedisCacheImpl(emptyEmitter);

        const testObject = {
            test: 'test',
            number: 1,
        };

        const set = await cache.set('test object', testObject, 1000);
        expect(set).true;

        const retrieved = await cache.get<any>('test object');

        expect(retrieved).not.undefined;
        expect(retrieved).to.include(testObject);

        const notExist = await cache.get<any>('fails');

        expect(notExist).undefined;
    });

    it('remove an item from the cache', async () => {
        const cache = new RedisCacheImpl(emptyEmitter);

        const testObject = {
            test: 'test',
            number: 1,
        };

        const set = await cache.set('test object', testObject, 1000);
        expect(set).true;

        let retrieved = await cache.get<any>('test object');

        expect(retrieved).not.undefined;
        expect(retrieved).to.include(testObject);

        const deleted = await cache.del('test object');
        expect(deleted).true;

        retrieved = await cache.get<any>('test object');
        expect(retrieved).undefined;
    });

    it('remove an item based on pattern', async () => {
            const cache = new RedisCacheImpl(emptyEmitter);

            const testKeys = [
                {
                    metatypeID: 1,
                    test: 'test',
                    keyID: 1,
                },
                {
                    metatypeID: 1,
                    test: 'test',
                    keyID: 2,
                },
                {
                    metatypeID: 2,
                    test: 'test',
                    keyID: 3,
                }
            ]

            testKeys.forEach(async (key) => {
                const set = await cache.set(`metatypes:${key.metatypeID}:keys:${key.keyID}`, key, 1000);
                expect(set).true;
            });

            // this should delete the first two keys, but not the third one since it belongs to a different metatype
            const flushed = await cache.flushByPattern(`metatypes:${testKeys[0].metatypeID}:keys:*`)
            expect(flushed).true;

            // test to ensure we can't retrieve the first two keys, but we can retrieve the third one
            let retrieved = await cache.get<any>(`metatypes:${testKeys[0].metatypeID}:keys:${testKeys[0].keyID}`);
            expect(retrieved).undefined;

            retrieved = await cache.get<any>(`metatypes:${testKeys[1].metatypeID}:keys:${testKeys[1].keyID}`);
            expect(retrieved).undefined;

            retrieved = await cache.get<any>(`metatypes:${testKeys[2].metatypeID}:keys:${testKeys[2].keyID}`);
            expect(retrieved).not.undefined;
            expect(retrieved).to.include(testKeys[2]);

            // delete the third key to clean up
            return cache.del(`metatypes:${testKeys[2].metatypeID}:keys:${testKeys[2].keyID}`)
        })
});
