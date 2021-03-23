import {Application, NextFunction, Request, Response} from "express"
import {authInContainer} from "../../../middleware";
import TypeMappingMapper from "../../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_mapper";
import Result from "../../../../result";
import TypeMappingRepository
    from "../../../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository";
import {plainToClass} from "class-transformer";
import TypeTransformation from "../../../../data_warehouse/etl/type_transformation";
import TypeTransformationRepository
    from "../../../../data_access_layer/repositories/data_warehouse/etl/type_transformation_repository";
import TypeMapping from "../../../../data_warehouse/etl/type_mapping";

const mappingRepo = new TypeMappingRepository()
const transformationRepo = new TypeTransformationRepository()

// This contains all routes pertaining to the ETL Type Mapping system.
export default class TypeMappingRoutes {
    public static mount(app: Application, middleware: any[]) {
        // type mapping and transformation routes
        app.get('/containers/:containerID/import/datasources/:sourceID/mappings', ...middleware, authInContainer("read", "data"), this.listTypeMappings)

        app.get('/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID', ...middleware, authInContainer("read", "data"), this.retrieveTypeMapping)
        app.delete('/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID', ...middleware, authInContainer("read", "data"), this.deleteTypeMapping)
        app.put('/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID', ...middleware, authInContainer("write", "data"), this.updateMapping)
        app.get('/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID/transformations', ...middleware, authInContainer("read", "data"), this.retrieveTypeMappingTransformations)
        app.post('/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID/transformations', ...middleware, authInContainer("write", "data"), this.createTypeTransformation)
        app.put('/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID/transformations/:transformationID', ...middleware, authInContainer("write", "data"), this.updateTypeTransformation)
        app.delete('/containers/:containerID/import/datasources/:sourceID/mappings/:mappingID/transformations/:transformationID', ...middleware, authInContainer("write", "data"), this.deleteTypeTransformation)
    }

    private static retrieveTypeMapping(req: Request, res: Response, next: NextFunction) {
        if(req.typeMapping){
            Result.Success(req.typeMapping).asResponse(res)
            next()
            return
        } else {
            Result.Failure(`type mapping not found`).asResponse(res)
            next()
        }
    }

    private static deleteTypeMapping(req: Request, res: Response, next: NextFunction) {
        if(req.typeMapping){
            mappingRepo.delete(req.typeMapping)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        } else {
            Result.Failure(`type mapping not found`).asResponse(res)
            next()
        }
    }

    private static retrieveTypeMappingTransformations(req: Request, res: Response, next: NextFunction) {
        if(req.typeMapping){
            Result.Success(req.typeMapping.transformations).asResponse(res)
            next()
            return
        } else {
            Result.Failure(`type mapping not found`).asResponse(res)
            next()
        }
    }

    private static createTypeTransformation(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!
        const toCreate = plainToClass(TypeTransformation, req.body as object)

        if(req.typeMapping) {
            toCreate.type_mapping_id = req.typeMapping.id!
        }

        transformationRepo.save(user, toCreate)
            .then((result) => {
                if (result.isError) {
                    result.asResponse(res)
                    return
                }

                Result.Success(toCreate).asResponse(res)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static updateTypeTransformation(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!

        if(req.typeMapping && req.typeTransformation) {
            const payload = plainToClass(TypeTransformation, req.body as object)
            payload.id = req.typeTransformation.id!
            payload.type_mapping_id = req.typeMapping.id!

            transformationRepo.save(user, payload)
                .then((result) => {
                    if (result.isError && result.error) {
                        result.asResponse(res)
                        return
                    }

                    Result.Success(payload).asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        } else {
            Result.Failure(`type mapping or type transformation not found`).asResponse(res)
            next()
        }
    }

    private static deleteTypeTransformation(req: Request, res: Response, next: NextFunction) {
        if(req.typeTransformation) {
            transformationRepo.delete(req.typeTransformation)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        } else {
            Result.Failure(`type transformation not found`).asResponse(res)
            next()
        }
    }

    private static updateMapping(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!

        // TODO update with data source ID
        if(req.typeMapping && req.container) {
            const payload = plainToClass(TypeMapping, req.body as object)
            payload.id = req.typeMapping.id!
            payload.container_id = req.container.id!
            payload.data_source_id = req.params.sourceID

            mappingRepo.save(user, payload)
                .then((result) => {
                    if (result.isError && result.error) {
                        result.asResponse(res)
                        return
                    }

                    Result.Success(payload).asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        } else {
            Result.Failure(`type mapping,container, or data source not found`).asResponse(res)
            next()
        }
    }

    private static listTypeMappings(req: Request, res: Response, next: NextFunction) {
        if (req.query.count && req.query.needsTransformations) {
            mappingRepo.countForDataSourceNoTransformations(req.params.sourceID)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next())
        } else if (req.query.count) {
            mappingRepo.countForDataSource(req.params.sourceID)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next())
        } else if(req.query.resultingMetatypeName || req.query.resultingMetatypeRelationshipName) {
            // new filter so as not to pollute the existing one
            let filter =  new TypeMappingRepository()

            filter = filter.where()
                .containerID("eq", req.params.id)
                .and()
                .dataSourceID("eq", req.params.sourceID)

            if(req.query.resultingMetatypeName) {
                filter = filter.and().resultingMetatypeName("like", req.query.resultingMetatypeName)
            }

            if(req.query.resultingMetatypeRelationshipName) {
                filter = filter.and().resultingMetatypeRelationshipName("like", req.query.resultingMetatypeRelationshipName)
            }

            // @ts-ignore
            filter.findAll(+req.query.limit, +req.query.offset)
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return
                    }

                    res.status(200).json(result)
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next())
        } else if (req.query.needsTransformations) {
            // @ts-ignore
            TypeMappingMapper.Instance.ListNoTransformations(req.params.id, req.params.sourceID, +req.query.offset, +req.query.limit, req.query.sortBy, req.query.sortDesc === "true")
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return
                    }

                    res.status(200).json(result)
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next())
        } else {
            // @ts-ignore
            TypeMappingMapper.Instance.List(req.params.id, req.params.sourceID, +req.query.offset, +req.query.limit, req.query.sortBy, req.query.sortDesc === "true")
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return
                    }

                    res.status(200).json(result)
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next())
        }
    }
}

