import {Application, NextFunction, Request, Response} from "express"
import {authInContainer} from "../../../middleware";
import TypeMappingStorage from "../../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_storage";
import TypeTransformationStorage from "../../../../data_access_layer/mappers/data_warehouse/etl/type_transformation_storage";
import TypeMappingFilter from "../../../../data_access_layer/mappers/data_warehouse/etl/type_mapping_filter";

// This contains all routes pertaining to the ETL Type Mapping system.
export default class TypeMappingRoutes {
    public static mount(app: Application, middleware: any[]) {
        // type mapping and transformation routes
        app.get('/containers/:id/import/datasources/:sourceID/mappings', ...middleware, authInContainer("read", "data"), this.listTypeMappings)

        app.get('/containers/:id/import/datasources/:sourceID/mappings/:mappingID', ...middleware, authInContainer("read", "data"), this.retrieveTypeMapping)
        app.delete('/containers/:id/import/datasources/:sourceID/mappings/:mappingID', ...middleware, authInContainer("read", "data"), this.deleteTypeMapping)
        app.put('/containers/:id/import/datasources/:sourceID/mappings/:mappingID', ...middleware, authInContainer("write", "data"), this.updateMapping)
        app.get('/containers/:id/import/datasources/:sourceID/mappings/:mappingID/transformations', ...middleware, authInContainer("read", "data"), this.retrieveTypeMappingTransformations)
        app.post('/containers/:id/import/datasources/:sourceID/mappings/:mappingID/transformations', ...middleware, authInContainer("write", "data"), this.createTypeTransformation)
        app.put('/containers/:id/import/datasources/:sourceID/mappings/:mappingID/transformations/:transformationID', ...middleware, authInContainer("write", "data"), this.updateTypeTransformation)
        app.delete('/containers/:id/import/datasources/:sourceID/mappings/:mappingID/transformations/:transformationID', ...middleware, authInContainer("write", "data"), this.deleteTypeTransformation)
    }

    private static retrieveTypeMapping(req: Request, res: Response, next: NextFunction) {
        TypeMappingStorage.Instance.Retrieve(req.params.mappingID)
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

    private static deleteTypeMapping(req: Request, res: Response, next: NextFunction) {
        TypeMappingStorage.Instance.PermanentlyDelete(req.params.mappingID)
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

    private static retrieveTypeMappingTransformations(req: Request, res: Response, next: NextFunction) {
        TypeTransformationStorage.Instance.ListForTypeMapping(req.params.mappingID)
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

    private static createTypeTransformation(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!
        TypeTransformationStorage.Instance.Create(req.params.mappingID, user.id!, req.body)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static updateTypeTransformation(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!
        TypeTransformationStorage.Instance.Update(req.params.transformationID, user.id!, req.body)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static deleteTypeTransformation(req: Request, res: Response, next: NextFunction) {
        TypeTransformationStorage.Instance.PermanentlyDelete(req.params.transformationID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static updateMapping(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!

        TypeMappingStorage.Instance.Update(req.params.mappingID, user.id!, req.body)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static listTypeMappings(req: Request, res: Response, next: NextFunction) {
     if (req.query.count && req.query.needsTransformations) {
            TypeMappingStorage.Instance.CountNoTransformation(req.params.sourceID)
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return
                    }

                    res.status(200).json(result)
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next())
        } else if (req.query.count) {
         TypeMappingStorage.Instance.Count(req.params.sourceID)
             .then((result) => {
                 if (result.isError && result.error) {
                     res.status(result.error.errorCode).json(result);
                     return
                 }

                 res.status(200).json(result)
             })
             .catch((err) => res.status(404).send(err))
             .finally(() => next())
        } else if(req.query.resultingMetatypeName || req.query.resultingMetatypeRelationshipName) {
            let filter =  new TypeMappingFilter()

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
         TypeMappingStorage.Instance.ListNoTransformations(req.params.id, req.params.sourceID, +req.query.offset, +req.query.limit, req.query.sortBy, req.query.sortDesc === "true")
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
         TypeMappingStorage.Instance.List(req.params.id, req.params.sourceID, +req.query.offset, +req.query.limit, req.query.sortBy, req.query.sortDesc === "true")
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

