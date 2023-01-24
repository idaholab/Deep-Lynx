// Class Transformer
import {plainToInstance} from 'class-transformer';

// Common Classes
import Result from '../../../../../common_classes/result';

// Domain Objects
import Node from '../../../../../domain_objects/data_warehouse/data/node';

// Express
import {NextFunction, Request, Response} from 'express';

// Repository
import NodeRepository from '../../../../../data_access_layer/repositories/data_warehouse/data/node_repository';
import NodeLeafRepository from '../../../../../data_access_layer/repositories/data_warehouse/data/node_leaf_repository';
const nodeRepo = new NodeRepository();


export default class NodeFunctions {

    public static listNodes(req: Request, res: Response, next: NextFunction) {
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

            if (typeof req.query.dataSourceID !== 'undefined' && (req.query.dataSourceID as string) !== '') {
                repo = repo.and().dataSourceID('eq', req.query.dataSourceID);
            }

            if (req.query.count !== undefined && String(req.query.count).toLowerCase() === 'true') {
                repo.count(undefined, {
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                })
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => {
                        Result.Failure(err, 404).asResponse(res);
                    })
                    .finally(() => next());
            } else {
                repo.list(String(req.query.loadMetatypes).toLowerCase() === 'true', {
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                })
                    .then((result) => {
                        if (result.isError && result.error) {
                            result.asResponse(res);
                            return;
                        }
                        res.status(200).json(result);
                    })
                    .catch((err) => Result.Failure(err, 404).asResponse(res))
                    .finally(() => next());
            }
        } else {
            Result.Failure(`container not found`, 404).asResponse(res);
            next();
        }
    }

    public static retrieveNode(req: Request, res: Response, next: NextFunction) {
        // first check if the node history is desired, otherwise load the single current node
        if (String(req.query.history).toLowerCase() === 'true') {
            if (req.container) {
                nodeRepo.findNodeHistoryByID(req.params.nodeID)
                    .then((result) => {
                        if (result.isError && result.error) {
                            result.asResponse(res);
                            return;
                        }
                        res.status(200).json(result);
                    })
                    .catch((err) => Result.Failure(err, 404).asResponse(res))
                    .finally(() => next());
            }
        } else {
            if (req.node) {
                Result.Success(req.node).asResponse(res);
                next();
            } else {
                Result.Failure(`node not found`, 404).asResponse(res);
                next();
            }
        }
    }

    // This should return a node and all connected nodes and connecting edges for n layers.
    public static retrieveNthNodes(req: Request, res: Response, next: NextFunction) {
        if (req.node) {
            let depth: any = '10';
            if (typeof req.query.depth !== 'undefined' && (req.query.depth as string) !== '') {
                depth = req.query.depth;
            }
            const repo = new NodeLeafRepository(req.node.id!, req.node.container_id!, depth);
            repo.list({sortBy: 'depth'})
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`graph not found`, 404).asResponse(res);
            next();
        }
    }

    public static listNodesByMetatypeID(req: Request, res: Response, next: NextFunction) {
        // fresh instance of the repo to avoid filter issues
        if (req.container && req.metatype) {
            const repo = new NodeRepository();
            repo.where()
                .containerID('eq', req.container.id!)
                .and()
                .metatypeID('eq', req.metatype.id)
                .and()
                .list(String(req.query.loadMetatypes).toLowerCase() === 'true', {
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                })
                .then((result) => {
                    if (result.isError && result.error) {
                        result.asResponse(res);
                        return;
                    }
                    res.status(200).json(result);
                })
                .catch((err) => Result.Failure(err, 404).asResponse(res))
                .finally(() => next());
        } else {
            Result.Failure(`container or metatype not found`, 404).asResponse(res);
            next();
        }
    }

    public static createOrUpdateNodes(req: Request, res: Response, next: NextFunction) {
        let toSave: Node[] = [];

        if (Array.isArray(req.body)) {
            toSave = plainToInstance(Node, req.body);
        } else {
            toSave = [plainToInstance(Node, req.body as object)];
        }

        // update with containerID and current active graph if none specified
        if (req.container) {
            toSave.forEach((node) => {
                node.container_id = req.container!.id!;
            });
        }

        nodeRepo
            .bulkSave(req.currentUser!, toSave)
            .then((result) => {
                if (result.isError) {
                    Result.Error(result.error?.error).asResponse(res);
                    return;
                }

                Result.Success(toSave).asResponse(res);
            })
            .catch((err) => {
                Result.Error(err).asResponse(res);
            })
            .finally(() => next());
    }

    public static deleteNode(req: Request, res: Response, next: NextFunction) {
        if (req.node) {
            nodeRepo
                .delete(req.node)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure('node not found', 404).asResponse(res);
            next();
        }
    }
    
}