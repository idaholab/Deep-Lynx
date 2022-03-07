/* eslint-disable @typescript-eslint/ban-ts-comment */
import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer, currentUser} from '../../../middleware';
import TypeMappingMapper from '../../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper';
import Result from '../../../../common_classes/result';
import TypeMappingRepository from '../../../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import {plainToClass, serialize} from 'class-transformer';
import TypeTransformation from '../../../../domain_objects/data_warehouse/etl/type_transformation';
import TypeTransformationRepository from '../../../../data_access_layer/repositories/data_warehouse/etl/type_transformation_repository';
import TypeMapping, {TypeMappingExportPayload, TypeMappingUpgradePayload} from '../../../../domain_objects/data_warehouse/etl/type_mapping';

const JSONStream = require('JSONStream');
const Busboy = require('busboy');
const mappingRepo = new TypeMappingRepository();
const transformationRepo = new TypeTransformationRepository();

// This contains all routes pertaining to the ETL Type Mapping system.
export default class TypeMappingRoutes {
    public static mount(app: Application, middleware: any[]) {
        // type mapping and transformation routes
        app.get('/containers/:containerID/import/datasources/:sourceID/mappings', ...middleware, authInContainer('read', 'data'), this.listTypeMappings);

        app.post(
            '/containers/:containerID/import/datasources/:sourceID/mappings/export',
            ...middleware,
            authInContainer('read', 'data'),
            this.exportTypeMappings,
        );
        app.post(
            '/containers/:containerID/import/datasources/:sourceID/mappings/upgrade',
            ...middleware,
            authInContainer('read', 'data'),
            this.upgradeTypeMappings,
        );
        app.post(
            '/containers/:containerID/import/datasources/:sourceID/mappings/import',
            ...middleware,
            authInContainer('write', 'data'),
            this.importTypeMappings,
        );
        app.get(
            '/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID',
            ...middleware,
            authInContainer('read', 'data'),
            this.retrieveTypeMapping,
        );
        app.delete(
            '/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID',
            ...middleware,
            authInContainer('write', 'data'),
            this.deleteTypeMapping,
        );
        app.put(
            '/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID',
            ...middleware,
            authInContainer('write', 'data'),
            this.updateMapping,
        );
        app.get(
            '/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID/transformations',
            ...middleware,
            authInContainer('read', 'data'),
            this.retrieveTypeMappingTransformations,
        );
        app.post(
            '/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID/transformations',
            ...middleware,
            authInContainer('write', 'data'),
            this.createTypeTransformation,
        );
        app.put(
            '/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID/transformations/:transformationID',
            ...middleware,
            authInContainer('write', 'data'),
            this.updateTypeTransformation,
        );
        app.delete(
            '/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID/transformations/:transformationID',
            ...middleware,
            authInContainer('write', 'data'),
            this.deleteTypeTransformation,
        );
    }

    private static retrieveTypeMapping(req: Request, res: Response, next: NextFunction) {
        if (req.typeMapping) {
            Result.Success(req.typeMapping).asResponse(res);
            next();
            return;
        } else {
            Result.Failure(`type mapping not found`).asResponse(res);
            next();
        }
    }

