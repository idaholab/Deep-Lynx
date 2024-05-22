import {QueueInterface} from './queue';
import Config from '../config';
import Logger from '../logger';
import {Writable} from 'stream';
import {ServiceBusReceivedMessage} from '@azure/service-bus';
const {ServiceBusClient} = require('@azure/service-bus');

export default class AzureServiceBusQueue implements QueueInterface {
    client = new ServiceBusClient(Config.azure_service_bus_connection);

    async ConsumeMultiple(queueName: string, count: number, callback: (messages: any[]) => Promise<void>): Promise<void> {
        const receiver = this.client.createReceiver(queueName);

        while (true) {
            const messages: ServiceBusReceivedMessage[] = await receiver.receiveMessages(count);

            try {
                await callback(messages.map((m) => JSON.parse(m.body)));

                messages.forEach((m) => {
                    receiver.completeMessage(m).catch((e: any) => {
                        `unable to mark message complete ${JSON.stringify(e)}`;
                    });
                });
            } catch (e) {
                Logger.error(`unable to process messages from azure service bus queue ${e}`);
            }
        }
    }
    Init(): Promise<boolean> {
        return Promise.resolve(true);
    }

    Consume(queueName: string, destination: Writable): void {
        const receiver = this.client.createReceiver(queueName);

        const handler = (message: ServiceBusReceivedMessage) => {
            destination.write(JSON.parse(message.body), () => {
                receiver.completeMessage(message).catch((e: any) => {
                    `unable to mark message complete ${JSON.stringify(e)}`;
                });
            });
        };

        const errorHandler = (e: any) => {
            Logger.error(`unable to read messages from azure service bus queue ${JSON.stringify(e)}`);
        };

        receiver.subscribe({
            processMessage: handler,
            processError: errorHandler,
        });
    }

    Put(queueName: string, data: any): Promise<boolean> {
        const sender = this.client.createSender(queueName);

        return new Promise((resolve) => {
            sender
                .sendMessages({body: JSON.stringify(data)})
                .then(() => {
                    resolve(true);
                })
                .catch((e: any) => {
                    Logger.error(`unable to put message on azure service bus queue ${JSON.stringify(e)}`);
                    resolve(false);
                });
        });
    }
}
