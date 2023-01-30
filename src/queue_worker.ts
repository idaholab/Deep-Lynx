import BackedLogger from './services/logger';
import Config from './services/config';
import Cache from './services/cache/cache';
const path = require('path');
import Bree from 'bree';
const Graceful = require('@ladjs/graceful');
import 'reflect-metadata';

process.on('unhandledRejection', (reason, promise) => {
    BackedLogger.error(`Unhandled rejection at ${promise} reason: ${reason}`);
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
                name: 'events_queue', // will run events_queue.ts - a never ending processing of the events queue
                interval: '1m',
                timeout: 0,
            },
            {
                name: 'processing_queue', // will run processing_queue.ts
                interval: '1m',
                timeout: 0,
            },
            {
                name: 'data_source_queue', // will run data_source_queue.ts
                interval: '1m',
                timeout: 0,
            },
            /*      {
                name: 'data_target_queue', // will run data_target_queue.ts
                interval: '1m',
                timeout: 0,
            },*/
            {
                name: 'edge_item_queue', // will run edge_item_queue.js
                interval: '1m',
                timeout: '1m',
            },
        ],
    });

    const graceful = new Graceful({brees: [bree]});
    graceful.listen();

    await bree.start();

    // eslint-disable-next-line no-bitwise,@typescript-eslint/no-empty-function
    setInterval(() => {}, 1 << 30);
}

void Start();