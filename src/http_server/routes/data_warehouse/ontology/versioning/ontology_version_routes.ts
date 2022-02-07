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
}
