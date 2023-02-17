// Class Transformer
import {plainToInstance, plainToClass} from 'class-transformer';

// Common Classes
import Result from '../../../../../common_classes/result';

// Domain Objects
import Edge from '../../../../../domain_objects/data_warehouse/data/edge';
import {NodeIDPayload} from '../../../../../domain_objects/data_warehouse/data/node';

// Express
import {NextFunction, Request, Response} from 'express';

// Repository
import EdgeRepository from '../../../../../data_access_layer/repositories/data_warehouse/data/edge_repository';
import {Repository} from '../../../../../data_access_layer/repositories/repository';
const edgeRepo = new EdgeRepository();

export default class EdgeFunctions {
    public static retrieveEdges(req: Request, res: Response, next: NextFunction) {
        // fresh instance of the repo to avoid filter issues
        if (req.container) {
            const payload = plainToInstance(NodeIDPayload, req.body as object);

            const edgeRepo = new EdgeRepository();
            let repo: EdgeRepository;

            // if pointInTime is passed, only return edges that existed at that time
            if (req.query.pointInTime !== undefined) {
                // filter on provided pointInTime
                const sub = edgeRepo.subquery(
                    new EdgeRepository(true)
                        .select(['id', 'MAX(created_at) AS created_at'], 'sub_edges')
                        .from('edges', 'sub_edges')
                        .where()
                        .query('created_at', '<', new Date(req.query.pointInTime as string), {dataType: 'date'})
                        .and()
                        .query('container_id', 'eq', req.container.id!)
                        .and(
                            new Repository('edges')
                                .query('deleted_at', '>', new Date(req.query.pointInTime as string), {dataType: 'date'})
                                .or()
                                .query('deleted_at', 'is null'),
                        )
                        .groupBy('id', 'edges'),
                );

                repo = edgeRepo
                    .join(
                        sub,
                        [
                            {origin_col: 'id', destination_col: 'id'},
                            {origin_col: 'created_at', destination_col: 'created_at'},
                        ],
                        {destination_alias: 'sub', join_type: 'INNER', origin: 'edges'},
                    )
                    .where()
                    .containerID('eq', req.container.id!)
                    .and(new EdgeRepository(true).origin_node_id('in', payload.node_ids).or().destination_node_id('in', payload.node_ids));
            } else {
                repo = edgeRepo
                    .where()
                    .containerID('eq', req.container.id!)
                    .and(new EdgeRepository(true).origin_node_id('in', payload.node_ids).or().destination_node_id('in', payload.node_ids));
            }

            if (String(req.query.includeRawData).toLowerCase() === 'true') {
                repo = repo
                    .join('data_staging', {origin_col: 'data_staging_id', destination_col: 'id'})
                    .addFields({data: 'raw_data_properties'}, repo._aliasMap.get('data_staging'));
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
                repo.list(String(req.query.loadMetatypeRelationships).toLowerCase() === 'true', {
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

    public static retrieveEdge(req: Request, res: Response, next: NextFunction) {
        // first check if the edge history is desired, otherwise load the single current edge
        if (String(req.query.history).toLowerCase() === 'true' && req.container) {
            const includeRawData = String(req.query.includeRawData).toLowerCase() === 'true' ? true : false;
            edgeRepo
                .findEdgeHistoryByID(req.params.edgeID, includeRawData)
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
            if (req.edge) {
                Result.Success(req.edge).asResponse(res);
                next();
            } else {
                Result.Failure(`edge not found`, 404).asResponse(res);
                next();
            }
        }
    }

    public static listEdges(req: Request, res: Response, next: NextFunction) {
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

        if (typeof req.query.dataSourceID !== 'undefined' && (req.query.dataSourceID as string) !== '') {
            repository = repository.and().dataSourceID('eq', req.query.dataSourceID);
        }

        if (String(req.query.includeRawData).toLowerCase() === 'true') {
            repository = repository
                .join('data_staging', {origin_col: 'data_staging_id', destination_col: 'id'})
                .addFields({data: 'raw_data_properties'}, repository._aliasMap.get('data_staging'));
        }

        if (req.query.count !== undefined && String(req.query.count).toLowerCase() === 'true') {
            repository
                .count(undefined, {
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
                .catch((err) => {
                    Result.Failure(err, 404).asResponse(res);
                })
                .finally(() => next());
        } else {
            repository
                .list(req.query.loadRelationshipPairs !== undefined && req.query.loadRelationshipPairs === 'true', {
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
    }

    public static createOrUpdateEdges(req: Request, res: Response, next: NextFunction) {
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
            });
        }

        edgeRepo
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

    public static archiveEdge(req: Request, res: Response, next: NextFunction) {
        if (req.edge) {
            edgeRepo
                .delete(req.edge)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure('edge not found', 404).asResponse(res);
            next();
        }
    }
}
