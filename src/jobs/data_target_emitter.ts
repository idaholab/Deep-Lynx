/*
  Standalone loop for emitting data target run events. These are emitted every
  minute for each data target, a separate processing thread will take care of
  the messages from the queue
 */

  import PostgresAdapter from '../data_access_layer/mappers/db_adapters/postgres/postgres';
  import {QueueFactory} from '../services/queue/queue';
  import DataTargetMapper from '../data_access_layer/mappers/data_warehouse/export/data_target_mapper';
  import QueryStream from 'pg-query-stream';
  import Logger from '../services/logger';
  import Config from '../services/config';
  import {parentPort} from 'worker_threads';
  import {plainToClass} from 'class-transformer';
  import DataTargetRecord from '../domain_objects/data_warehouse/export/data_target';
  const devnull = require('dev-null');
  
  const postgresAdapter = PostgresAdapter.Instance;
  const dataTargetMapper = DataTargetMapper.Instance;
  
  void postgresAdapter.init().then(() => {
      QueueFactory()
          .then((queue) => {
              void postgresAdapter.Pool.connect((err, client, done) => {
                  const stream = client.query(new QueryStream(dataTargetMapper.listAllActiveStatement()));
                  const putPromises: Promise<boolean>[] = [];
  
                  stream.on('data', (data) => {
                      // we're simply putting the id on the queue here
                      putPromises.push(queue.Put(Config.data_targets_queue, plainToClass(DataTargetRecord, data as object).id));
                  });
  
                  stream.on('end', () => {
                      done();
  
                      Promise.all(putPromises)
                          .then(() => {
                              if (parentPort) parentPort.postMessage('done');
                              else {
                                  process.exit(0);
                              }
                          })
                          .catch((e) => Logger.error(`unable to put data targets on queue ${e}`));
                  });
  
                  stream.pipe(devnull({objectMode: true}));
              });
          })
          .catch((e) => {
              Logger.error(`unable to initiate data target emitter: ${e}`);
          });
  });