import NodeStorage from "../data_storage/graph/node_storage";
import EdgeStorage from "../data_storage/graph/edge_storage";

import {Request, Response, NextFunction, Application} from "express";
import {authInContainer} from "./middleware";

const nodeStorage = NodeStorage.Instance;
const edgeStorage = EdgeStorage.Instance;

export default class GraphRoutes {
    public static mount(app: Application, middleware: any[]) {
      app.get("/containers/:id/graphs/nodes/metatype/:metatypeID", ...middleware, authInContainer("read", "containers"), this.listNodesByMetatypeID);
      app.get("/containers/:id/graphs/nodes/", ...middleware, authInContainer("read", "containers"), this.listNodes);
      app.get("/containers/:id/graphs/nodes/:nodeID", ...middleware, authInContainer("read", "containers"), this.retrieveNode);
      app.get("/containers/:id/graphs/edges/", ...middleware, authInContainer("read", "containers"),this.listEdges);
      app.post("/containers/:id/graphs/nodes/", ...middleware, authInContainer("write", "containers"), this.createOrUpdateNodes);
      app.post("/containers/:id/graphs/edges/", ...middleware, authInContainer("write", "containers"), this.createOrUpdateEdges);
      app.delete("/containers/:id/graphs/edges/:edgeID", ...middleware, authInContainer("write", "containers"),this.archiveEdge);
      app.delete("/containers/:id/graphs/nodes/:nodeID", ...middleware, authInContainer("write", "containers"),this.archiveNode);
    }

    private static async listNodes(req: Request, res: Response, next: NextFunction) {
      nodeStorage.List(req.params.id, +req.query.offset, +req.query.limit)
          .then((result) => {
              if (result.isError && result.error) {
                  res.status(result.error.errorCode).json(result);
                  return
              }
              res.status(200).json(result)
          })
          .catch((err) => res.status(404).send(err))
          .finally(() => next())
    }

    private static async retrieveNode(req: Request, res: Response, next: NextFunction) {
      nodeStorage.Retrieve(req.params.nodeID)
          .then((result) => {
              if (result.isError && result.error) {
                  res.status(result.error.errorCode).json(result);
                  return
              }
              res.status(200).json(result)
          })
          .catch((err) => res.status(404).send(err))
          .finally(() => next())
    }

    private static async listNodesByMetatypeID(req: Request, res: Response, next: NextFunction) {
      nodeStorage.ListByMetatypeID(req.params.metatypeID, +req.query.offset, +req.query.limit)
          .then((result) => {
              if (result.isError && result.error) {
                  res.status(result.error.errorCode).json(result);
                  return
              }
              res.status(200).json(result)
          })
          .catch((err) => res.status(404).send(err))
          .finally(() => next())
    }

    private static listEdges(req: Request, res: Response, next: NextFunction) {
      if (typeof req.query.originID !== "undefined" && typeof req.query.destinationID !== "undefined") {
        edgeStorage.RetriveByOriginAndDestination(req.query.originID as string, req.query.destinationID as string)
              .then((result) => {
                  if (result.isError && result.error) {
                      res.status(result.error.errorCode).json(result);
                      return
                  }
                  res.status(200).json(result)
              })
              .catch((err) => {
                  res.status(404).send(err)
              })
              .finally(() => next())
      } else if (typeof req.query.destinationID !== "undefined") {
        edgeStorage.ListByDestination(req.query.destinationID as string)
              .then((result) => {
                  if (result.isError && result.error) {
                      res.status(result.error.errorCode).json(result);
                      return
                  }
                  res.status(200).json(result)
              })
              .catch((err) => {
                  res.status(404).send(err)
              })
              .finally(() => next())
      } else if (typeof req.query.originID !== "undefined") {
        edgeStorage.ListByOrigin(req.query.originID as string)
              .then((result) => {
                  if (result.isError && result.error) {
                      res.status(result.error.errorCode).json(result);
                      return
                  }
                  res.status(200).json(result)
              })
              .catch((err) => {
                  res.status(404).send(err)
              })
              .finally(() => next())
      } else {
        edgeStorage.List(req.params.id, +req.query.offset, +req.query.limit)
              .then((result) => {
                  if (result.isError && result.error) {
                      res.status(result.error.errorCode).json(result);
                      return
                  }
                  res.status(200).json(result)
              })
              .catch((err) => {
                  res.status(404).send(err)
              })
              .finally(() => next())
      }
  }

  private static async createOrUpdateNodes(req: Request, res: Response, next: NextFunction) {
    nodeStorage.CreateOrUpdateByActiveGraph(req.params.id, req.body)
        .then((result) => {
            if (result.isError && result.error) {
                res.status(result.error.errorCode).json(result);
                return
            }

            res.status(201).json(result)
        })
        .catch((err) => {
            res.status(500).json(err.message)
        })
        .finally(() => next())
  }

  private static async createOrUpdateEdges(req: Request, res: Response, next: NextFunction) {
    edgeStorage.CreateOrUpdateByActiveGraph(req.params.id, req.body)
        .then((result) => {
            if (result.isError && result.error) {
                res.status(result.error.errorCode).json(result);
                return
            }

            res.status(201).json(result)
        })
        .catch((err) => {
            res.status(500).json(err.message)
        })
        .finally(() => next())
  }

  private static archiveEdge(req: Request, res: Response, next: NextFunction) {
    edgeStorage.Archive(req.params.edgeID)
        .then((result) => {
            if (result.isError && result.error) {
                res.status(result.error.errorCode).json(result);
                return
            }
            res.sendStatus(200)
        })
        .catch((err) => res.status(500).send(err))
        .finally(() => next())
  }

  private static archiveNode(req: Request, res: Response, next: NextFunction) {
    nodeStorage.Archive(req.params.nodeID)
        .then((result) => {
            if (result.isError && result.error) {
                res.status(result.error.errorCode).json(result);
                return
            }
            res.sendStatus(200)
        })
        .catch((err) => res.status(500).send(err))
        .finally(() => next())
  }
}
