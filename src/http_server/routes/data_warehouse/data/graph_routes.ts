import EdgeStorage from "../../../../data_access_layer/mappers/data_warehouse/data/edge_storage";

import {Request, Response, NextFunction, Application} from "express";
import {authInContainer} from "../../../middleware";
import NodeRepository from "../../../../data_access_layer/repositories/data_warehouse/data/node_repository";
import Result from "../../../../result";
import {plainToClass} from "class-transformer";
import Node from "../../../../data_warehouse/data/node";

const nodeRepo = new NodeRepository()
const edgeStorage = EdgeStorage.Instance;

export default class GraphRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.get("/containers/:containerID/graphs/nodes/metatype/:metatypeID", ...middleware, authInContainer("read", "containers"), this.listNodesByMetatypeID);
        app.get("/containers/:containerID/graphs/nodes/", ...middleware, authInContainer("read", "containers"), this.listNodes);
        app.get("/containers/:containerID/graphs/nodes/:nodeID", ...middleware, authInContainer("read", "containers"), this.retrieveNode);
        app.get("/containers/:containerID/graphs/edges/", ...middleware, authInContainer("read", "containers"),this.listEdges);
        app.post("/containers/:containerID/graphs/nodes/", ...middleware, authInContainer("write", "containers"), this.createOrUpdateNodes);
        app.post("/containers/:containerID/graphs/edges/", ...middleware, authInContainer("write", "containers"), this.createOrUpdateEdges);
        app.delete("/containers/:containerID/graphs/edges/:edgeID", ...middleware, authInContainer("write", "containers"),this.archiveEdge);
        app.delete("/containers/:containerID/graphs/nodes/:nodeID", ...middleware, authInContainer("write", "containers"),this.archiveNode);
    }
    private static async listNodes(req: Request, res: Response, next: NextFunction) {
        // fresh instance of the repo to avoid filter issues
        if(req.container) {
            const repo = new NodeRepository()
            repo.where().containerID("eq", req.container.id!)
                .list(req.query.loadMetatypes === "true", {
                    limit: (req.query.limit) ? +req.query.limit : undefined,
                    offset: (req.query.offset) ? +req.query.offset : undefined
                })
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return
                    }
                    res.status(200).json(result)
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next())
        } else {
            Result.Failure(`container not found`, 404).asResponse(res)
            next()
        }
    }

    private static async retrieveNode(req: Request, res: Response, next: NextFunction) {
        if(req.node) {
            Result.Success(req.node).asResponse(res)
            next()
        } else {
            Result.Failure(`node not found`, 404).asResponse(res)
            next()
        }
    }

    private static async listNodesByMetatypeID(req: Request, res: Response, next: NextFunction) {
        // fresh instance of the repo to avoid filter issues
        if(req.container && req.metatype) {
            const repo = new NodeRepository()
            repo.where().containerID("eq", req.container.id!).and().metatypeID("eq", req.metatype.id)
                .list(req.query.loadMetatypes === "true", {
                    limit: (req.query.limit) ? +req.query.limit : undefined,
                    offset: (req.query.offset) ? +req.query.offset : undefined
                })
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return
                    }
                    res.status(200).json(result)
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next())
        } else {
            Result.Failure(`container or metatype not found`, 404).asResponse(res)
            next()
        }
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
            // @ts-ignore
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
        let toSave: Node[] = []

        if(Array.isArray(req.body)) {
            toSave = plainToClass(Node, req.body)
        } else {
            toSave = [plainToClass(Node, req.body as object)]
        }

        // update with containerID and current active graph if none specified
        if(req.container) {
            toSave.forEach(node => {
                node.container_id = req.container!.id!;
                if(!node.graph_id) node.graph_id = req.container!.active_graph_id
            })
        }

        nodeRepo.bulkSave(req.currentUser!, toSave)
            .then((result) => {
                result.asResponse(res)
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
        if(req.node) {
            nodeRepo.archive(req.currentUser! , req.node)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        } else {
            Result.Failure('node not found', 404).asResponse(res)
            next()
        }
    }
}
