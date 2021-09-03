import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer} from '../../../middleware';
import NodeRepository from '../../../../data_access_layer/repositories/data_warehouse/data/node_repository';
import Result from '../../../../common_classes/result';
import {plainToClass} from 'class-transformer';
import Node from '../../../../data_warehouse/data/node';
import EdgeRepository from '../../../../data_access_layer/repositories/data_warehouse/data/edge_repository';
import Edge from '../../../../data_warehouse/data/edge';

const nodeRepo = new NodeRepository();
const edgeRepo = new EdgeRepository();

export default class GraphRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/containers/:containerID/graphs/nodes/', ...middleware, authInContainer('write', 'containers'), this.createOrUpdateNodes);
        app.get('/containers/:containerID/graphs/nodes/metatype/:metatypeID', ...middleware, authInContainer('read', 'containers'), this.listNodesByMetatypeID);
        app.get('/containers/:containerID/graphs/nodes/', ...middleware, authInContainer('read', 'containers'), this.listNodes);
        app.get('/containers/:containerID/graphs/nodes/:nodeID', ...middleware, authInContainer('read', 'containers'), this.retrieveNode);

        app.post('/containers/:containerID/graphs/edges/', ...middleware, authInContainer('write', 'containers'), this.createOrUpdateEdges);
        app.get('/containers/:containerID/graphs/edges/:edgeID', ...middleware, authInContainer('read', 'containers'), this.retrieveEdge);
        app.get('/containers/:containerID/graphs/edges/', ...middleware, authInContainer('read', 'containers'), this.listEdges);

        app.delete('/containers/:containerID/graphs/nodes/:nodeID', ...middleware, authInContainer('write', 'containers'), this.archiveNode);
        app.delete('/containers/:containerID/graphs/edges/:edgeID', ...middleware, authInContainer('write', 'containers'), this.archiveEdge);
    }
    private static listNodes(req: Request, res: Response, next: NextFunction) {
        // fresh instance of the repo to avoid filter issues
        if (req.container) {
            let repo = new NodeRepository();
            repo = repo.where().containerID('eq', req.container.id!);

            if (typeof req.query.transformationID !== 'undefined' && (req.query.transformationID as string) !== '') {
                repo = repo.and().transformationID('eq', req.query.transformationID);
            }

            if (typeof req.query.metatypeID !== 'undefined' && (req.query.metatypeID as string) !== '') {
                repo = repo.and().metatypeID('eq', req.query.metatypeID);
            }

            if (req.query.count !== undefined && req.query.count === 'true') {
                repo.count(undefined, {
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                })
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => {
                        res.status(404).send(err);
                    })
                    .finally(() => next());
            } else {
                repo.and()
                    .archived('eq', false)
                    .list(req.query.loadMetatypes === 'true', {
                        limit: req.query.limit ? +req.query.limit : undefined,
                        offset: req.query.offset ? +req.query.offset : undefined,
                    })
                    .then((result) => {
                        if (result.isError && result.error) {
                            res.status(result.error.errorCode).json(result);
                            return;
                        }
                        res.status(200).json(result);
                    })
                    .catch((err) => res.status(404).send(err))
                    .finally(() => next());
            }
        } else {
            Result.Failure(`container not found`, 404).asResponse(res);
            next();
        }
    }

    private static retrieveNode(req: Request, res: Response, next: NextFunction) {
        if (req.node) {
            Result.Success(req.node).asResponse(res);
            next();
        } else {
            Result.Failure(`node not found`, 404).asResponse(res);
            next();
        }
    }

    private static retrieveEdge(req: Request, res: Response, next: NextFunction) {
        if (req.edge) {
            Result.Success(req.edge).asResponse(res);
            next();
        } else {
            Result.Failure(`edge not found`, 404).asResponse(res);
            next();
        }
    }

    private static listNodesByMetatypeID(req: Request, res: Response, next: NextFunction) {
        // fresh instance of the repo to avoid filter issues
        if (req.container && req.metatype) {
            const repo = new NodeRepository();
            repo.where()
                .containerID('eq', req.container.id!)
                .and()
                .metatypeID('eq', req.metatype.id)
                .and()
                .archived('eq', false)
                .list(req.query.loadMetatypes === 'true', {
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                })
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return;
                    }
                    res.status(200).json(result);
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next());
        } else {
            Result.Failure(`container or metatype not found`, 404).asResponse(res);
            next();
        }
    }

    private static listEdges(req: Request, res: Response, next: NextFunction) {
        // new repository so we don't pollute the main one
        let repository = new EdgeRepository();
        repository = repository.where().containerID('eq', req.params.containerID);

        if (typeof req.query.originID !== 'undefined' && (req.query.originID as string) !== '') {
            repository = repository.and().origin_node_id('eq', req.query.originID);
        }

        if (typeof req.query.destinationID !== 'undefined' && (req.query.destinationID as string) !== '') {
            repository = repository.and().destination_node_id('eq', req.query.destinationID);
        }

        if (typeof req.query.relationshipPairID !== 'undefined' && (req.query.relationshipPairID as string) !== '') {
            repository = repository.and().relationshipPairID('eq', req.query.relationshipPairID);
        }

        if (typeof req.query.relationshipPairName !== 'undefined' && (req.query.relationshipPairName as string) !== '') {
            repository = repository.and().relationshipName('eq', req.query.relationshipPairName);
        }

        if (req.query.count !== undefined && req.query.count === 'true') {
            repository
                .count(undefined, {
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                })
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return;
                    }
                    res.status(200).json(result);
                })
                .catch((err) => {
                    res.status(404).send(err);
                })
                .finally(() => next());
        } else {
            repository
                .list(false, {
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                })
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    res.status(404).send(err);
                })
                .finally(() => next());
        }
    }

    private static createOrUpdateNodes(req: Request, res: Response, next: NextFunction) {
        let toSave: Node[] = [];

        if (Array.isArray(req.body)) {
            toSave = plainToClass(Node, req.body);
        } else {
            toSave = [plainToClass(Node, req.body as object)];
        }

        // update with containerID and current active graph if none specified
        if (req.container) {
            toSave.forEach((node) => {
                node.container_id = req.container!.id!;
                if (!node.graph_id) node.graph_id = req.container!.active_graph_id;
            });
        }

        nodeRepo
            .bulkSave(req.currentUser!, toSave)
            .then((result) => {
                result.asResponse(res);
            })
            .catch((err) => {
                res.status(500).json(err.message);
            })
            .finally(() => next());
    }

    private static createOrUpdateEdges(req: Request, res: Response, next: NextFunction) {
        let toSave: Edge[] = [];

        if (Array.isArray(req.body)) {
            toSave = plainToClass(Edge, req.body);
        } else {
            toSave = [plainToClass(Edge, req.body as object)];
        }

        // update with containerID and current active graph if none specified
        if (req.container) {
            toSave.forEach((edge) => {
                edge.container_id = req.container!.id!;
                if (!edge.graph_id) edge.graph_id = req.container!.active_graph_id;
            });
        }

        edgeRepo
            .bulkSave(req.currentUser!, toSave)
            .then((result) => {
                result.asResponse(res);
            })
            .catch((err) => {
                res.status(500).json(err.message);
            })
            .finally(() => next());
    }

    private static archiveEdge(req: Request, res: Response, next: NextFunction) {
        if (req.edge) {
            edgeRepo
                .archive(req.currentUser!, req.edge)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next());
        } else {
            Result.Failure('edge not found', 404).asResponse(res);
            next();
        }
    }

    private static archiveNode(req: Request, res: Response, next: NextFunction) {
        if (req.node) {
            nodeRepo
                .archive(req.currentUser!, req.node)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next());
        } else {
            Result.Failure('node not found', 404).asResponse(res);
            next();
        }
    }
}
