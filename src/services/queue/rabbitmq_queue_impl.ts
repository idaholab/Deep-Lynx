import {QueueInterface} from './queue';
import {Writable} from 'stream';
import {Channel, Connection, ConsumeMessage, Replies} from 'amqplib';
import Config from '../config';
import Logger from '../logger';
import AssertQueue = Replies.AssertQueue;

const amqp = require('amqplib');

export default class RabbitMQQueue implements QueueInterface {
    channel: Channel | undefined;

    Init(): Promise<boolean> {
        return new Promise((resolve) => {
            amqp.connect(Config.rabbitmq_url)
                .then((connection: Connection) => {
                    return connection.createChannel();
                })
                .then((channel: Channel) => {
                    this.channel = channel;
                    resolve(true);
                })
                .catch((e: any) => {
                    Logger.error(`unable to open connection to rabbitmq ${e}`);
                    resolve(false);
                });
        });
    }

    Consume(queueName: string, destination: Writable): void {
        void this.channel
            ?.assertQueue(queueName)
            .then((ok) => {
                this.channel?.consume(queueName, (msg: ConsumeMessage | null) => {
                    if (msg) {
                        destination.write(JSON.parse(msg.content.toString()), () => {
                            this.channel?.ack(msg);
                        });
                    }
                });
            })
            .catch((e) => {
                Logger.error(`unable to consume messages from rabbitmq ${e}`);
            });
    }

    Put(queueName: string, data: any): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.channel) {
                this.channel
                    .assertQueue(queueName)
                    .then((ok: AssertQueue) => {
                        if (this.channel) {
                            resolve(this.channel?.sendToQueue(queueName, Buffer.from(JSON.stringify(data))));
                        } else {
                            resolve(false);
                        }
                    })
                    .catch((e) => {
                        Logger.error(`unable to assert rabbitmq queue ${e}`);
                        resolve(false);
                    });
            } else {
                Logger.error('unable to put message on rabbitmq queue, channel not initialized');
                resolve(false);
            }
        });
    }
}
