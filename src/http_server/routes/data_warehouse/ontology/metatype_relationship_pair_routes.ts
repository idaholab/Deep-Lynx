import {Request, Response, NextFunction, Application} from 'express';
import {authInContainer} from '../../../middleware';
import MetatypeRelationshipPairRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_pair_repository';
import {plainToClass} from 'class-transformer';
import MetatypeRelationshipPair from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import Result from '../../../../common_classes/result';

const repo = new MetatypeRelationshipPairRepository();

// This contains all routes for Metatype Relationship Pair management.
export default class MetatypeRelationshipPairRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post(
            '/containers/:containerID/metatype_relationship_pairs',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.createMetatypeRelationshipPair,
        );
        app.get(
            '/containers/:containerID/metatype_relationship_pairs/:relationshipPairID',
            ...middleware,
            authInContainer('read', 'ontology'),
            this.retrieveMetatypeRelationshipPair,
        );
        app.get(
            '/containers/:containerID/metatype_relationship_pairs/',
            ...middleware,
            authInContainer('read', 'ontology'),
            this.listMetatypeRelationshipPairs,
        );
        app.put(
            '/containers/:containerID/metatype_relationship_pairs/:relationshipPairID',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.updateMetatypeRelationshipPair,
        );
        app.delete(
            '/containers/:containerID/metatype_relationship_pairs/:relationshipPairID',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.archiveMetatypeRelationshipPair,
        );
    }

    private static createMetatypeRelationshipPair(req: Request, res: Response, next: NextFunction) {
        let toCreate: MetatypeRelationshipPair[] = [];

        if (Array.isArray(req.body)) {
            toCreate = plainToClass(MetatypeRelationshipPair, req.body);
        } else {
            toCreate = [plainToClass(MetatypeRelationshipPair, req.body as object)];
        }

        // update with the containerID
        if (req.container) {
            toCreate.forEach((relationship) => (relationship.container_id = req.container!.id!));
        }

        repo.bulkSave(req.currentUser!, toCreate)
            .then((result) => {
                if (result.isError) {
                    result.asResponse(res);
                    return;
                }

                Result.Success(toCreate).asResponse(res);
            })
            .catch((err) => {
                res.status(500).json(err.message);
            })
            .finally(() => next());
    }

    private static retrieveMetatypeRelationshipPair(req: Request, res: Response, next: NextFunction) {
        if (req.metatypeRelationshipPair) {
            Result.Success(req.metatypeRelationshipPair).asResponse(res);
            next();
            return;
        }

        Result.Failure('metatype relationship pair not found', 4040).asResponse(res);
        next();
    }

    private static listMetatypeRelationshipPairs(req: Request, res: Response, next: NextFunction) {
        // new repository to insure we don't pollute the main one
        let repository = new MetatypeRelationshipPairRepository();
        repository = repository.where().containerID('eq', req.params.containerID);

        if (typeof req.query.destinationID !== 'undefined' && (req.query.destinationID as string) !== '') {
            repository = repository.and().destination_metatype_id('eq', req.query.destinationID);
        }

        if (typeof req.query.originID !== 'undefined' && (req.query.originID as string) !== '') {
            repository = repository.and().origin_metatype_id('eq', req.query.originID);
        }

        if (typeof req.query.name !== 'undefined' && (req.query.name as string) !== '') {
            repository = repository.and().name('like', `%${req.query.name}%`);
        }

        if (typeof req.query.metatypeID !== 'undefined' && (req.query.metatypeID as string) !== '') {
            repository = repository.and().metatypeID('eq', req.query.metatypeID);
        }

        if (typeof req.query.ontologyVersion !== 'undefined' && (req.query.ontologyVersion as string) !== '') {
            repository = repository.and().ontologyVersion('eq', req.query.ontologyVersion);
        }

        if (typeof req.query.deleted !== 'undefined' && String(req.query.deleted as string).toLowerCase() === 'false') {
            repository = repository.and().deleted_at('is null');
        }

        if (req.query.count !== undefined && String(req.query.count).toLowerCase() === 'true') {
            repository
                .count()
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
                .list(req.query.loadRelationships !== undefined && String(req.query.loadRelationships).toLowerCase() === 'true', {
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

    private static updateMetatypeRelationshipPair(req: Request, res: Response, next: NextFunction) {
        if (req.metatypeRelationshipPair && req.container) {
            const payload = plainToClass(MetatypeRelationshipPair, req.body as object);
            payload.id = req.metatypeRelationshipPair.id;
            payload.container_id = req.metatypeRelationshipPair.container_id;

            repo.save(payload, req.currentUser!)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    Result.Success(payload).asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next());
        } else {
            Result.Failure('metatype relationship not found', 404).asResponse(res);
            next();
        }
    }

    private static archiveMetatypeRelationshipPair(req: Request, res: Response, next: NextFunction) {
        if (req.metatypeRelationshipPair) {
            if (req.query.permanent !== undefined && String(req.query.permanent).toLowerCase() === 'true') {
                repo.delete(req.metatypeRelationshipPair)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => res.status(500).send(err))
                    .finally(() => next());
            } else {
                repo.archive(req.currentUser!, req.metatypeRelationshipPair)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => res.status(500).send(err))
                    .finally(() => next());
            }
        } else {
            Result.Failure('metatype relationship pair not found', 404).asResponse(res);
            next();
        }
    }
}
