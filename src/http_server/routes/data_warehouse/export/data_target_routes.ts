import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer} from '../../../middleware';
import {plainToClass} from 'class-transformer';
import DataTargetRecord from '../../../../domain_objects/data_warehouse/export/data_target';
import Result from '../../../../common_classes/result';
import DataTargetRepository, {DataTargetFactory} from '../../../../data_access_layer/repositories/data_warehouse/export/data_target_repository';
import {QueryOptions} from '../../../../data_access_layer/repositories/repository';

const dataTargetRepo = new DataTargetRepository();
const dataTargetFactory = new DataTargetFactory();

// This contains all routes pertaining to DataTargets.
export default class DataTargetRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/containers/:containerID/export/datatargets', ...middleware, authInContainer('write', 'data'), this.createDataTarget);
        app.get('/containers/:containerID/export/datatargets', ...middleware, authInContainer('read', 'data'), this.listDataTargets);
        app.get('/containers/:containerID/export/datatargets/:dataTargetID', ...middleware, authInContainer('read', 'data'), this.retrieveDataTarget);
        app.put('/containers/:containerID/export/datatargets/:dataTargetID', ...middleware, authInContainer('write', 'data'), this.updateDataTarget);
        app.delete('/containers/:containerID/export/datatargets/:dataTargetID', ...middleware, authInContainer('write', 'data'), this.deleteDataTarget);

        app.post('/containers/:containerID/export/datatargets/:dataTargetID/active', ...middleware, authInContainer('write', 'data'), this.setActive);
        app.delete('/containers/:containerID/export/datatargets/:dataTargetID/active', ...middleware, authInContainer('write', 'data'), this.setInactive);        
    }

    private static createDataTarget(req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            const currentUser = req.currentUser!;

            const payload = plainToClass(DataTargetRecord, req.body as object);
            payload.container_id = req.container.id!;

            const dataTarget = dataTargetFactory.fromDataTargetRecord(payload);
            if (!dataTarget) {
                // we make an assumption here as to why this fails - it's a fairly
                // safe assumption as that's the only way this could actually fail
                Result.Failure(`unknown data target adapter type`).asResponse(res);
                next();
                return;
            }

            dataTargetRepo
                .save(dataTarget, currentUser)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    Result.Success(dataTarget.DataTargetRecord).asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`unable to find container`).asResponse(res);
            next();
        }
    }

    private static updateDataTarget(req: Request, res: Response, next: NextFunction) {
        if (req.container && req.dataTarget) {
            const currentUser = req.currentUser!;

            const dataTargetRecord = plainToClass(DataTargetRecord, req.body as object);
            Object.assign(req.dataTarget.DataTargetRecord!, dataTargetRecord);

            dataTargetRepo
                .save(req.dataTarget, currentUser)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    Result.Success(req.dataTarget?.DataTargetRecord).asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`unable to find container or data target `).asResponse(res);
            next();
        }
    }

    private static retrieveDataTarget(req: Request, res: Response, next: NextFunction) {
        if (req.dataTarget) {
            Result.Success(req.dataTarget.DataTargetRecord).asResponse(res);
            next();
        } else {
            Result.Failure(`unable to find data target`, 404).asResponse(res);
            next();
        }
    }

    private static setActive(req: Request, res: Response, next: NextFunction) {
        if (req.dataTarget) {
            dataTargetRepo
                .setActive(req.dataTarget, req.currentUser!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`unable to find data target`, 404).asResponse(res);
            next();
        }
    }

    private static setInactive(req: Request, res: Response, next: NextFunction) {
        if (req.dataTarget) {
            dataTargetRepo
                .setInactive(req.dataTarget, req.currentUser!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`unable to find data target`, 404).asResponse(res);
            next();
        }
    }

    private static listDataTargets(req: Request, res: Response, next: NextFunction) {
        let repository = new DataTargetRepository();
        repository = repository.where().containerID('eq', req.container!.id!);

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
                .and()
                .archived(String(req.query.archived).toLowerCase() === 'true')
                .or()
                .containerID('eq', req.container!.id) // we have to specify the container again in an OR statement
                .and()
                .archived(false) // we always want to at least list all unarchived ones
                .list({
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                    sortBy: req.query.sortBy,
                    sortDesc: req.query.sortDesc ? String(req.query.sortDesc).toLowerCase() === 'true' : undefined,
                } as QueryOptions)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    Result.Success(result.value.map((target) => target?.DataTargetRecord!)).asResponse(res);
                })
                .catch((err) => {
                    Result.Failure(err, 404).asResponse(res);
                })
                .finally(() => next());
        }
    }

    private static deleteDataTarget(req: Request, res: Response, next: NextFunction) {
        if (req.dataTarget && String(req.query.archive).toLowerCase() === 'true') {
            dataTargetRepo
                .archive(req.currentUser!, req.dataTarget)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else if (req.dataTarget) {
            dataTargetRepo
                .delete(req.dataTarget)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => Result.Error(err).asResponse(res))
                .finally(() => next());
        } else {
            Result.Failure(`unable to find data target`, 404).asResponse(res);
            next();
        }
    }
}
