import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer} from '../../../middleware';
import MetatypeRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import {plainToClass} from 'class-transformer';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';
import Result from '../../../../common_classes/result';
import {QueryOptions} from '../../../../data_access_layer/repositories/repository';

const repo = new MetatypeRepository();

// This contains all routes for managing Metatypes.
export default class MetatypeRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/containers/:containerID/metatypes', ...middleware, authInContainer('write', 'ontology'), this.createMetatype);
        app.get('/containers/:containerID/metatypes/:metatypeID', ...middleware, authInContainer('read', 'ontology'), this.retrieveMetatype);
        app.get('/containers/:containerID/metatypes', ...middleware, authInContainer('read', 'ontology'), this.listMetatypes);
        app.put('/containers/:containerID/metatypes/:metatypeID', ...middleware, authInContainer('write', 'ontology'), this.updateMetatype);
        app.delete('/containers/:containerID/metatypes/:metatypeID', ...middleware, authInContainer('write', 'ontology'), this.archiveMetatype);

        app.post('/containers/:containerID/metatypes/:metatypeID', ...middleware, authInContainer('read', 'ontology'), this.validateProperties);
    }
    private static createMetatype(req: Request, res: Response, next: NextFunction) {
        let toCreate: Metatype[] = [];

        if (Array.isArray(req.body)) {
            toCreate = plainToClass(Metatype, req.body);
        } else {
            toCreate = [plainToClass(Metatype, req.body as object)];
        }

        // update with the containerID
        if (req.container) {
            toCreate.forEach((metatype) => (metatype.container_id = req.container!.id!));
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

    private static retrieveMetatype(req: Request, res: Response, next: NextFunction) {
        if (req.metatype) {
            Result.Success(req.metatype).asResponse(res);
            next();
            return;
        }

        Result.Failure('metatype not found', 404).asResponse(res);
        next();
    }

    private static listMetatypes(req: Request, res: Response, next: NextFunction) {
        // we'll use a fresh repository every time to insure no leftover queries
        let repository = new MetatypeRepository();
        repository = repository.where().containerID('eq', req.params.containerID);

        if (typeof req.query.name !== 'undefined' && (req.query.name as string) !== '') {
            repository = repository.and().name('like', `%${req.query.name}%`);
        }

        if (typeof req.query.description !== 'undefined' && (req.query.description as string) !== '') {
            repository = repository.and().description('like', `%${req.query.description}%`);
        }

        if (typeof req.query.ontologyVersion !== 'undefined' && (req.query.ontologyVersion as string) !== '') {
            repository = repository.and().ontologyVersion('eq', req.query.ontologyVersion);
        }

        if (typeof req.query.modifiedAfter !== 'undefined' && (req.query.modifiedAfter as string) !== '') {
            repository = repository.and().modified_at('>', req.query.modifiedAfter);
        }

        if (typeof req.query.createdAfter !== 'undefined' && (req.query.createdAfter as string) !== '') {
            repository = repository.and().created_at('>', req.query.createdAfter);
        }

        if (typeof req.query.deleted !== 'undefined' && String(req.query.deleted as string).toLowerCase() === 'false') {
            repository = repository.and().deleted_at('is null');
        }

        if (typeof req.query.nameIn !== 'undefined' && (req.query.nameIn as string) !== '') {
            repository = repository.and().name('in', `${req.query.nameIn}`);
        }

        if (req.query.count !== undefined && String(req.query.count).toLowerCase() === 'true') {
            repository
                .count()
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    res.status(404).send(err);
                })
                .finally(() => next());
        } else {
            repository
                .list(req.query.loadKeys === undefined || String(req.query.loadKeys).toLowerCase() === 'true', {
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                    sortBy: req.query.sortBy,
                    sortDesc: req.query.sortDesc ? String(req.query.sortDesc).toLowerCase() === 'true' : undefined,
                } as QueryOptions)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    res.status(404).send(err);
                })
                .finally(() => next());
        }
    }

    private static updateMetatype(req: Request, res: Response, next: NextFunction) {
        if (req.metatype && req.container) {
            // easiest way to handle full update right now is to assign
            const payload = plainToClass(Metatype, req.body as object);
            payload.id = req.metatype.id;
            payload.container_id = req.container.id!;

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
            Result.Failure('metatype not found', 404).asResponse(res);
            next();
        }
    }

    private static archiveMetatype(req: Request, res: Response, next: NextFunction) {
        if (req.metatype) {
            if (req.query.permanent !== undefined && String(req.query.permanent).toLowerCase() === 'true') {
                repo.delete(req.metatype)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => res.status(500).send(err))
                    .finally(() => next());
            } else if (req.query.reverse !== undefined && String(req.query.reverse).toLowerCase() === 'true') {
                repo.unarchive(req.currentUser!, req.metatype)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => res.status(500).send(err))
                    .finally(() => next());
            } else {
                repo.archive(req.currentUser!, req.metatype)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => res.status(500).send(err))
                    .finally(() => next());
            }
        } else {
            Result.Failure('metatype not found', 404).asResponse(res);
            next();
        }
    }

    private static async validateProperties(req: Request, res: Response, next: NextFunction) {
        if (req.metatype && req.container) {
            const metatype = await repo.findByID(req.metatype.id!, true);

            metatype.value
                .validateAndTransformProperties(req.body)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    result.asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next());
        } else {
            Result.Failure('metatype not found', 404).asResponse(res);
            next();
        }
    }
}
