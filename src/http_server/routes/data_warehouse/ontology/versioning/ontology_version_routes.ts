import OntologyVersionRepository from '../../../../../data_access_layer/repositories/data_warehouse/ontology/versioning/ontology_version_repository';
import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer} from '../../../../middleware';
import Result from '../../../../../common_classes/result';
import {plainToClass} from 'class-transformer';
import OntologyVersion from '../../../../../domain_objects/data_warehouse/ontology/versioning/ontology_version';

const repo = new OntologyVersionRepository();

export default class OntologyVersionRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.get('/containers/:containerID/ontology/versions', ...middleware, authInContainer('read', 'ontology'), this.listOntologyVersions);
        app.post('/containers/:containerID/ontology/versions', ...middleware, authInContainer('write', 'ontology'), this.createOntologyVersion);
        app.get(
            '/containers/:containerID/ontology/versions/:ontologyVersionID',
            ...middleware,
            authInContainer('read', 'ontology'),
            this.retrieveOntologyVersion,
        );

        app.delete(
            '/containers/:containerID/ontology/versions/:ontologyVersionID',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.deleteOntologyVersion,
        );

        app.post(
            '/containers/:containerID/ontology/versions/:ontologyVersionID/rollback',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.rollbackOntology,
        );

        app.post(
            '/containers/:containerID/ontology/versions/:ontologyVersionID/approve',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.sendVersionForApproval,
        );

        app.post(
            '/containers/:containerID/ontology/versions/:ontologyVersionID/publish',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.publishVersion,
        );

        app.put(
            '/containers/:containerID/ontology/versions/:ontologyVersionID/approve',
            ...middleware,
            authInContainer('write', 'containers'),
            this.approveVersion,
        );

        app.delete(
            '/containers/:containerID/ontology/versions/:ontologyVersionID/approve',
            ...middleware,
            authInContainer('write', 'containers'),
            this.revokeVersionApproval,
        );
    }

    private static createOntologyVersion(req: Request, res: Response, next: NextFunction) {
        const toCreate = plainToClass(OntologyVersion, req.body as object);

        if (req.container) {
            toCreate.container_id = req.container.id;
        }

        repo.save(
            toCreate,
            req.currentUser!,
            typeof req.query.baseOntologyVersion !== 'undefined' && (req.query.baseOntologyVersion as string) !== ''
                ? (req.query.baseOntologyVersion as string)
                : undefined,
        )
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

    // just a basic list for the container
    private static listOntologyVersions(req: Request, res: Response, next: NextFunction) {
        let repository = new OntologyVersionRepository();

        repository = repository.where().containerID('eq', req.container!.id);

        if (typeof req.query.status !== 'undefined' && (req.query.status as string) !== '') {
            repository = repository.and().status('eq', req.query.status);
        }

        if (typeof req.query.createdBy !== 'undefined' && (req.query.createdBy as string) !== '') {
            repository = repository.and().createdBy('eq', req.query.createdBy);
        }

        repository
            .list({
                sortBy: 'id',
                sortDesc: true,
            })
            .then((results) => {
                results.asResponse(res);
            })
            .catch((e) => res.status(500).send(e))
            .finally(() => next());
    }

    private static retrieveOntologyVersion(req: Request, res: Response, next: NextFunction) {
        if (req.ontologyVersion) {
            Result.Success(req.ontologyVersion).asResponse(res);
            next();
            return;
        } else {
            res.status(404).json(Result.Failure('unable to find ontology version record'));
            next();
        }
    }

    private static deleteOntologyVersion(req: Request, res: Response, next: NextFunction) {
        if (req.ontologyVersion) {
            repo.delete(req.ontologyVersion)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        } else {
            res.status(404).json(Result.Failure('unable to find ontology version record'));
            next();
        }
    }

    private static rollbackOntology(req: Request, res: Response, next: NextFunction) {
        res.status(500).send('unimplemented');
        next();
    }

    private static sendVersionForApproval(req: Request, res: Response, next: NextFunction) {
        if (req.ontologyVersion) {
            repo.setStatus(req.ontologyVersion.id!, 'pending')
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        } else {
            res.status(404).json(Result.Failure('unable to find ontology version record'));
            next();
        }
    }

    private static approveVersion(req: Request, res: Response, next: NextFunction) {
        if (req.ontologyVersion) {
            repo.approve(req.ontologyVersion.id!, req.currentUser!, req.container!.id!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        } else {
            res.status(404).json(Result.Failure('unable to find ontology version record'));
            next();
        }
    }

    private static revokeVersionApproval(req: Request, res: Response, next: NextFunction) {
        if (req.ontologyVersion) {
            repo.revokeApproval(req.ontologyVersion.id!, req.body.message)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        } else {
            res.status(404).json(Result.Failure('unable to find ontology version record'));
            next();
        }
    }

    private static publishVersion(req: Request, res: Response, next: NextFunction) {
        if (req.ontologyVersion) {
            repo.publish(req.ontologyVersion.id!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        } else {
            res.status(404).json(Result.Failure('unable to find ontology version record'));
            next();
        }
    }
}
