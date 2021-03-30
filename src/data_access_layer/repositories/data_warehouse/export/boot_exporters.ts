/*
 Standalone loop for the Data Export Loop so as to maximize system resources.
 The main loop of Deep Lynx will spawn this process. This process should restart
 any exports that were in the process of running when Deep Lynx shut down. The actual
 implementation of the exporter uses database locks to insure that you can run
 as many instances of this process as you'd like and not have data duplication issues
*/
import Logger from "../../../../services/logger";
import ExporterRepository from "./export_repository";
import {SuperUser} from "../../../../access_management/user";
import PostgresAdapter from "../../../mappers/db_adapters/postgres/postgres";

const postgresAdapter = PostgresAdapter.Instance

postgresAdapter.init()
    .then(() => {
        Logger.debug('restarting exports that were processing before shutdown or interruption');
        const exporterRepo = new ExporterRepository()

        exporterRepo.where().status("eq", "processing").list()
            .then(exporters => {
                if(exporters.isError) Logger.error(`unable to list exporters ${exporters.error?.error}`)

                for(const exporter of exporters.value) {
                    if(exporter){
                        exporter.Restart(SuperUser)
                            .then(started => {
                                if(started.isError) Logger.error(`unable to start exporter ${started.error?.error}`)
                            })
                            .catch(e => Logger.error(`unable to start exporter ${e}`))
                    }
                }
            })
            .catch(e => Logger.error(`unable to restart exports ${e}`))
    })
