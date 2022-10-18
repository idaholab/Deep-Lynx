import express, {Application} from 'express';
import Config from '../services/config';
import {Logger} from '../services/logger';
import DefaultLogger from '../services/logger';
import {Router} from './routes/router';
import ws, {createWebSocketStream, WebSocket} from 'ws';
import {SuperUser, User} from '../domain_objects/access_management/user';
import KeyPairMapper from '../data_access_layer/mappers/access_management/keypair_mapper';
import KeyPairRepository from '../data_access_layer/repositories/access_management/keypair_repository';
import ContainerRepository from '../data_access_layer/repositories/data_warehouse/ontology/container_respository';
import DataSourceRepository from '../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import {Duplex, Transform} from 'stream';

/*
 Server is a singleton and wraps the express.js library and application. This
 class should be entirely self-contained and should not rely solely on the callee
 for its configuration.
*/
export class Server {
    private static instance: Server;
    private logger: Logger;
    private server: express.Application;
    // the two strings are containerID and datasourceID respectively
    private clientMap: Map<WebSocket, [User, string, string]> = new Map<WebSocket, [User, string, string]>();

    private constructor(server: express.Application) {
        this.logger = DefaultLogger;
        this.server = server;
    }

    static get Instance(): Server {
        if (!Server.instance) {
            Server.instance = new Server(express());
        }

        return Server.instance;
    }

    public get UnderlyingExpressApplication(): express.Application {
        return this.server;
    }

    public startServer(logger?: Logger) {
        if (logger) {
            this.logger = logger;
        }

        const router = new Router(this);
        router.mount();

        // start the websocket server
        const wss = new ws.Server({noServer: true});
        wss.on('connection', (socket) => {
            // if we're opening a connection then the user exists in the clientMap
            const result = this.clientMap.get(socket)!;
            const user = result[0];
            const containerID = result[1];
            const dataSourceID = result[2];
            const importID: string | undefined = undefined;

            new ContainerRepository()
                .listForUser(user)
                .then((containers) => {
                    if (containers.isError || !containers.value.find((c) => c.id === containerID)) {
                        socket.send('HTTP/1.1 404 Not Found\r\n\r\n');
                        socket.terminate;
                    }

                    new DataSourceRepository()
                        .findByID(dataSourceID)
                        .then((dataSource) => {
                            if (dataSource.isError) {
                                socket.send('HTTP/1.1 404 Not Found\r\n\r\n');
                                socket.terminate;
                            }

                            const duplex = createWebSocketStream(socket);

                            const transform = new Transform({
                                transform(chunk, encoding, callback) {
                                    if (chunk.toString() === 'ping') {
                                        socket.send('pong');
                                        // don't forward this data onwards
                                        callback(null, null);
                                        return;
                                    }

                                    socket.send('RECEIVED');
                                    callback(null, chunk);
                                },
                            });

                            dataSource.value
                                .ReceiveData(duplex, user, {
                                    transformStream: transform,
                                    websocket: socket,
                                    bufferSize: 1,
                                    errorCallback: (err) => {
                                        socket.send(`ERROR: cannot parse or process records ${err}`);
                                    },
                                })
                                .catch((e) => {
                                    socket.send(JSON.stringify(e));
                                });
                        })
                        .catch(() => {
                            socket.send('HTTP/1.1 404 Not Found\r\n\r\n');
                            socket.terminate;
                        });
                })
                .catch(() => {
                    socket.send('HTTP/1.1 404 Not Found\r\n\r\n');
                    socket.terminate;
                });
        });

        this.logger.info(`starting Deep Lynx on port ${Config.server_port}`);
        // eslint-disable-next-line @typescript-eslint/no-empty-function,no-empty-function
        const server = this.server.listen(Config.server_port, () => {}); // empty callback on application exit. Could add something
        // here later if needed, such as processing cleanup

        // upgrade handling now for websockets
        server.on('upgrade', (request, socket, head) => {
            const path = request.url!.split('/');
            if (path.length < 5) {
                socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                socket.destroy();
                return;
            }

            // first check we're on the proper path - if not, send a 404 - we only allow websocket connections on
            // manual import data source
            const key = request.headers['x-api-key'];
            const secret = request.headers['x-api-secret'];

            new KeyPairRepository()
                .validateKeyPair(key as string, secret as string)
                .then((valid) => {
                    if (!valid) {
                        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                        socket.destroy();
                        return;
                    }

                    KeyPairMapper.Instance.UserForKeyPair(key as string)
                        .then((user) => {
                            if (user.isError) {
                                // even though it's an error with the user, we don't want
                                // to give that away, keep them thinking it's an error
                                // with credentials
                                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                                socket.destroy(user.error);
                                return;
                            }

                            wss.handleUpgrade(request, socket, head, (socket) => {
                                this.clientMap.set(socket, [user.value, path[2], path[5]]);
                                wss.emit('connection', socket, request);
                            });
                        })
                        .catch((e) => {
                            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                            socket.destroy(e);
                        });
                })
                .catch((e) => {
                    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                    socket.destroy(e);
                });
        });
    }
}
