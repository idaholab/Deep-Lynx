/* eslint-disable security/detect-object-injection */
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

async function loadContainers(containerImportMap: {[key: string]: Import[]}): Promise<void> {
    // we know the Postgres adapter has been initiated by the time this is called
    // we _should_ be able to load all the imports into memory because this job is running often enough
    const importsResult = await ImportMapper.Instance.ListWithUninsertedData();

    if (importsResult.isError) {
        Logger.error(`unexpected error in import processing thread ${JSON.stringify(importsResult.error)}`);
        if (parentPort) parentPort.postMessage('done');
        else {
            process.exit(1);
        }
        return;
    }

    // remember that objects are pass by reference, so we don't need to return anything as we're modifying the original object
    importsResult.value.forEach((i) =>
        containerImportMap[i.container_id!] ? containerImportMap[i.container_id!].push(i) : (containerImportMap[i.container_id!] = [i]),
    );
}

async function Start(): Promise<void> {
    await postgresAdapter.init();

    const containerImportMap: {[key: string]: Import[]} = {};

    // initial call out to the loadContainers function
    await loadContainers(containerImportMap);

    // a simple worker pattern to keep our worker pool from not swamping the cpu
    const MAX_WORKERS = os.availableParallelism();
    const workers: Worker[] = new Array(MAX_WORKERS);

    // if no containers exit
    if (Object.keys(containerImportMap).length === 0)
        if (parentPort) {
            parentPort.postMessage('done');
            return;
        } else {
            process.exit(0);
        }

    for (let i = 0; i < workers.length; i++) {
        if (Object.keys(containerImportMap).length > 0) {
            const containerID = Object.keys(containerImportMap)[0];
            const importIDs = Object.values(containerImportMap)[0].map((i) => i.id);

            workers[i] = new Worker(__dirname + '/process_worker.js', {
                workerData: {
                    input: {
                        importIDs,
                        containerID,
                    },
                },
            });

            // this exit function allows us to keep the workers going as long as there is data to process for containers
            // while not stepping on the toes of any other container being processed elsewhere - it's recursive OoooooOO
            const exitFunc = (containerID: string): (() => void) => {
                return () => {
                    // eslint-disable-next-line security/detect-object-injection
                    delete containerImportMap[containerID];

                    loadContainers(containerImportMap)
                        .catch((e) => {
                            Logger.error(`unable to list more imports in import process ${JSON.stringify(e)}`);
                        })
                        .finally(() => {
                            if (Object.keys(containerImportMap).length > 0) {
                                const nextContainerID = Object.keys(containerImportMap)[0];
                                const nextImportIDs = Object.values(containerImportMap)[0].map((i) => i.id);

                                workers[i] = new Worker(__dirname + '/process_worker.js', {
                                    workerData: {
                                        input: {
                                            importIDs: nextImportIDs,
                                            containerID: nextContainerID,
                                        },
                                    },
                                });

                                workers[i].on('exit', exitFunc(nextContainerID));
                            } else {
                                process.exit(0);
                            }
                        });
                };
            };

            workers[i].on('exit', exitFunc);
        }
    }
}

void Start();
