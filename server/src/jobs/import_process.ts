/*
  Standalone loop for processing imports
 */
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import Logger from '../services/logger';
import Cache from '../services/cache/cache';
import Config from '../services/config';
import {parentPort, Worker} from 'worker_threads';
import ImportMapper from '../data_access_layer/mappers/data_warehouse/import/import_mapper';
import Import from '../domain_objects/data_warehouse/import/import';
const os = require('node:os');
process.setMaxListeners(0);

const postgresAdapter = PostgresAdapter.Instance;

// handle cache clears from parent IF memory cache
if (Config.cache_provider === 'memory') {
    parentPort?.on('message', (message: any) => {
        const parts: string[] = message.split('|');
        // if a two part message it's a deleted key
        if (parts.length === 2 && parts[0] === 'deleted') {
            void Cache.del(parts[1]);
        }

        if (parts.length === 1 && parts[0] === 'flush') {
            void Cache.flush();
        }
    });
}

async function Start(): Promise<void> {
    await postgresAdapter.init();

    // we _should_ be able to load all the imports into memory because this job is running often enough
    const importsResult = await ImportMapper.Instance.ListWithUninsertedDataLock();

    if (importsResult.isError) {
        Logger.error(`unexpected error in import processing thread ${JSON.stringify(importsResult.error)}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(1);
        }
        return;
    }

    const containerImportMap: {[key: string]: Import[]} = {};

    importsResult.value.forEach((i) =>
        containerImportMap[i.container_id!] ? containerImportMap[i.container_id!].push(i) : (containerImportMap[i.container_id!] = [i]),
    );

    // a simple worker pattern to keep our worker pool from not swamping the cpu
    const MAX_WORKERS = os.availableParallelism();
    const workers: Worker[] = new Array(MAX_WORKERS);
    const containerIDs = Object.keys(containerImportMap);
    const incompleteContainerIDs: any[] = [];

    // if no containers exit
    if (containerIDs.length === 0)
        if (parentPort) {
            parentPort.postMessage('done');
            return;
        } else {
            process.exit(0);
        }

    for (let i = 0; i < workers.length; i++) {
        if (containerIDs.length > 0) {
            const containerID = containerIDs.pop();
            incompleteContainerIDs.push(containerID);

            workers[i] = new Worker(__dirname + '/process_worker.js', {
                workerData: {
                    input: {
                        importIDs: containerImportMap[containerID!].map((i) => i.id),
                        containerID: containerID!,
                    },
                },
            });

            // this exit function allows us to keep the workers going as long as there is data to process for containers
            // while not stepping on the toes of any other container being processed elsewhere - it's recursive OoooooOO
            const exitFunc = () => {
                delete containerImportMap[containerID!];
                // we don't care about the ids, just if it's empty
                incompleteContainerIDs.pop();

                ImportMapper.Instance.ListWithUninsertedDataLock(undefined, containerIDs)
                    .then((result) => {
                        if (result.isError) {
                            Logger.error(`unable to list more imports in import process ${JSON.stringify(result.error)}`);
                            return;
                        }

                        if (result.value.length > 0) {
                            for (const j of result.value) {
                                containerImportMap[j.container_id!] ? containerImportMap[j.container_id!].push(j) : (containerImportMap[j.container_id!] = [j]);
                            }

                            containerIDs.push(...Object.keys(containerImportMap));
                        }
                    })
                    .catch((e) => {
                        Logger.error(`unable to list more imports in import process ${JSON.stringify(e)}`);
                    })
                    .finally(() => {
                        if (containerIDs.length > 0) {
                            const nextContainerID = containerIDs.pop();
                            if (nextContainerID && containerImportMap[nextContainerID]) {
                                incompleteContainerIDs.push(nextContainerID);

                                workers[i] = new Worker(__dirname + '/process_worker.js', {
                                    workerData: {
                                        input: {
                                            importIDs: containerImportMap[nextContainerID].map((i) => i.id),
                                            containerID: nextContainerID,
                                        },
                                    },
                                });

                                workers[i].on('exit', exitFunc);
                            }
                        }

                        if (incompleteContainerIDs.length === 0) {
                            process.exit(0);
                        }
                    });
            };

            workers[i].on('exit', exitFunc);
        }
    }
}

void Start();
