// This is the entry-point for the application.
import {Server} from './http_server/server';
import BackedLogger from './services/logger';
import Config from './services/config';
import {Cache} from './services/cache/cache';
const path = require('path');
import Bree from 'bree';
const Graceful = require('@ladjs/graceful');
import 'reflect-metadata';
import UserRepository from './data_access_layer/repositories/access_management/user_repository';
import PostgresAdapter from './data_access_layer/mappers/db_adapters/postgres/postgres';
import OAuthRepository from './data_access_layer/repositories/access_management/oauth_repository';
import {Migrator} from './data_access_layer/migrate';

process.on('unhandledRejection', (reason, promise) => {
    BackedLogger.error(`Unhandled rejection at ${promise} reason: ${reason}`);
    process.exit(1);
});

const postgresAdapter = PostgresAdapter.Instance;

async function Start(): Promise<any> {
    await postgresAdapter.init();
    const migrator = new Migrator();
    await migrator.Run();

    void Cache.Instance.cache.flush();

    if (Config.run_jobs) {
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
                    timeout: 0,
                },
                /*      {
                name: 'data_target_emitter', // will run data_target_emitter.ts - puts data targets on queue to run
                interval: '30s',
                timeout: 0,
            },*/
                {
                    name: 'data_staging_emitter', // will run data_staging_emitter on an infinite loop
                    interval: '1m',
                    timeout: 0,
                },
                {
                    name: 'edge_queue_emitter', // will run edge_queue_emitter on an infinite loop
                    interval: Config.emitter_interval,
                    timeout: 0,
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
                    timeout: 0,
                },
                {
                    name: 'staging_clean', // will run staging_clean.ts
                    interval: '1 day',
                    timeout: 0,
                },
            ],
        });

        const graceful = new Graceful({brees: [bree]});
        graceful.listen();

        await bree.start();

        Cache.Instance.on('deleted', (key) => {
            bree.workers.forEach((worker) => {
                worker.postMessage(`deleted|${key}`);
            });
        });

        Cache.Instance.on('flush', () => {
            bree.workers.forEach((worker) => {
                worker.postMessage(`flush`);
            });
        });
    }

    // if enabled, create an initial SuperUser for easier system management
    // if SAML is configured, the initial SAML user will be assigned admin status
    // if this superuser hasn't been created
    if (Config.initial_super_user) {
        const userRepo = new UserRepository();
        void userRepo.createDefaultSuperUser();
    }

    if (Config.vue_app_id !== '') {
        const oauthRepo = new OAuthRepository();
        void oauthRepo.createDefaultApplication(Config.vue_app_id);
    }

    Server.Instance.startServer(BackedLogger);

    return Promise.resolve();
}

void Start();
