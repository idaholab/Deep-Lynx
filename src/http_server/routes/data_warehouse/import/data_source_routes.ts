import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer} from '../../../middleware';
import {plainToClass} from 'class-transformer';
import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';
import Result from '../../../../common_classes/result';
import DataSourceRepository, {DataSourceFactory} from '../../../../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import {QueryOptions} from '../../../../data_access_layer/repositories/repository';
import DataStagingRepository from '../../../../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import Authorization from '../../../../domain_objects/access_management/authorization/authorization';
import DataSourceMapper from '../../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';

const dataSourceRepo = new DataSourceRepository();
const dataSourceFactory = new DataSourceFactory();

// This contains all routes pertaining to DataSources.
export default class DataSourceRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/containers/:containerID/import/datasources', ...middleware, authInContainer('write', 'data'), this.createDataSource);
        app.get('/containers/:containerID/import/datasources', ...middleware, authInContainer('read', 'data'), this.listDataSources);
        app.get('/containers/:containerID/import/datasources/:sourceID', ...middleware, authInContainer('read', 'data'), this.retrieveDataSource);
        app.put('/containers/:containerID/import/datasources/:sourceID', ...middleware, authInContainer('write', 'data'), this.updateDataSource);
        app.delete('/containers/:containerID/import/datasources/:sourceID', ...middleware, authInContainer('write', 'data'), this.deleteDataSource);

        app.get('/containers/:containerID/import/datasources/:sourceID/data', ...middleware, authInContainer('read', 'data'), this.dataCount);
        app.get('/containers/:containerID/import/datasources/:sourceID/download', ...middleware, authInContainer('read', 'data'), this.downloadData);

        app.post('/containers/:containerID/import/datasources/:sourceID/active', ...middleware, authInContainer('write', 'data'), this.setActive);
        app.delete('/containers/:containerID/import/datasources/:sourceID/active', ...middleware, authInContainer('write', 'data'), this.setInactive);

        app.post('/containers/:containerID/import/datasources/:sourceID/reprocess', ...middleware, authInContainer('write', 'data'), this.reprocessDataSource);
    }

    private static createDataSource(req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            const currentUser = req.currentUser!;

            const payload = plainToClass(DataSourceRecord, req.body as object);
            payload.container_id = req.container.id!;

            // verify that payload contains name
            if (!payload.name) {
                Result.Failure(`data source must contain a name`).asResponse(res);
                next();
                return;
            }

            const dataSource = dataSourceFactory.fromDataSourceRecord(payload);
            if (!dataSource) {
                // we make an assumption here as to why this fails - it's a fairly
                // safe assumption as that's the only way this could actually fail
                Result.Failure(`unknown data source adapter type`).asResponse(res);
                next();
                return;
            }

            dataSourceRepo
                .save(dataSource, currentUser)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    Result.Success(dataSource.DataSourceRecord).asResponse(res);
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

    private static updateDataSource(req: Request, res: Response, next: NextFunction) {
        if (req.container && req.dataSource && req.dataSource.DataSourceRecord) {
            const currentUser = req.currentUser!;

            Object.assign(req.dataSource.DataSourceRecord, req.body as object);

            dataSourceRepo
                .save(req.dataSource, currentUser)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    Result.Success(req.dataSource?.DataSourceRecord).asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`unable to find container or data source `).asResponse(res);
            next();
        }
    }

    private static dataCount(req: Request, res: Response, next: NextFunction) {
        if (req.dataSource) {
            const stagingRepo = new DataStagingRepository();

            stagingRepo
                .where()
                .dataSourceID('eq', req.dataSource.DataSourceRecord?.id)
                .count()
                .then((count) => {
                    count.asResponse(res);
                    next();
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                });
        } else {
            Result.Failure(`unable to find data source`, 404).asResponse(res);
            next();
        }
    }

    private static downloadData(req: Request, res: Response, next: NextFunction) {
        if (req.dataSource || req.dataSource!.DataSourceRecord?.adapter_type !== 'timeseries') {
            const mapper = DataSourceMapper.Instance;

            mapper
                .CopyFromHypertable(
                    req.dataSource?.DataSourceRecord!,
                    req.query.startTime ? (req.query.startTime as string) : undefined,
                    req.query.endTime ? (req.query.endTime as string) : undefined,
                )
                .then((stream) => {
                    if (stream.isError) {
                        stream.asResponse(res);
                        next();
                        return;
                    }

                    res.attachment(`${req.dataSource?.DataSourceRecord?.name} output.csv`);
                    stream.value.pipe(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                });
        } else {
            Result.Failure(`unable to find data source`, 404).asResponse(res);
            next();
        }
    }

    private static retrieveDataSource(req: Request, res: Response, next: NextFunction) {
        if (req.dataSource) {
            Result.Success(req.dataSource.DataSourceRecord).asResponse(res);
            next();
        } else {
            Result.Failure(`unable to find data source`, 404).asResponse(res);
            next();
        }
    }

    private static setActive(req: Request, res: Response, next: NextFunction) {
        if (req.dataSource) {
            dataSourceRepo
                .setActive(req.dataSource, req.currentUser!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`unable to find data source`, 404).asResponse(res);
            next();
        }
    }

    private static setInactive(req: Request, res: Response, next: NextFunction) {
        if (req.dataSource) {
            dataSourceRepo
                .setInactive(req.dataSource, req.currentUser!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`unable to find data source`, 404).asResponse(res);
            next();
        }
    }

    private static listDataSources(req: Request, res: Response, next: NextFunction) {
        let repository = new DataSourceRepository();
        repository = repository.where().containerID('eq', req.container!.id!);

        if (req.query.count !== undefined) {
            if (String(req.query.count).toLowerCase() === 'true') {
                repository
                    .count()
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => {
                        Result.Failure(err, 404).asResponse(res);
                    })
                    .finally(() => next());
            }
        } else {
            repository
                .and()
                .timeseries(String(req.query.timeseries).toLowerCase() === 'true')
                .and(
                    new DataSourceRepository()
                        .archived(String(req.query.archived).toLowerCase() === 'true')
                        .or()
                        .archived(false), // we always want to at least list all unarchived ones
                )
                .list({
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                    sortBy: req.query.sortBy,
                    sortDesc: req.query.sortDesc ? String(req.query.sortDesc).toLowerCase() === 'true' : undefined,
                } as QueryOptions)
                .then(async (result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    // check if user as write access on datasources and that 'decrypted' was specified as true
                    const writePermissions = await Authorization.AuthUser(req.currentUser, 'write', 'data', req.params.containerID);
                    const decrypted = writePermissions && req.query.decrypted === 'true';

                    // if 'decrypted' is true, this will return usernames and passwords as part of the listed datasources.
                    // Otherwise data sources will be listed without this information. This is used to enable adapters such as P6
                    // to access this user-specified data without DeepLynx having to talk out to the adapters directly.
                    Result.Success(result.value.map((source) => source?.DataSourceRecord!)).asResponse(res, undefined, decrypted);
                })
                .catch((err) => {
                    Result.Failure(err, 404).asResponse(res);
                })
                .finally(() => next());
        }
    }

    private static deleteDataSource(req: Request, res: Response, next: NextFunction) {
        if (req.dataSource && String(req.query.archive).toLowerCase() === 'true') {
            dataSourceRepo
                .archive(req.currentUser!, req.dataSource)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else if (req.dataSource) {
            dataSourceRepo
                .delete(req.dataSource, {
                    force: String(req.query.forceDelete).toLowerCase() === 'true',
                    removeData: String(req.query.removeData).toLowerCase() === 'true',
                    user: req.currentUser!,
                })
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => Result.Error(err).asResponse(res))
                .finally(() => next());
        } else {
            Result.Failure(`unable to find data source`, 404).asResponse(res);
            next();
        }
    }

    private static reprocessDataSource(req: Request, res: Response, next: NextFunction) {
        if (req.dataSource) {
            dataSourceRepo
                .reprocess(req.dataSource.DataSourceRecord!.id!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => Result.Error(err).asResponse(res))
                .finally(() => next());
        } else {
            Result.Failure(`unable to find data source`, 404).asResponse(res);
            next();
        }
    }
}
