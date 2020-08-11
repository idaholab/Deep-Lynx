// Boot is where systems like the API server, data service layer etc. should be
// initialized and any required interfaces be implemented. This is also the
// entry-point for the application.
import { Server } from "./api/server";
import {Storage} from "./boot_storage";
import BackedLogger from "./logger";
import {RestartExports} from "./data_exporting/exporter";
import {StartDataSourcePolling} from "./data_importing/data_source";
import {StartDataProcessing} from "./data_processing/processing";
import Config from "./config"
import {CreateDefaultSuperUser} from "./user_management/users";


const storage = new Storage();

storage.boot()
    .then(() => {
        // Restart any data exports that were running pre-shutdown
        // this logic might make sense somewhere else
        RestartExports();

        // Start the proactive data sources, e.g the HTTP poller data source type
        StartDataSourcePolling();

        // Start Data Processing loop
        StartDataProcessing()

        // if enabled, create an initial SuperUser for easier system management
        // if SAML is configured, the initial SAML user will be assigned admin status
        if(Config.initial_super_user) {
                CreateDefaultSuperUser();
        }

        Server.Instance.startServer(BackedLogger)
    });
