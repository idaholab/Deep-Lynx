import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer} from '../../../middleware';
import MetatypeKeyRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/metatype_key_repository';
import {plainToClass} from 'class-transformer';
import MetatypeKey from '../../../../domain_objects/data_warehouse/ontology/metatype_key';
import Result from '../../../../common_classes/result';

const repo = new MetatypeKeyRepository();

// This contains all routes pertaining to MetatypeKeys and their management.
export default class MetatypeKeyRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/containers/:containerID/metatypes/:metatypeID/keys', ...middleware, authInContainer('write', 'ontology'), this.createMetatypeKey);
        app.get(
            '/containers/:containerID/metatypes/:metatypeID/keys/:metatypeKeyID',
            ...middleware,
            authInContainer('read', 'ontology'),
            this.retrieveMetatypeKey,
        );
        app.get('/containers/:containerID/metatypes/:metatypeID/keys', ...middleware, authInContainer('read', 'ontology'), this.listMetatypeKeys);
        app.delete(
            '/containers/:containerID/metatypes/:metatypeID/keys/:metatypeKeyID',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.archiveMetatypeKey,
        );
        app.put(
            '/containers/:containerID/metatypes/:metatypeID/keys/:metatypeKeyID',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.updateMetatypeKey,
        );
    }

    private static createMetatypeKey(req: Request, res: Response, next: NextFunction) {
        let toCreate: MetatypeKey[] = [];

        if (Array.isArray(req.body)) {
            toCreate = plainToClass(MetatypeKey, req.body);
        } else {
            toCreate = [plainToClass(MetatypeKey, req.body as object)];
        }

        // update with the metatypeID
        if (req.metatype) {
            toCreate.forEach((key) => (key.metatype_id = req.metatype!.id!));
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

    private static retrieveMetatypeKey(req: Request, res: Response, next: NextFunction) {
        if (req.metatypeKey) {
            Result.Success(req.metatypeKey).asResponse(res);
            next();
            return;
        }

        Result.Failure(`metatype key not found`, 404).asResponse(res);
        next();
    }

    private static listMetatypeKeys(req: Request, res: Response, next: NextFunction) {
        // we don't have to do anything fancy here, simply return the metatype in
        // the request's keys
        if (req.metatype) {
            Result.Success(req.metatype.keys).asResponse(res);
            next();
            return;
        }

        Result.Failure('metatype not found', 404).asResponse(res);
        next();
    }

    private static updateMetatypeKey(req: Request, res: Response, next: NextFunction) {
        if (req.metatypeKey && req.metatype) {
            // easiest way to handle full update right now is to assign
            const payload = plainToClass(MetatypeKey, req.body as object);
            payload.id = req.metatypeKey.id;
            payload.metatype_id = req.metatype.id!;

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
            Result.Failure('metatype or metatype key not found', 404).asResponse(res);
            next();
        }
    }

    private static archiveMetatypeKey(req: Request, res: Response, next: NextFunction) {
        if (req.metatypeKey) {
            if (req.query.permanent !== undefined && String(req.query.permanent).toLowerCase() === 'true') {
                repo.delete(req.metatypeKey)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => res.status(500).send(err))
                    .finally(() => next());
            } else {
                repo.archive(req.currentUser!, req.metatypeKey)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => res.status(500).send(err))
                    .finally(() => next());
            }
        } else {
            Result.Failure('metatype key not found', 404).asResponse(res);
            next();
        }
    }
}
