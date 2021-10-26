/* eslint-disable @typescript-eslint/no-floating-promises,@typescript-eslint/no-misused-promises */
/*
   This job will run the link_edges stored SQL procedure on each relevant row in edges. This is needed
   so that edges which are created before their relevant nodes exist can be linked to said nodes when
   they become available.
 */
import Logger from '../services/logger';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import EdgeMapper from '../data_access_layer/mappers/data_warehouse/data/edge_mapper';
import {parentPort} from 'worker_threads';

const postgresAdapter = PostgresAdapter.Instance;

void postgresAdapter.init().then(() => {
    EdgeMapper.Instance.RunEdgeLinker()
        .then(() => {
            if (parentPort) parentPort.postMessage('done');
            else {
                process.exit(0);
            }
        })
        .catch((e) => {
            Logger.error(`unable to run edge linker job ${e}`);
            process.exit(1);
        });
});
