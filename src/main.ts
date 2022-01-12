// This is the entry-point for the application.
import {Server} from './http_server/server';
import BackedLogger from './services/logger';
import Config from './services/config';
const path = require('path');
import Bree from 'bree';
const Graceful = require('@ladjs/graceful');
import 'reflect-metadata';
import UserRepository from './data_access_layer/repositories/access_management/user_repository';
import PostgresAdapter from './data_access_layer/mappers/db_adapters/postgres/postgres';
import OAuthRepository from './data_access_layer/repositories/access_management/oauth_repository';

const postgresAdapter = PostgresAdapter.Instance;

void postgresAdapter.init().then(() => {

    // Bree is a job runner that allows us to start and schedule independent processes across threads
    // We use it primarily for data processing and mapping, as those cpu heavy tasks tend to block the
    // main execution thread frequently
    const bree = new Bree({
        logger: Config.log_level.toLowerCase() === 'debug' ? BackedLogger.logger : false,
        root: path.resolve('dist/jobs'),
        jobs: [
            {
                name: 'data_source_processing', // will run data_source_processing.js
                interval: Config.data_source_interval,
            },
            {
                name: 'export', // will run export.js
                interval: Config.export_data_interval, // exports take longer to process, more time in-between instances is needed
            },
            {
                name: 'data_staging_mapping', // will run data_staging_mapping.js
                interval: Config.data_source_interval,
            },
            {
                name: 'orphan_edge_linker', // will run orphan_edge_linker.js
                interval: Config.edge_linker_interval,
            },
            {
                name: 'event', // will run event.js
                interval: Config.event_processing_interval
            },
            // the below is commented out because there isn't anything actually using
            // that queue yet - this is to demonstrate how one would go about consuming
            // a given queue
            /*
            {
                name: 'processing_queue', // will run processing_queue.js exactly one time
            },
           */
        ],
    });

    const graceful = new Graceful({brees: [bree]});
    graceful.listen();

    bree.start();

    // if enabled, create an initial SuperUser for easier system management
    // if SAML is configured, the initial SAML user will be assigned admin status
    // if this super user hasn't been created
    if (Config.initial_super_user) {
        const userRepo = new UserRepository();
        void userRepo.createDefaultSuperUser();
    }

    if (Config.vue_app_id !== '') {
        const oauthRepo = new OAuthRepository();
        void oauthRepo.createDefaultApplication(Config.vue_app_id);
    }

    Server.Instance.startServer(BackedLogger);
});
