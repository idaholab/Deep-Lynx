// This is the entry-point for the application.
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
                name: 'export', // will run export.ts
                interval: Config.export_data_interval, // exports take longer to process, more time in-between instances is needed
            },
            {
                name: 'data_source_emitter', // will run data_source_emitter.js - puts data sources on queue to run
                interval: '1m',
                timeout: '1m',
            },
            /*      {
                name: 'data_target_emitter', // will run data_target_emitter.ts - puts data targets on queue to run
                interval: '30s',
                timeout: 0,
            },*/
            {
                name: 'data_staging_emitter', // will run data_staging_emitter on an infinite loop
                interval: Config.emitter_interval,
                timeout: '1m',
            },
            {
                name: 'edge_queue_emitter', // will run edge_queue_emitter on an infinite loop
                interval: Config.emitter_interval,
                timeout: '1m',
            },
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
            {
                name: 'staging_clean', // will run staging_clean.ts
                interval: '1 day',
            },
            {
                name: 'materialized_view_refresh', // will run staging_clean.ts
                interval: '1m',
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
