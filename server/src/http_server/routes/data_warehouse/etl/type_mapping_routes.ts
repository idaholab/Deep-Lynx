/* eslint-disable @typescript-eslint/ban-ts-comment */
import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer, currentUser} from '../../../middleware';
import TypeMappingMapper from '../../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper';
import Result from '../../../../common_classes/result';
import TypeMappingRepository from '../../../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import {plainToClass, serialize} from 'class-transformer';
import TypeTransformation from '../../../../domain_objects/data_warehouse/etl/type_transformation';
import TypeTransformationRepository from '../../../../data_access_layer/repositories/data_warehouse/etl/type_transformation_repository';
import TypeMapping, {TypeMappingComparison, TypeMappingExportPayload, TypeMappingUpgradePayload} from '../../../../domain_objects/data_warehouse/etl/type_mapping';
import {FileInfo} from 'busboy';
import DataSourceRecord from '../../../../domain_objects/data_warehouse/import/data_source';
import {none} from 'fp-ts/lib/Option';
import { Repository } from '../../../../data_access_layer/repositories/repository';

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
        app.post(
            '/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID/copy/:originalMappingID',
            ...middleware,
            authInContainer('write', 'data'),
            this.copyTransformationsFromMapping,
        );

        app.put(
            '/containers/:containerID/import/datasources/:sourceID/mappings/group',
            ...middleware,
            authInContainer('write', 'data'),
            this.groupMappings,
        );
        app.delete(
            '/containers/:containerID/import/datasources/:sourceID/mappings/group',
            ...middleware,
            authInContainer('write', 'data'),
            this.deleteTypeMapping,  
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

        app.get('/containers/:containerID/transformations/:transformationID', ...middleware, authInContainer('read', 'data'), this.retrieveTypeTransformation);
        app.post(
            '/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID/active',
            ...middleware,
            authInContainer('write', 'data'),
            this.setMappingActive,
        );
        app.delete(
            '/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID/active',
            ...middleware,
            authInContainer('write', 'data'),
            this.setMappingInactive,
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
            if (req.typeMapping.shape_hash === null){
                mappingRepo
                .ungroupTransformations(req.typeMapping, req.currentUser!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
            } else {
                mappingRepo
                    .delete(req.typeMapping)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => {
                        Result.Error(err).asResponse(res);
                    })
                    .finally(() => next());
            }
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
            .catch((err) => {
                Result.Error(err).asResponse(res);
            })
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
                            prepared.push(mappingRepo.prepareForImport(mapping, req.dataSource?.DataSourceRecord, true));
                        }

                        Promise.all(prepared)
                            .then((preparedMappings) => {
                                res.setHeader('Content-disposition', 'attachment; filename= exportedMappings.json');
                                res.setHeader('Content-type', 'application/json');
                                res.write(JSON.stringify(preparedMappings), (err) => {
                                    res.end();
                                });
                            })
                            .catch((e) => {
                                Result.Failure(e).asResponse(res);
                                next();
                            });
                    } else {
                        mappingRepo
                            .importToDataSource(payload.target_data_source, user, false, ...results.value)
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
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
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
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else if (req.typeTransformation && String(req.query.archive).toLowerCase() === 'true') {
            transformationRepo
                .archive(req.currentUser!, req.typeTransformation)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
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
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`type transformation not found`, 404).asResponse(res);
            next();
        }
    }

    private static updateMapping(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;

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
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`type mapping,container, or data source not found`).asResponse(res);
            next();
        }
    }

    private static listTypeMappings(req: Request, res: Response, next: NextFunction) {
        if (req.query.shapeHash) {
            mappingRepo
                .findByShapeHash(req.query.shapeHash as string, req.dataSource!.DataSourceRecord!.id!, true)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => Result.Failure(err, 404).asResponse(res))
                .finally(() => next());
        } else if (req.query.count && req.query.needsTransformations) {
            mappingRepo
                .countForDataSourceNoTransformations(req.params.sourceID)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => Result.Failure(err, 404).asResponse(res))
                .finally(() => next());
        } else if (req.query.count) {
            mappingRepo
                .countForDataSource(req.params.sourceID)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => Result.Failure(err, 404).asResponse(res))
                .finally(() => next());
        } else if (req.query.resultingMetatypeName || req.query.resultingMetatypeRelationshipName) {
            // new filter so as not to pollute the existing one
            let filter = new TypeMappingRepository();

            filter = filter.where().containerID('eq', req.params.containerID).and().dataSourceID('eq', req.params.sourceID);

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
                        result.asResponse(res);
                        return;
                    }

                    res.status(200).json(result);
                })
                .catch((err) => Result.Failure(err, 404).asResponse(res))
                .finally(() => next());
        } else if (req.query.needsTransformations) {
            new TypeMappingRepository()
                .select('*', 'tm')
                .from('type_mappings', 'tm')
                .where().containerID('eq', req.params.containerID)
                .and().dataSourceID('eq', req.params.sourceID)
                .and().not_exists(new TypeMappingRepository().subquery(
                    new Repository('type_mapping_transformations').select('1', '', false)
                        .where().query('type_mapping_id', 'eq', 'tm.id', {valueAsColumn: true})
                ))
                .findAll({
                    offset: +req.query.offset!,
                    limit: +req.query.limit!,
                    sortBy: req.query.sortBy as string | undefined,
                    sortDesc: String(req.query.sortDesc).toLowerCase() === 'true',
                    resetSelect: true,
                    print:true
                })
                .then((result) => {
                    if (result.isError && result.error) {
                        result.asResponse(res);
                        return;
                    }

                    res.status(200).json(result);
                })
                .catch((err) => Result.Failure(err, 404).asResponse(res))
                .finally(() => next());
        } else {
            new TypeMappingRepository()
                .where().containerID('eq', req.params.containerID)
                .and().dataSourceID('eq', req.params.sourceID)
                .findAll({
                    offset: +req.query.offset!,
                    limit: +req.query.limit!,
                    sortBy: req.query.sortBy as string | undefined,
                    sortDesc: String(req.query.sortDesc).toLowerCase() === 'true'
                })
                .then((result) => {
                    if (result.isError && result.error) {
                        result.asResponse(res);
                        return;
                    }

                    res.status(200).json(result);
                })
                .catch((err) => Result.Failure(err, 404).asResponse(res))
                .finally(() => next());
        }
    }

    // importTypeMappings will accept either a json body or actual files via multipart http form upload - the payload
    // should be an array of type mapping classes, previously generated using the export route
    private static importTypeMappings(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;
        const importResults: Promise<Result<TypeMapping>[]>[] = [];
        let active: boolean;

        if (req.query['isEnabled' as keyof object] === 'true') {
            active = true;
        } else {
            active = false;
        }

        if (!req.dataSource) {
            Result.Failure(`unable to find data source`, 404).asResponse(res);
            next();
            return;
        }

        // if we have a json body, ignore anything else and simply run the import with the json
        if (req.headers['content-type']?.includes('application/json')) {
            const repo = new TypeMappingRepository();
            const payload = plainToClass(TypeMapping, req.body);

            repo.importToDataSource(req.dataSource.DataSourceRecord?.id!, user, active, ...payload)
                .then((results) => {
                    res.status(201).json(results);
                    next();
                })
                .catch((e) => Result.Error(e).asResponse(res));
        } else {
            const busboy = Busboy({headers: req.headers});
            busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: FileInfo) => {
                if (info.mimeType !== 'application/json') {
                    Result.Failure('type mappings must be in a .json file').asResponse(res);
                    return;
                }

                const repo = new TypeMappingRepository();

                // we use JSONStreams so that we can parse a large JSON file completely without hitting the arguably low
                // memory limits of the JSON.parse function - we're still loading it all into memory, and eventually this
                // might need to be refactored to do periodic processing or go to single mapping imports
                const stream = JSONStream.parse('*'); // this will parse every object in the array
                const objects: any[] = [];

                stream.on('data', (data: any) => {
                    objects.push(data);
                });

                stream.on('error', (e: any) => {
                    Result.Failure(e).asResponse(res);
                    return;
                });

                // once the file has been read, convert to mappings and then attempt the import
                stream.on('end', () => {
                    const mappings = plainToClass(TypeMapping, objects);
                    importResults.push(repo.importToDataSource(req.dataSource?.DataSourceRecord?.id!, user, active, ...mappings));
                });

                try {
                    file.pipe(stream);
                } catch (e: any) {
                    Result.Failure('unable to load type mappings from file').asResponse(res);
                    return;
                }
            });

            busboy.on('finish', () => {
                Promise.all(importResults)
                    .then((results) => {
                        const finalResults = [];
                        // no matter how many files were uploaded we want to return a single array of all mapping results
                        for (const result of results) {
                            finalResults.push(...result);
                        }

                        res.status(200).json(finalResults);
                    })
                    .catch((e) => Result.Error(e).asResponse(res));
            });

            busboy.on('error', (e: any) => {
                Result.Failure(e).asResponse(res);
                return;
            });

            try {
                return req.pipe(busboy);
            } catch (e: any) {
                Result.Error(e).asResponse(res);
                return;
            }
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

    private static retrieveTypeTransformation(req: Request, res: Response, next: NextFunction) {
        if (req.typeTransformation) {
            Result.Success(req.typeTransformation).asResponse(res);
            next();
            return;
        } else {
            Result.Failure(`type transformation not found`).asResponse(res);
            next();
        }
    }

    private static copyTransformationsFromMapping(req: Request, res: Response, next: NextFunction) {
        if (req.typeMapping) {
            mappingRepo
                .copyTransformations(req.currentUser!, req.typeMapping.id!, req.params.originalMappingID)
                .then((results) => {
                    results.asResponse(res);
                })
                .catch((e) => Result.Error(e).asResponse(res))
                .finally(() => next());
        } else {
            Result.Failure(`target type transformation not found`).asResponse(res);
            next();
        }
    }

    private static setMappingActive(req: Request, res: Response, next: NextFunction) {
        if (req.typeMapping) {
            TypeMappingMapper.Instance
                .SetActive(req.typeMapping.id!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`unable to find type mapping`, 404).asResponse(res);
            next();
        }
    }

    private static setMappingInactive(req: Request, res: Response, next: NextFunction) {
        if (req.typeMapping) {
            TypeMappingMapper.Instance
                .SetInActive(req.typeMapping.id!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`unable to find type mapping`, 404).asResponse(res);
            next();
        }
    }

    private static groupMappings(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;  //take current user from request
        const mappingRepo = new TypeMappingRepository();  // initialize a repo for handling type mappings

        if (req.dataSource) {  // checking if dataSouce present
            let payload: TypeMappingExportPayload | undefined;
    
            if (req.body) payload = plainToClass(TypeMappingExportPayload, req.body as object); // If there is a request body, convert it to an instance of TypeMappingExportPayload class
    
            if (payload && payload.mapping_ids && payload.mapping_ids.length > 0) {  // Ensure payload exists, checks if the mapping_ids exist, and that the list is greater than zero
                mappingRepo
                    .groupMappings(payload?.mapping_ids!, req.currentUser!, req.container?.id!, req.dataSource.DataSourceRecord?.id!) 
                    .then((results) => {
                        results.asResponse(res);
                    })
                    .catch((e) => Result.Error(e).asResponse(res))
                    .finally(() => {
                        if (!res.headersSent) {
                            next();
                        }
                    });
            } else {
                Result.Failure(`mapping ids are required`, 500).asResponse(res);
                next();
            }
        } else {
            Result.Failure(`data source not found`, 404).asResponse(res);
            next();
        }
    }
    
    
}
