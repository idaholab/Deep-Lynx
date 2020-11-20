// Boot is where systems like the API server, data service layer etc. should be
// initialized and any required interfaces be implemented. This is also the
// entry-point for the application.
import { Server } from "./api/server";
import {Storage} from "./boot_storage";
import BackedLogger from "./logger";
import Config from "./config"
import {CreateDefaultSuperUser} from "./user_management/users";
const {spawn} = require('child_process')


const storage = new Storage();

storage.boot()
    .then(() => {
        // Restart any data exports that were running pre-shutdown
        // this logic might make sense somewhere else
        const dataExport = spawn('node', [`${Config.project_dir}/data_exports.js`])

        // we want the stdout and stderr output of the function to combine logging
        dataExport.stdout.on('data', (data: any) => {
            console.log(data.toString().trim())
        })

        dataExport.stderr.on('data', (data: any) => {
            console.log(data.toString().trim())
        })

        // Start the proactive data sources, e.g the HTTP poller data source type
        const dataSourcePolling = spawn('node', [`${Config.project_dir}/data_polling.js`])
        // we want the stdout and stderr output of the function to combine logging
        dataSourcePolling.stdout.on('data', (data: any) => {
                console.log(data.toString().trim())
        })

        dataSourcePolling.stderr.on('data', (data: any) => {
                console.log(data.toString().trim())
        })


        // Start Data Processing loop
        const dataProcessing = spawn('node', [`${Config.project_dir}/data_processing.js`])

        // we want the stdout and stderr output of the function to combine logging
        dataProcessing.stdout.on('data', (data: any) => {
               console.log(data.toString().trim())
        })

        dataProcessing.stderr.on('data', (data: any) => {
                console.log(data.toString().trim())
        })

        // if enabled, create an initial SuperUser for easier system management
        // if SAML is configured, the initial SAML user will be assigned admin status
        if(Config.initial_super_user) {
                CreateDefaultSuperUser();
        }

        Server.Instance.startServer(BackedLogger)
    });
