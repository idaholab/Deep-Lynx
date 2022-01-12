import {QueueFactory} from '../services/queue/queue';
import Config from '../services/config';
import {Writable} from 'stream';

const queue = QueueFactory();

void queue.Init().then(() => {
    const destination = new Writable({
        objectMode: true,
        highWaterMark: 1000,
        write(chunk: any, encoding: string, callback: (error?: Error | null) => void) {
            // PROCESS MESSAGE HERE FOR STREAM
            console.log(chunk);
            callback();
        },
    });

    queue.Consume(Config.process_queue, destination);
});
