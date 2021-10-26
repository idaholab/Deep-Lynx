// Boot is where systems like the API server, data service layer etc. should be
// initialized and any required interfaces be implemented. This is also the
// entry-point for the application.
import {Server} from './http_server/server';
import BackedLogger from './services/logger';
import Config from './services/config';
const {spawn} = require('child_process');
const path = require('path');
import Bree from 'bree';
const Graceful = require('@ladjs/graceful');
import 'reflect-metadata';
import UserRepository from './data_access_layer/repositories/access_management/user_repository';
import PostgresAdapter from './data_access_layer/mappers/db_adapters/postgres/postgres';

const postgresAdapter = PostgresAdapter.Instance;

void postgresAdapter.init().then(() => {
    // Start Event System - we could convert this to a Bree job, but there is no point in doing so as we want this
    // constantly running, not on an interval. This is still the easiest way to make sure it doesn't pollute the main
    // thread.
    const eventSystem = spawn('node', [`${Config.project_dir}/domain_objects/event_system/event_system_boot.js`]);

    // we want the stdout and stderr output of the function to combine logging
    eventSystem.stdout.on('data', (data: any) => {
        console.log(data.toString().trim());
    });

    eventSystem.stderr.on('data', (data: any) => {
        console.log(data.toString().trim());
    });

    // Bree is a job runner that allows us to start and schedule independent processes across threads
    // We use it primarily for data processing and mapping, as those cpu heavy tasks tend to block the
    // main execution thread frequently
    const bree = new Bree({
        logger: BackedLogger.logger,
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
                interval: Config.data_source_interval, // exports take longer to process, more time in-between instances is needed
            },
            {
                name: 'orphan_edge_linker', // will run orphan_edge_linker.js
                interval: Config.edge_linker_interval,
            },
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

    Server.Instance.startServer(BackedLogger);
});
