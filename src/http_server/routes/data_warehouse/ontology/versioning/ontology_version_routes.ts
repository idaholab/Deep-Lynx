import OntologyVersionRepository from '../../../../../data_access_layer/repositories/data_warehouse/ontology/versioning/ontology_version_repository';
import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer} from '../../../../middleware';
import Result from '../../../../../common_classes/result';

const repo = new OntologyVersionRepository();

export default class OntologyVersionRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.get('/containers/:containerID/ontology/versions', ...middleware, authInContainer('read', 'ontology'), this.listOntologyVersions);
        app.get(
            '/containers/:containerID/ontology/versions/:ontologyVersionID',
            ...middleware,
            authInContainer('read', 'ontology'),
            this.retrieveOntologyVersion,
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

    // just a basic list for the container
    private static listOntologyVersions(req: Request, res: Response, next: NextFunction) {
        repo.where()
            .containerID('eq', req.container!.id)
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
        }

        res.status(404).json(Result.Failure('unable to find ontology version record'));
        next();
    }

    private static rollbackOntology(req: Request, res: Response, next: NextFunction) {
        res.status(500).send('unimplemented');
        next();
    }

    private static sendVersionForApproval(req: Request, res: Response, next: NextFunction) {
        if (req.ontologyVersion) {
            repo.setStatus(req.ontologyVersion.id!, 'ready')
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        }

        res.status(404).json(Result.Failure('unable to find ontology version record'));
        next();
    }

    private static approveVersion(req: Request, res: Response, next: NextFunction) {
        if (req.ontologyVersion) {
            repo.approve(req.ontologyVersion.id!, req.currentUser!, req.container!.id!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        }

        res.status(404).json(Result.Failure('unable to find ontology version record'));
        next();
    }

    private static revokeVersionApproval(req: Request, res: Response, next: NextFunction) {
        if (req.ontologyVersion) {
            repo.revokeApproval(req.ontologyVersion.id!, req.body.message)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        }

        res.status(404).json(Result.Failure('unable to find ontology version record'));
        next();
    }

    private static publishVersion(req: Request, res: Response, next: NextFunction) {
        if (req.ontologyVersion) {
            repo.setStatus(req.ontologyVersion.id!, 'published')
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        }

        res.status(404).json(Result.Failure('unable to find ontology version record'));
        next();
    }
}
