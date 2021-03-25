// Boot is where systems like the API server, data service layer etc. should be
// initialized and any required interfaces be implemented. This is also the
// entry-point for the application.
import { Server } from "./http_server/server";
import BackedLogger from "./services/logger";
import Config from "./services/config"
const {spawn} = require('child_process')
import 'reflect-metadata';
import UserRepository from "./data_access_layer/repositories/access_management/user_repository";
import PostgresAdapter from "./data_access_layer/mappers/db_adapters/postgres/postgres";

const postgresAdapter = PostgresAdapter.Instance

postgresAdapter.init()
    .then(() => {
        // Restart any data exports that were running pre-shutdown
        // this logic might make sense somewhere else
        const dataExport = spawn('node', [`${Config.project_dir}/data_access_layer/repositories/data_warehouse/export/boot_exporters.js`])

        // we want the stdout and stderr output of the function to combine logging
        dataExport.stdout.on('data', (data: any) => {
            console.log(data.toString().trim())
        })

        dataExport.stderr.on('data', (data: any) => {
            console.log(data.toString().trim())
        })

        // Start Data Processing loop
        const dataProcessing = spawn('node', [`${Config.project_dir}/data_access_layer/repositories/data_warehouse/import/boot_data_source_processing.js`])

        // we want the stdout and stderr output of the function to combine logging
        dataProcessing.stdout.on('data', (data: any) => {
            console.log(data.toString().trim())
        })

        dataProcessing.stderr.on('data', (data: any) => {
            console.log(data.toString().trim())
        })

        // Start Event System
        const eventSystem = spawn('node', [`${Config.project_dir}/event_system/event_system_boot.js`])

        // we want the stdout and stderr output of the function to combine logging
        eventSystem.stdout.on('data', (data: any) => {
            console.log(data.toString().trim())
        })

        eventSystem.stderr.on('data', (data: any) => {
            console.log(data.toString().trim())
        })

        // if enabled, create an initial SuperUser for easier system management
        // if SAML is configured, the initial SAML user will be assigned admin status
        if(Config.initial_super_user) {
            const userRepo = new UserRepository()
            userRepo.createDefaultSuperUser()
        }

        Server.Instance.startServer(BackedLogger)
    });
