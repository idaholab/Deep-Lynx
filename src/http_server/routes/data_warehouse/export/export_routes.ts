/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Request, Response, NextFunction, Application } from 'express';
import { authInContainer } from '../../../middleware';
import ExporterRepository, { ExporterFactory } from '../../../../data_access_layer/repositories/data_warehouse/export/export_repository';
import { plainToClass } from 'class-transformer';
import ExportRecord from '../../../../domain_objects/data_warehouse/export/export';
import Result from '../../../../common_classes/result';
import { QueryOptions } from '../../../../data_access_layer/repositories/repository';

const exporterRepo = new ExporterRepository();
const exporterFactory = new ExporterFactory();

// Endpoints specific to data exporting
export default class ExportRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.get('/containers/:containerID/data/export', ...middleware, authInContainer('read', 'data'), this.listExports);
        app.post('/containers/:containerID/data/export', ...middleware, authInContainer('write', 'data'), this.exportDataFromContainer);
        app.get('/containers/:containerID/data/export/:exportID', ...middleware, authInContainer('read', 'data'), this.getExport);
        app.post('/containers/:containerID/data/export/:exportID', ...middleware, authInContainer('write', 'data'), this.restartExport);
        app.put('/containers/:containerID/data/export/:exportID', ...middleware, authInContainer('write', 'data'), this.stopExport);
        app.delete('/containers/:containerID/data/export/:exportID', ...middleware, authInContainer('write', 'data'), this.deleteExport);
    }

    private static exportDataFromContainer(req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            const currentUser = req.currentUser!;
            const payload = plainToClass(ExportRecord, req.body as object);
            payload.container_id = req.container.id!;

            const exporter = exporterFactory.fromExport(payload);
            if (!exporter) {
                res.sendStatus(500);
                next();
                return;
            }

            exporterRepo
                .save(exporter, currentUser)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    exporter
                        .Initiate(currentUser)
                        .then((result) => {
                            result.asResponse(res);
                        })
                        .catch((err) => res.status(500).send(err))
                        .finally(() => next());
                })
                .catch((err) => res.status(500).send(err));
        } else {
            Result.Failure(`unable to find container to created export on`).asResponse(res);
            next();
        }
    }

    private static getExport(req: Request, res: Response, next: NextFunction) {
        if (req.exporter) {
            Result.Success(req.exporter.ExportRecord).asResponse(res);
            next();
        } else {
            Result.Failure(`unable to find export record`).asResponse(res);
            next();
        }
    }

    private static listExports(req: Request, res: Response, next: NextFunction) {
        // we'll use a fresh repository to insure no leftover queries
        let repository = new ExporterRepository();
        repository = repository.where().containerID('eq', req.params.containerID);

        if (req.query.count !== undefined) {
            if (req.query.count === 'true') {
                repository
                    .count()
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => {
                        res.status(404).send(err);
                    })
                    .finally(() => next());
            }
        } else {
            // @ts-ignore
            repository
                .list({
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                    sortBy: req.query.sortBy,
                    sortDesc: req.query.sortDesc ? req.query.sortDesc === 'true' : undefined
                } as QueryOptions)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    Result.Success(result.value.map((exporter) => exporter?.ExportRecord)).asResponse(res);
                })
                .catch((err) => {
                    res.status(404).send(err);
                })
                .finally(() => next());
        }
    }

    private static restartExport(req: Request, res: Response, next: NextFunction) {
        if (req.exporter) {
            req.exporter
                .Restart(req.currentUser!)
                .then((started) => {
                    started.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        } else {
            Result.Failure(`unable to find export record`).asResponse(res);
            next();
        }
    }

    private static stopExport(req: Request, res: Response, next: NextFunction) {
        if (req.exporter) {
            req.exporter
                .Stop(req.currentUser!)
                .then((started) => {
                    started.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        } else {
            Result.Failure(`unable to find export record`).asResponse(res);
            next();
        }
    }

    private static deleteExport(req: Request, res: Response, next: NextFunction) {
        if (req.exporter) {
            exporterRepo
                .delete(req.exporter, req.currentUser)
                .then((started) => {
                    started.asResponse(res);
                })
                .catch((e) => res.status(500).send(e))
                .finally(() => next());
        } else {
            Result.Failure(`unable to find export record`).asResponse(res);
            next();
        }
    }
}