    private static deleteTypeMapping(req: Request, res: Response, next: NextFunction) {
        if (req.typeMapping) {
            mappingRepo
                .delete(req.typeMapping)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next());
        } else {
            Result.Failure(`type mapping not found`).asResponse(res);
            next();
        }
    }

    private static retrieveTypeMappingTransformations(req: Request, res: Response, next: NextFunction) {
        if (req.typeMapping) {
            Result.Success(req.typeMapping.transformations).asResponse(res);
            next();
            return;
        } else {
            Result.Failure(`type mapping not found`).asResponse(res);
            next();
        }
    }

    private static createTypeTransformation(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;
        const toCreate = plainToClass(TypeTransformation, req.body as object);

        if (req.typeMapping) {
            toCreate.type_mapping_id = req.typeMapping.id!;
        }

        transformationRepo
            .save(toCreate, user)
            .then((result) => {
                if (result.isError) {
                    result.asResponse(res);
                    return;
                }

                Result.Success(toCreate).asResponse(res);
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next());
    }

    private static exportTypeMappings(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;
        const mappingRepo = new TypeMappingRepository();

        if (req.dataSource) {
            let payload: TypeMappingExportPayload | undefined;
            if (req.body) payload = plainToClass(TypeMappingExportPayload, req.body as object);

            // list all the mappings from the supplied data source, or only those mappings specified by the payload
            let query = mappingRepo.where().containerID('eq', req.container?.id).and().dataSourceID('eq', req.dataSource.DataSourceRecord?.id);

            if (payload && payload.mapping_ids && payload.mapping_ids.length > 0) {
                query = query.and().id('in', payload.mapping_ids);
            }

            query
                .list()
                .then((results) => {
                    if (results.isError) {
                        results.asResponse(res);
                        next();
                        return;
                    }
                    // if there is no data source specified prep the mappings and return as a .json file
                    if (!payload || !payload?.target_data_source) {
                        const prepared = [];

                        for (const mapping of results.value) {
                            prepared.push(mappingRepo.prepareForImport(mapping, true));
                        }

                        Promise.all(prepared)
                            .then((preparedMappings) => {
                                res.setHeader('Content-disposition', 'attachment; filename= exportedMappings.json');
                                res.setHeader('Content-type', 'application/json');
                                res.write(serialize(preparedMappings), (err) => {
                                    res.end();
                                });
                            })
                            .catch((e) => {
                                Result.Failure(e).asResponse(res);
                                next();
                            });
                    } else {
                        mappingRepo
                            .importToDataSource(payload.target_data_source, user, ...results.value)
                            .then((result) => {
                                res.status(200).json(result);
                                next();
                            })
                            .catch((e) => {
                                Result.Failure(e).asResponse(res);
                                next();
                            });
                    }
                })
                .catch((e) => {
                    Result.Failure(e).asResponse(res);
                    next();
                });
        } else {
            Result.Failure(`data source not found`).asResponse(res);
            next();
        }
    }

    private static updateTypeTransformation(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;

        if (req.typeMapping && req.typeTransformation) {
            const payload = plainToClass(TypeTransformation, req.body as object);
            payload.id = req.typeTransformation.id!;
            payload.type_mapping_id = req.typeMapping.id!;

            transformationRepo
                .save(payload, user)
                .then((result) => {
                    if (result.isError && result.error) {
                        result.asResponse(res);
                        return;
                    }

                    Result.Success(payload).asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next());
        } else {
            Result.Failure(`type mapping or type transformation not found`).asResponse(res);
            next();
        }
    }

    private static deleteTypeTransformation(req: Request, res: Response, next: NextFunction) {
        // while we could run a count on the nodes/edges via the graph routes - those calls can be expensive if all we
        // need is to be able to check whether or not this transformation is in use. Including the inUse query param therefore
        // will short-circuit and return true/false depending on use
        if (req.typeTransformation && String(req.query.inUse).toLowerCase() === 'true') {
            transformationRepo
                .inUse(req.typeTransformation)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next());
        } else if (req.typeTransformation && String(req.query.archive).toLowerCase() === 'true') {
            transformationRepo
                .archive(req.currentUser!, req.typeTransformation)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next());
        } else if (req.typeTransformation) {
            transformationRepo
                .delete(req.typeTransformation, {
                    force: String(req.query.forceDelete).toLowerCase() === 'true',
                    removeData: String(req.query.removeData).toLowerCase() === 'true',
                })
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next());
        } else {
            Result.Failure(`type transformation not found`, 404).asResponse(res);
            next();
        }
    }

    private static updateMapping(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;

        // TODO update with data source ID
        if (req.typeMapping && req.container) {
            const payload = plainToClass(TypeMapping, req.body as object);
            payload.id = req.typeMapping.id!;
            payload.container_id = req.container.id!;
            payload.data_source_id = req.params.sourceID;

            mappingRepo
                .save(payload, user)
                .then((result) => {
                    if (result.isError && result.error) {
                        result.asResponse(res);
                        return;
                    }

                    Result.Success(payload).asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next());
        } else {
            Result.Failure(`type mapping,container, or data source not found`).asResponse(res);
            next();
        }
    }

    private static listTypeMappings(req: Request, res: Response, next: NextFunction) {
        if (req.query.count && req.query.needsTransformations) {
            mappingRepo
                .countForDataSourceNoTransformations(req.params.sourceID)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next());
        } else if (req.query.count) {
            mappingRepo
                .countForDataSource(req.params.sourceID)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next());
        } else if (req.query.resultingMetatypeName || req.query.resultingMetatypeRelationshipName) {
            // new filter so as not to pollute the existing one
            let filter = new TypeMappingRepository();

            filter = filter.where().containerID('eq', req.params.id).and().dataSourceID('eq', req.params.sourceID);

            if (req.query.resultingMetatypeName) {
                filter = filter.and().resultingMetatypeName('like', req.query.resultingMetatypeName);
            }

            if (req.query.resultingMetatypeRelationshipName) {
                filter = filter.and().resultingMetatypeRelationshipName('like', req.query.resultingMetatypeRelationshipName);
            }

            filter
                // @ts-ignore
                .findAll(+req.query.limit, +req.query.offset)
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return;
                    }

                    res.status(200).json(result);
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next());
        } else if (req.query.needsTransformations) {
            // @ts-ignore
            TypeMappingMapper.Instance.ListNoTransformations(
                req.params.containerID,
                req.params.sourceID,
                // @ts-ignore
                +req.query.offset,
                // @ts-ignore
                +req.query.limit,
                // @ts-ignore
                req.query.sortBy,
                String(req.query.sortDesc).toLowerCase() === 'true',
            )
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return;
                    }

                    res.status(200).json(result);
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next());
        } else {
            // @ts-ignore
            TypeMappingMapper.Instance.List(
                req.params.containerID,
                req.params.sourceID,
                // @ts-ignore
                +req.query.offset,
                // @ts-ignore
                +req.query.limit,
                // @ts-ignore
                req.query.sortBy,
                String(req.query.sortDesc).toLowerCase() === 'true',
            )
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return;
                    }

                    res.status(200).json(result);
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next());
        }
    }

    // importTypeMappings will accept either a json body or actual files via multipart http form upload - the payload
    // should be an array of type mapping classes, previously generated using the export route
    private static importTypeMappings(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;
        const importResults: Promise<Result<TypeMapping>[]>[] = [];

        if (!req.dataSource) {
            Result.Failure(`unable to find data source`, 404).asResponse(res);
            next();
            return;
        }

        // if we have a json body, ignore anything else and simply run the import with the json
        if (req.headers['content-type']?.includes('application/json')) {
            const repo = new TypeMappingRepository();
            const payload = plainToClass(TypeMapping, req.body);

            repo.importToDataSource(req.dataSource.DataSourceRecord?.id!, user, ...payload)
                .then((results) => {
                    res.status(201).json(results);
                    next();
                })
                .catch((e) => res.status(500).send(e));
        } else {
            const busboy = new Busboy({headers: req.headers});
            busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, filename: string, encoding: string, mimeType: string) => {
                const repo = new TypeMappingRepository();

                // we use JSONStreams so that we can parse a large JSON file completely without hitting the arguably low
                // memory limits of the JSON.parse function - we're still loading it all into memory, and eventually this
                // might need to be refactored to do periodic processing or go to single mapping imports
                const stream = JSONStream.parse('*'); // this will parse every object in the array
                const objects: any[] = [];

                stream.on('data', (data: any) => {
                    objects.push(data);
                });

                // once the file has been read, convert to mappings and then attempt the import
                stream.on('end', () => {
                    const mappings = plainToClass(TypeMapping, objects);
                    importResults.push(repo.importToDataSource(req.dataSource?.DataSourceRecord?.id!, user, ...mappings));
                });

                file.pipe(stream);
            });

            busboy.on('finish', () => {
                Promise.all(importResults)
                    .then((results) => {
                        const finalResults = [];
                        // no matter how many files were uploaded we want to return a single array of all mapping results
                        for (const result of results) {
                            finalResults.push(...result);
                        }

                        res.status(201).json(finalResults);
                    })
                    .catch((e) => res.status(500).send(e));
            });

            return req.pipe(busboy);
        }
    }

    private static upgradeTypeMappings(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;
        const mappingRepo = new TypeMappingRepository();

        if (req.dataSource) {
            let payload: TypeMappingUpgradePayload | undefined;
            if (req.body) payload = plainToClass(TypeMappingUpgradePayload, req.body as object);

            // list all the mappings from the supplied data source, or only those mappings specified by the payload
            let query = mappingRepo.where().containerID('eq', req.container?.id);

            if (payload && payload.mapping_ids && payload.mapping_ids.length > 0) {
                query = query.and().id('in', payload.mapping_ids);
            }

            query
                .list()
                .then((results) => {
                    mappingRepo
                        .upgradeMappings(payload?.ontology_version!, ...results.value)
                        .then((upgradeResults) => {
                            Result.Success(upgradeResults).asResponse(res);
                            next();
                        })
                        .catch((e) => {
                            Result.Failure(e).asResponse(res);
                            next();
                        });
                })
                .catch((e) => {
                    Result.Failure(e).asResponse(res);
                    next();
                });
        } else {
            Result.Failure(`data source not found`).asResponse(res);
            next();
        }
    }
}
