import {Request, Response, NextFunction, Application} from 'express';
import {authInContainer} from '../../../middleware';
import MetatypeRelationshipRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_repository';
import {plainToClass} from 'class-transformer';
import MetatypeRelationship from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import Result from '../../../../common_classes/result';
import {QueryOptions} from '../../../../data_access_layer/repositories/repository';

const repo = new MetatypeRelationshipRepository();

// This contains all routes for managing Metatype Relationships.
export default class MetatypeRelationshipRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/containers/:containerID/metatype_relationships', ...middleware, authInContainer('write', 'ontology'), this.createMetatypeRelationship);
        app.get(
            '/containers/:containerID/metatype_relationships/:metatypeRelationshipID',
            ...middleware,
            authInContainer('read', 'ontology'),
            this.retrieveMetatypeRelationship,
        );
        app.get('/containers/:containerID/metatype_relationships', ...middleware, authInContainer('read', 'ontology'), this.listMetatypeRelationships);
        app.put(
            '/containers/:containerID/metatype_relationships/:metatypeRelationshipID',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.updateMetatypeRelationship,
        );
        app.delete(
            '/containers/:containerID/metatype_relationships/:metatypeRelationshipID',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.archiveMetatypeRelationship,
        );
    }

    private static createMetatypeRelationship(req: Request, res: Response, next: NextFunction) {
        let toCreate: MetatypeRelationship[] = [];

        if (Array.isArray(req.body)) {
            toCreate = plainToClass(MetatypeRelationship, req.body);
        } else {
            toCreate = [plainToClass(MetatypeRelationship, req.body as object)];
        }

        // update with the containerID
        if (req.container) {
            toCreate.forEach((relationship) => {
                relationship.container_id = req.container!.id!;

                if (!relationship.ontology_version) {
                    relationship.ontology_version = req.activeOntologyVersion?.id;
                }
            });
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
                Result.Error(err).asResponse(res);
            })
            .finally(() => next());
    }

    private static retrieveMetatypeRelationship(req: Request, res: Response, next: NextFunction) {
        if (req.metatypeRelationship) {
            Result.Success(req.metatypeRelationship).asResponse(res);
            next();
            return;
        }

        Result.Failure('metatype relationship not found', 404).asResponse(res);
        next();
    }

    private static listMetatypeRelationships(req: Request, res: Response, next: NextFunction) {
        let repository = new MetatypeRelationshipRepository();
        repository = repository.where().containerID('eq', req.params.containerID);

        if (typeof req.query.name !== 'undefined' && (req.query.name as string) !== '') {
            repository = repository.and().name('like', `%${req.query.name}%`);
        }

        if (typeof req.query.description !== 'undefined' && (req.query.description as string) !== '') {
            repository = repository.and().description('like', `%${req.query.description}%`);
        }

        if (typeof req.query.ontologyVersion !== 'undefined' && (req.query.ontologyVersion as string) !== '') {
            repository = repository.and().ontologyVersion('eq', req.query.ontologyVersion);
        } else {
            if (req.activeOntologyVersion) {
                repository = repository.and().ontologyVersion('eq', req.activeOntologyVersion.id);
            } else {
                repository = repository.and().ontologyVersion('is null');
            }
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
                    Result.Failure(err, 404).asResponse(res);
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
                    Result.Failure(err, 404).asResponse(res);
                })
                .finally(() => next());
        }
    }

    private static updateMetatypeRelationship(req: Request, res: Response, next: NextFunction) {
        if (req.metatypeRelationship && req.container) {
            // easiest way to handle full update right now is to assign
            const payload = plainToClass(MetatypeRelationship, req.body as object);
            payload.id = req.metatypeRelationship.id;
            payload.container_id = req.container.id!;

            repo.save(payload, req.currentUser!)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    Result.Success(payload).asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure('metatype relationship not found', 404).asResponse(res);
            next();
        }
    }

    private static archiveMetatypeRelationship(req: Request, res: Response, next: NextFunction) {
        if (req.metatypeRelationship) {
            if (req.query.permanent !== undefined && String(req.query.permanent).toLowerCase() === 'true') {
                repo.delete(req.metatypeRelationship)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => {
                        Result.Error(err).asResponse(res);
                    })
                    .finally(() => next());
            } else if (req.query.reverse !== undefined && String(req.query.reverse).toLowerCase() === 'true') {
                repo.unarchive(req.currentUser!, req.metatypeRelationship)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => {
                        Result.Error(err).asResponse(res);
                    })
                    .finally(() => next());
            } else {
                repo.archive(req.currentUser!, req.metatypeRelationship)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => {
                        Result.Error(err).asResponse(res);
                    })
                    .finally(() => next());
            }
        } else {
            Result.Failure('metatype relationship not found', 404).asResponse(res);
            next();
        }
    }
}
