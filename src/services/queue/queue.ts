import Config from '../config';
import DatabaseQueue from './database_queue_impl';
import {Writable} from 'stream';
import RabbitMQQueue from './rabbitmq_queue_impl';

/*
    QueueInterface defines a very simple interface for a queue processor to
    implement. Planned implementations are Azure Service Bus, RabbitMQ, and
    a simple database processor
 */
export interface QueueInterface {
    // Init should be called prior to using the queue interface. This allows any
    // setup or connections to be made correctly. We make this explicit instead
    // of relying on the constructor for two reasons - 1. it allows use to use
    // async/await by returning a promise and 2. it explicitly defines a setup
    // step that each individual implementation can take advantage of
    // returns false if the connection could not be made
    Init(): Promise<boolean>;

    // Consume should start a worker-like thread who's job is to read messages from
    // queues and act on them - generally spawned for each possible queue
    Consume(queueName: string, destination: Writable): void;

    // Put sends a message to the queue
    Put(queueName: string, data: any): Promise<boolean>;
}

// a helper function for spawning the proper queue implementation based on
// an environment variable
export const QueueFactory = (): QueueInterface => {
    switch (Config.queue_system) {
        case 'database': {
            return new DatabaseQueue();
        }

        case 'rabbitmq': {
            return new RabbitMQQueue();
        }

        default: {
            return new DatabaseQueue();
        }
    }
};
