// we've created a standalone loop for the Data Export Loop so as to maximize
// system resources. The main loop of Deep Lynx will spawn this process
import {Storage} from "./boot_storage";
import Logger from "./services/logger";
import ExporterRepository from "./data_access_layer/repositories/data_warehouse/export/export_repository";
import {SuperUser} from "./access_management/user";

const storage = new Storage()

storage.boot()
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
