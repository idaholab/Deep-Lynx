import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer} from '../../../../middleware';
import ChangelistRepository from '../../../../../data_access_layer/repositories/data_warehouse/ontology/versioning/changelist_repository';
import {plainToClass} from 'class-transformer';
import Changelist from '../../../../../domain_objects/data_warehouse/ontology/versioning/changelist';
import Result from '../../../../../common_classes/result';

const repo = new ChangelistRepository();

export default class ChangelistRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.get('/containers/:containerID/ontology/changelists', ...middleware, authInContainer('read', 'ontology'), this.listChangelists);
        app.post('/containers/:containerID/ontology/changelists', ...middleware, authInContainer('read', 'ontology'), this.createChangelist);
        app.get('/containers/:containerID/ontology/changelists/:changelistID', ...middleware, authInContainer('read', 'ontology'), this.retrieveChangelist);
        app.put('/containers/:containerID/ontology/changelists/:changelistID', ...middleware, authInContainer('write', 'ontology'), this.updateChangelist);
        app.delete('/containers/:containerID/ontology/changelists/:changelistID', ...middleware, authInContainer('write', 'ontology'), this.deleteChangelist);
        app.post(
            '/containers/:containerID/ontology/changelists/:changelistID/apply',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.applyChangelist,
        );
        app.get('/containers/:containerID/ontology/changelists/:changelistID/approve', ...middleware, authInContainer('read', 'ontology'), this.listApprovals);
        app.post(
            '/containers/:containerID/ontology/changelists/:changelistID/approve',
            ...middleware,
            authInContainer('write', 'containers'),
            this.approveChangelist,
        );
        app.delete(
            '/containers/:containerID/ontology/changelists/:changelistID/approve',
            ...middleware,
            authInContainer('write', 'ontology'),
            this.unapproveChangelist,
        );
    }

    // just a basic list for the container
    private static listChangelists(req: Request, res: Response, next: NextFunction) {
        let repository = new ChangelistRepository();

        repository = repository.where().containerID('eq', req.container!.id);

        if (typeof req.query.status !== 'undefined' && (req.query.status as string) !== '') {
            repository = repository.and().status('eq', `${req.query.status}`);
        }

        if (typeof req.query.createdBy !== 'undefined' && (req.query.createdBy as string) !== '') {
            repository = repository.and().createdBy('eq', `${req.query.createdBy}`);
        }

        repository
            .list()
            .then((results) => {
                results.asResponse(res);
            })
            .catch((e) => res.status(500).send(e))
            .finally(() => next());
    }

    private static createChangelist(req: Request, res: Response, next: NextFunction) {
        const toCreate = plainToClass(Changelist, req.body as object);

        if (req.container) {
            toCreate.container_id = req.container.id;
        }

        repo.save(toCreate, req.currentUser!)
            .then((result) => {
                result.asResponse(res);
            })
            .catch((e) => res.status(500).send(e))
            .finally(() => next());
    }

    private static retrieveChangelist(req: Request, res: Response, next: NextFunction) {
        if (req.changelist) {
            Result.Success(req.changelist).asResponse(res);
            next();
            return;
        }

        res.status(404).json(Result.Failure('unable to find changelist'));
        next();
    }

    private static updateChangelist(req: Request, res: Response, next: NextFunction) {
        if (req.changelist) {
            const toUpdate = plainToClass(Changelist, req.body as object);

            Object.assign(req.changelist, toUpdate);

            repo.save(req.changelist, req.currentUser!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        } else {
            res.status(404).json(Result.Failure('unable to find changelist'));
            next();
        }
    }

    private static deleteChangelist(req: Request, res: Response, next: NextFunction) {
        if (req.changelist) {
            repo.delete(req.changelist)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        } else {
            res.status(200);
            next();
        }
    }

    private static applyChangelist(req: Request, res: Response, next: NextFunction) {
        if (req.changelist) {
            res.status(500).send('unimplemented');
            next();
        } else {
            res.status(404).send('changelist not found');
            next();
        }
    }

    private static listApprovals(req: Request, res: Response, next: NextFunction) {
        if (req.changelist) {
            repo.listApprovals(req.changelist.id!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        } else {
            res.status(200);
            next();
        }
    }

    private static approveChangelist(req: Request, res: Response, next: NextFunction) {
        if (req.changelist) {
            repo.approveChangelist(req.currentUser!, req.changelist.id!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        } else {
            res.status(200);
            next();
        }
    }

    private static unapproveChangelist(req: Request, res: Response, next: NextFunction) {
        if (req.changelist) {
            repo.revokeApproval(req.changelist.id!, req.currentUser!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        } else {
            res.status(200);
            next();
        }
    }
}
