/* eslint-disable @typescript-eslint/no-floating-promises,@typescript-eslint/no-misused-promises */
/*
    Standalone loop for processing data in data staging. This loop will generate and assign a shape hash to
    a data staging record, as well as upsert a record into the type mappings table which corresponds to the
    data staging record. We do this because the shape hash is a cpu intensive procedure and constantly blocked
    the main thread when it wasn't separated.
 */

import Logger from '../services/logger';
import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
import DataStagingRepository from '../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import {parentPort} from 'worker_threads';
import TypeMapping from '../data_warehouse/etl/type_mapping';
import Result from '../common_classes/result';
import TypeMappingMapper from '../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper';

const postgresAdapter = PostgresAdapter.Instance;

void postgresAdapter.init().then(() => {
    Logger.debug('starting data staging mapping assignment loop');
    const repo = new DataStagingRepository();

    repo.where()
        .shapeHash('is null')
        .list({
            limit: 5000,
        })
        .then((results) => {
            if (results.isError) {
                Logger.error('unable to list records for data staging mapping assignment loop');
                process.exit(1);
                return;
            }

            if (results.value.length === 0) {
                if (parentPort) parentPort.postMessage('done');
                else {
                    process.exit(0);
                }
            }

            const mappings: Map<string, TypeMapping> = new Map<string, TypeMapping>();

            // eslint-disable-next-line @typescript-eslint/no-for-in-array
            for (const i in results.value) {
                results.value[i].shape_hash = TypeMapping.objectToShapeHash(results.value[i].data);

                // if we haven't already setup a new type mapping, create
                if (!mappings.has(results.value[i].shape_hash!)) {
                    mappings.set(
                        results.value[i].shape_hash!,
                        new TypeMapping({
                            container_id: results.value[i].container_id!,
                            data_source_id: results.value[i].data_source_id!,
                            sample_payload: results.value[i].data, // TODO: mask the data eventually
                            shape_hash: results.value[i].shape_hash,
                        }),
                    );
                }
            }

            const saveOperations: Promise<Result<any>>[] = [];
            const stagingRepo = new DataStagingRepository();
            // we use the mapping mapper here because we don't need to worry about validation
            // or saving transformations at this point, we just want the straight upsert
            const mappingMapper = TypeMappingMapper.Instance;
            const mappingsToSave = Array.from(mappings, ([name, value]) => value);

            saveOperations.push(stagingRepo.bulkSave(results.value));
            saveOperations.push(
                mappingMapper.BulkCreateOrUpdate(
                    'system',
                    Array.from(mappings, ([name, value]) => value),
                ),
            );

            Promise.all(saveOperations)
                .then(() => {
                    if (parentPort) parentPort.postMessage('done');
                    else {
                        process.exit(0);
                    }
                })
                .catch(() => {
                    Logger.error('unable to save mappings or update data staging records');
                    process.exit(1);
                });
        })
        .catch(() => {
            Logger.error('unable to list records for data staging mapping assignment loop');
            process.exit(1);
        });
});
