import {Request, Response, NextFunction, Application} from 'express';
import {authInContainer} from '../../../middleware';
import MetatypeRelationshipKeyRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_key_repository';
import {plainToClass} from 'class-transformer';
import Result from '../../../../common_classes/result';
import MetatypeRelationshipKey from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_key';

const repo = new MetatypeRelationshipKeyRepository();

// This contains all routes pertaining to Metatype Relationship Keys and their management.
export default class MetatypeRelationshipKeyRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post(
            '/containers/:containerID/metatype_relationships/:metatypeRelationshipID/keys',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.createMetatypeRelationshipKey,
        );
        app.get(
            '/containers/:containerID/metatype_relationships/:metatypeRelationshipID/keys/:relationshipKeyID',
            ...middleware,
            authInContainer('read', 'ontology'),
            this.retrieveMetatypeRelationshipKey,
        );
        app.get(
            '/containers/:containerID/metatype_relationships/:metatypeRelationshipID/keys',
            ...middleware,
            authInContainer('read', 'ontology'),
            this.listMetatypeRelationshipKeys,
        );
        app.delete(
            '/containers/:containerID/metatype_relationships/:metatypeRelationshipID/keys/:relationshipKeyID',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.archiveMetatypeRelationshipKey,
        );
        app.put(
            '/containers/:containerID/metatype_relationships/:metatypeRelationshipID/keys/:relationshipKeyID',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.updateMetatypeRelationshipKey,
        );
    }

    private static createMetatypeRelationshipKey(req: Request, res: Response, next: NextFunction) {
        let toCreate: MetatypeRelationshipKey[] = [];

        if (Array.isArray(req.body)) {
            toCreate = plainToClass(MetatypeRelationshipKey, req.body);
        } else {
            toCreate = [plainToClass(MetatypeRelationshipKey, req.body as object)];
        }

        // update with the metatypeID
        if (req.metatypeRelationship) {
            toCreate.forEach((key) => (key.metatype_relationship_id = req.metatypeRelationship!.id!));
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

    private static retrieveMetatypeRelationshipKey(req: Request, res: Response, next: NextFunction) {
        if (req.metatypeRelationshipKey) {
            Result.Success(req.metatypeRelationshipKey).asResponse(res);
            next();
            return;
        }

        Result.Failure(`metatype relationship key not found`, 404).asResponse(res);
        next();
    }

    private static listMetatypeRelationshipKeys(req: Request, res: Response, next: NextFunction) {
        // we don't have to do anything fancy here, simply return the metatype in
        // the request's keys
        if (req.metatypeRelationship) {
            if (typeof req.query.deleted !== 'undefined' && String(req.query.deleted as string).toLowerCase() === 'false') {
                Result.Success(req.metatypeRelationship?.keys?.filter((key) => !key.deleted_at)).asResponse(res);
                next();
                return;
            }

            Result.Success(req.metatypeRelationship?.keys).asResponse(res);
            next();
            return;
        }

        Result.Failure('metatype relationship not found', 404).asResponse(res);
        next();
    }

    private static updateMetatypeRelationshipKey(req: Request, res: Response, next: NextFunction) {
        if (req.metatypeRelationshipKey && req.metatypeRelationship) {
            // easiest way to handle full update right now is to assign
            const payload = plainToClass(MetatypeRelationshipKey, req.body as object);
            payload.id = req.metatypeRelationshipKey.id;
            payload.metatype_relationship_id = req.metatypeRelationship.id!;

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
            Result.Failure('metatype relationship or metatype relationship key not found', 404).asResponse(res);
            next();
        }
    }

    private static archiveMetatypeRelationshipKey(req: Request, res: Response, next: NextFunction) {
        if (req.metatypeRelationshipKey) {
            if (req.query.permanent !== undefined && String(req.query.permanent).toLowerCase() === 'true') {
                repo.delete(req.metatypeRelationshipKey)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => res.status(500).send(err))
                    .finally(() => next());
            } else {
                repo.archive(req.currentUser!, req.metatypeRelationshipKey)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => res.status(500).send(err))
                    .finally(() => next());
            }
        } else {
            Result.Failure('metatype relationship key not found', 404).asResponse(res);
            next();
        }
    }
}
