import {Application, NextFunction, Request, Response} from "express"
import {authInContainer} from "../../../middleware";
import {plainToClass} from "class-transformer";
import DataSourceRecord from "../../../../data_warehouse/import/data_source";
import Result from "../../../../common_classes/result";
import DataSourceRepository, {DataSourceFactory} from "../../../../data_access_layer/repositories/data_warehouse/import/data_source_repository";
import {QueryOptions} from "../../../../data_access_layer/repositories/repository";

const dataSourceRepo = new DataSourceRepository()
const dataSourceFactory = new DataSourceFactory()

// This contains all routes pertaining to DataSources.
export default class DataSourceRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post("/containers/:containerID/import/datasources", ...middleware, authInContainer("write", "data"), this.createDataSource);
        app.get("/containers/:containerID/import/datasources", ...middleware, authInContainer("read", "data"), this.listDataSources);
        app.get("/containers/:containerID/import/datasources/:sourceID", ...middleware, authInContainer("read", "data"), this.retrieveDataSource);
        app.put("/containers/:containerID/import/datasources/:sourceID", ...middleware, authInContainer("read", "data"), this.updateDataSource);
        app.delete("/containers/:containerID/import/datasources/:sourceID", ...middleware, authInContainer("read", "data"), this.deleteDataSource);

        app.post("/containers/:containerID/import/datasources/:sourceID/active", ...middleware, authInContainer("read", "data"), this.setActive);
        app.delete("/containers/:containerID/import/datasources/:sourceID/active", ...middleware, authInContainer("read", "data"), this.setInactive);
    }

    private static createDataSource(req: Request, res: Response, next: NextFunction) {
        if(req.container) {
            const currentUser = req.currentUser!

            const payload = plainToClass(DataSourceRecord, req.body as object)
            payload.container_id = req.container.id!

            const dataSource = dataSourceFactory.fromDataSourceRecord(payload)
            if(!dataSource) {
                res.sendStatus(500)
                next()
                return
            }

            dataSourceRepo.save(dataSource, currentUser)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res)
                        return
                    }

                    Result.Success(dataSource.DataSourceRecord).asResponse(res)
                })
                .catch((err) => {
                    res.status(500).send(err)
                })
                .finally(() => next())
        } else {
            Result.Failure(`unable to find container`).asResponse(res)
            next()
        }
    }

    private static updateDataSource(req: Request, res: Response, next: NextFunction) {
        if(req.container && req.dataSource) {
            const currentUser = req.currentUser!

            Object.assign(req.dataSource.DataSourceRecord, req.body as object)

            dataSourceRepo.save(req.dataSource, currentUser)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res)
                        return
                    }

                    Result.Success(req.dataSource!.DataSourceRecord).asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        } else {
            Result.Failure(`unable to find container or data source `).asResponse(res)
            next()
        }
    }

    private static retrieveDataSource(req: Request, res: Response, next: NextFunction) {
        if(req.dataSource) {
            Result.Success(req.dataSource.DataSourceRecord).asResponse(res)
            next()
        } else {
            Result.Failure(`unable to find data source`, 404).asResponse(res)
            next()
        }
    }

    private static setActive(req: Request, res: Response, next: NextFunction) {
        if(req.dataSource) {
            dataSourceRepo.setActive(req.dataSource, req.currentUser!)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        } else {
            Result.Failure(`unable to find data source`, 404).asResponse(res)
            next()
        }
    }

    private static setInactive(req: Request, res: Response, next: NextFunction) {
        if(req.dataSource) {
            dataSourceRepo.setInactive(req.dataSource, req.currentUser!)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        } else {
            Result.Failure(`unable to find data source`, 404).asResponse(res)
            next()
        }
    }

    private static listDataSources(req: Request, res: Response, next: NextFunction) {
        let repository = new DataSourceRepository()
        repository = repository.where().containerID("eq", req.container!.id!)

        if (req.query.count !== undefined) {
            if (req.query.count === "true") {
                repository.count()
                    .then((result) => {
                        result.asResponse(res)
                    })
                    .catch((err) => {
                        res.status(404).send(err)
                    })
                    .finally(() => next())
            }
        } else {
            // @ts-ignore
            repository.list({
                limit: (req.query.limit) ? +req.query.limit : undefined,
                offset: (req.query.offset) ? +req.query.offset : undefined,
                sortBy: req.query.sortBy,
                sortDesc: (req.query.sortDesc) ? req.query.sortDesc === "true" : undefined
            } as QueryOptions)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res)
                        return
                    }

                    Result.Success(result.value.map(source => source?.DataSourceRecord)).asResponse(res)
                })
                .catch((err) => {
                    res.status(404).send(err)
                })
                .finally(() => next())
        }
    }

    private static deleteDataSource(req: Request, res: Response, next: NextFunction) {
        if(req.dataSource) {
            dataSourceRepo.delete(req.dataSource)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        } else {
            Result.Failure(`unable to find data source`, 404).asResponse(res)
            next()
        }
    }
}

