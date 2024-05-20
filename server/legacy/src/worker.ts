import BackedLogger from './services/logger';
import Config from './services/config';
import Cache from './services/cache/cache';
const path = require('path');
import Bree from 'bree';
const Graceful = require('@ladjs/graceful');
import 'reflect-metadata';

process.on('unhandledRejection', (reason, promise) => {
    BackedLogger.error(`Unhandled rejection at ${JSON.stringify(promise)} reason: ${reason}`);
    process.exit(1);
});

async function Start(): Promise<any> {
    void Cache.flush();

    // Bree is a job runner that allows us to start and schedule independent processes across threads
    // We use it primarily for data processing and mapping, as those cpu heavy tasks tend to block the
    // main execution thread frequently
    const bree = new Bree({
        logger: Config.log_jobs ? BackedLogger.logger : false,
        root: path.resolve('dist/jobs'),
        jobs: [
            {
                name: 'data_source_process',
                interval: '1m',
                timeout: 0,
            },
            {
                name: 'import_process',
                interval: '1m',
                timeout: 0,
            },
            {
                name: 'export', // will run export.ts
                interval: Config.export_data_interval, // exports take longer to process, more time in-between instances is needed
            },
            {
                name: 'staging_clean', // will run staging_clean.ts
                interval: '1 day',
            },
            {
                name: 'metatype_keys_refresh', // will run metatype_keys_refresh.ts
                interval: '1m',
            },
            {
                name: 'metatype_pairs_refresh', // will run metatype_pairs_refresh.js
                interval: '1m',
                timeout: 0,
            },
        ],
    });

    const graceful = new Graceful({brees: [bree]});
    graceful.listen();

    await bree.start();

    // eslint-disable-next-line no-bitwise,@typescript-eslint/no-empty-function,no-empty-function
    setInterval(() => {}, 1 << 30);
}

void Start();
