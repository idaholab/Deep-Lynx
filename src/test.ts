const fastLoad = require('dl-fast-load');
import Config from './services/config';

// test 1 million rows with Rust
import fs from 'fs';
import {PassThrough} from 'stream';

const stream = fs.createReadStream('./1millionlines.csv');
const manager = fastLoad.manager(Config.core_db_connection_string);

const pass = new PassThrough();
pass.on('data', (chunk) => {
    fastLoad.read(manager, chunk);
});

pass.on('finish', () => {
    fastLoad.finish(manager);
});

stream.pipe(pass);

//   await sourceRepo.delete(source!);
setTimeout(() => {
    console.log('done');
}, 30000);
