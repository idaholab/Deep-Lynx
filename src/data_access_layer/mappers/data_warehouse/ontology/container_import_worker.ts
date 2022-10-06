import {parentPort, workerData} from 'worker_threads';
import PostgresAdapter from '../../db_adapters/postgres/postgres';
import ContainerImport from './container_import';
import Logger from '../../../../services/logger';

const importer = ContainerImport.Instance;

void PostgresAdapter.Instance.init()
    .then(() => {
        importer
            .parseOntology(workerData.input)
            .then((result: any) => {
                parentPort?.postMessage(JSON.stringify(result));
            })
            .catch((e) => {
                Logger.error(`unexpected error in ontology processing thread ${e}`);
                parentPort?.emit('error');
            })
            .finally(() => process.exit(0));
    })
    .catch((e) => {
        void PostgresAdapter.Instance.close();

        Logger.error(`unexpected error in ontology processing thread ${e}`);
        process.exit(1);
    });
