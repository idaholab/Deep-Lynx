import express from "express";
import Config from "../services/config";
import { Logger } from "../services/logger";
import DefaultLogger from "../services/logger";
import { Router } from "./router"

// Server is a singleton and wraps the express.js library and application. This
// class should be entirely self contained and should not rely solely on the callee
// for its configuration.
export class Server {
  private static instance: Server;
  private logger: Logger;
  private server: express.Application;

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
      this.logger = logger
    }

    const router = new Router(this);
    router.mount();

    this.logger.info(`starting Deep Lynx on port ${Config.server_port}`);
    // tslint:disable-next-line:no-empty
    this.server.listen(Config.server_port, () => {}); // empty callback on application exit. Could add something
                                                              // here later if needed, such as processing cleanup
  }
}
