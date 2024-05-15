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
    const importsResult = await ImportMapper.Instance.ListWithUninsertedData();

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

    for (let i = 0; i < workers.length; i++) {
        if (containerIDs.length > 0) {
            const containerID = containerIDs.pop();

            workers[i] = new Worker(__dirname + '/process_worker.js', {
                workerData: {
                    input: containerImportMap[containerID!].map((i) => i.id),
                },
            });

            workers[i].on('exit', () => {
                if (containerIDs.length > 0) {
                    const nextContainerID = containerIDs.pop();

                    workers[i] = new Worker(__dirname + '/process_worker.js', {
                        workerData: {
                            input: containerImportMap[nextContainerID!].map((i) => i.id),
                        },
                    });
                }
            });
        }
    }
}

void Start();
