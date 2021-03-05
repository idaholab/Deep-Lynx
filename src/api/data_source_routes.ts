import {Request, Response, NextFunction, Application} from "express"
import {UserT} from "../types/user_management/userT";
import {authInContainer} from "./middleware";
import {
    DataSourceUploadFile,
    ManualJsonImport,
    NewDataSource,
    SetDataSourceActive,
    SetDataSourceConfiguration
} from "../api_handlers/data_source";
import DataSourceStorage from "../data_access_layer/mappers/import/data_source_storage";
import ImportStorage from "../data_access_layer/mappers/import/import_storage";
import DataStagingStorage from "../data_access_layer/mappers/import/data_staging_storage";
import {Readable} from "stream";
import FileDataStorage from "../data_access_layer/mappers/file_storage";
import {FileStorage} from "../file_storage/file_storage";
import AzureBlobImpl from "../file_storage/azure_blob_impl";
import Config from "../config";
import Filesystem from "../file_storage/filesystem_impl";
import MockFileStorageImpl from "../file_storage/mock_impl";
import Result from "../result";
import {FileT} from "../types/fileT";
import TypeMappingStorage from "../data_access_layer/mappers/import/type_mapping_storage";
import TypeTransformationStorage from "../data_access_layer/mappers/import/type_transformation_storage";
import TypeMappingFilter from "../data_access_layer/mappers/import/type_mapping_filter";
const Busboy = require('busboy');
const fileUpload = require('express-fileupload')
const csv=require('csvtojson')

// This contains all routes pertaining to DataSources and type mappings.
export default class DataSourceRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post("/containers/:id/import/datasources", ...middleware, authInContainer("write", "data"), this.createDataSource);
        app.get("/containers/:id/import/datasources", ...middleware, authInContainer("read", "data"), this.listDataSources);
        app.get("/containers/:id/import/datasources/:sourceID", ...middleware, authInContainer("read", "data"), this.retrieveDataSource);
        app.put("/containers/:id/import/datasources/:sourceID", ...middleware, authInContainer("read", "data"), this.setConfiguration);
        app.delete("/containers/:id/import/datasources/:sourceID", ...middleware, authInContainer("read", "data"), this.deleteDataSource);

        app.post("/containers/:id/import/datasources/:sourceID/active", ...middleware, authInContainer("read", "data"), this.setActive);
        app.delete("/containers/:id/import/datasources/:sourceID/active", ...middleware, authInContainer("read", "data"), this.setInactive);

        app.get("/containers/:id/import/datasources/:sourceID/imports", ...middleware, authInContainer("read", "data"), this.listDataSourcesImports);
        app.post("/containers/:id/import/datasources/:sourceID/imports", ...middleware, fileUpload({limits: {fileSize: 50 * 6024 * 6024}}), authInContainer("write", "data"), this.createManualImport);

        app.delete("/containers/:id/import/imports/:importID", ...middleware, authInContainer("write", "data"), this.deleteImport);
        app.get("/containers/:id/import/imports/:importID/data", ...middleware, authInContainer("read", "data"), this.listDataForImport);
        app.get("/containers/:id/import/imports/:importID/data/:dataID", ...middleware, authInContainer("read", "data"), this.getImportData);
        app.put("/containers/:id/import/imports/:importID/data/:dataID", ...middleware, authInContainer("write", "data"), this.updateImportData);
        app.delete("/containers/:id/import/imports/:importID/data/:dataID", ...middleware, authInContainer("write", "data"), this.deleteImportData);

        app.post('/containers/:id/import/datasources/:sourceID/files', ...middleware, authInContainer("write", "data"), this.uploadFile)
        app.get('/containers/:id/files/:fileID', ...middleware, authInContainer("read", "data"), this.getFile)
        app.get('/containers/:id/files/:fileID/download', ...middleware, authInContainer("read", "data"), this.downloadFile)

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

    private static createDataSource(req: Request, res: Response, next: NextFunction) {
        NewDataSource(req.user as UserT, req.params.id, req.body)
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

    private static setConfiguration(req: Request, res: Response, next: NextFunction) {
        SetDataSourceConfiguration(req.user as UserT, req.params.sourceID, req.body)
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

    private static retrieveDataSource(req: Request, res: Response, next: NextFunction) {
        DataSourceStorage.Instance.Retrieve(req.params.sourceID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                // TODO: slightly hacky, might be a better way of doing this.
                // this is needed to remove encrypted data from the return
                if (result.value.config) {
                    // @ts-ignore
                    delete result.value.config.token
                    // @ts-ignore
                    delete result.value.config.username
                    // @ts-ignore
                    delete result.value.config.password
                }

                res.status(200).json(result)
            })
            .catch((err) => {
                res.status(404).send(err)
            })
            .finally(() => next())
    }

    private static setActive(req: Request, res: Response, next: NextFunction) {
        SetDataSourceActive(req.params.sourceID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.sendStatus(200)
            })
            .catch((err) => res.status(404).send(err))
            .finally(() => next())
    }

    private static setInactive(req: Request, res: Response, next: NextFunction) {
        DataSourceStorage.Instance.SetInactive(req.params.sourceID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.sendStatus(200)
            })
            .catch((err) => {
                res.status(404).send(err)
            })
            .finally(() => next())
    }

    private static listDataSources(req: Request, res: Response, next: NextFunction) {
        DataSourceStorage.Instance.ListForContainer(req.params.id)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                for (const i in result.value) {
                    // TODO: slightly hacky, might be a better way of doing this.
                    // this is needed to remove encrypted data from the return
                    if (result.value[i].config) {
                        // @ts-ignore
                        delete result.value[i].config.token
                        // @ts-ignore
                        delete result.value[i].config.username
                        // @ts-ignore
                        delete result.value[i].config.password
                    }

                }

                res.status(200).json(result)
            })
            .catch((err) => {
                res.status(404).send(err)
            })
            .finally(() => next())
    }

    private static deleteImport(req: Request, res: Response, next: NextFunction) {
        ImportStorage.Instance.PermanentlyDelete(req.params.importID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.sendStatus(200)
            })
            .catch((err) => {
                res.status(404).send(err)
            })
            .finally(() => next())
    }

    private static listDataSourcesImports(req: Request, res: Response, next: NextFunction) {
        // @ts-ignore
        if(req.query.sortBy) {
            // @ts-ignore
            ImportStorage.Instance.List(req.params.sourceID, +req.query.offset, +req.query.limit, req.query.sortBy, req.query.sortDesc === 'true')
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return
                    }

                    res.status(200).json(result)
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next())
        } else if(req.query.count) {
            // @ts-ignore
            ImportStorage.Instance.Count()
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
            ImportStorage.Instance.List(req.params.sourceID, +req.query.offset, +req.query.limit)
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

    private static listDataForImport(req: Request, res: Response, next: NextFunction) {
      if (req.query.sortBy) {
            // @ts-ignore
            DataStagingStorage.Instance.List(req.params.importID, +req.query.offset, +req.query.limit, req.query.sortBy, req.query.sortDesc === 'true')
                .then((result: any) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return
                    }

                    res.status(200).json(result)
                })
                .catch((err: any) => res.status(404).send(err))
                .finally(() => next())
        } else if (req.query.count) {
            DataStagingStorage.Instance.Count(req.params.importID)
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
            DataStagingStorage.Instance.List(req.params.importID, +req.query.offset, +req.query.limit)
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

    // creeateManualImport will accept either a file or a raw JSON body
    private static createManualImport(req: Request, res: Response, next: NextFunction) {
        if (Object.keys(req.body).length !== 0) {
            ManualJsonImport(req.user as UserT, req.params.sourceID, req.body)
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return
                    }

                    res.status(200).json(result)
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next())
            // @ts-ignore
        } else if (req.files.import.mimetype === "application/json") {
            // @ts-ignore
            ManualJsonImport(req.user as UserT, req.params.sourceID, JSON.parse(req.files.import.data))
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
        // @ts-ignore - we have to handle microsoft's excel csv type, as when you save a csv file using excel the mimetype is different than text/csv
        else if (req.files.import.mimetype === "text/csv" || req.files.import.mimetype === "application/vnd.ms-excel") {
            // @ts-ignore
            csv().fromString(req.files.import.data.toString())
                .then((json: any) => {
                    ManualJsonImport(req.user as UserT, req.params.sourceID, json)
                        .then((result) => {
                            if (result.isError && result.error) {
                                res.status(result.error.errorCode).json(result);
                                return
                            }

                            res.status(200).json(result)
                        })
                        .catch((err) => res.status(404).send(err))
                        .finally(() => next())
                })
        } else {
            res.sendStatus(500)
            next()
        }
    }

    private static deleteDataSource(req: Request, res: Response, next: NextFunction) {
        DataSourceStorage.Instance.PermanentlyDelete(req.params.sourceID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }
                res.sendStatus(200)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static deleteImportData(req: Request, res: Response, next: NextFunction) {
        DataStagingStorage.Instance.PermanentlyDelete(req.params.dataID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }
                res.sendStatus(200)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static getImportData(req: Request, res: Response, next: NextFunction) {
        DataStagingStorage.Instance.Retrieve(+req.params.dataID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }
                res.status(200).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static updateImportData(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        DataStagingStorage.Instance.PartialUpdate(+req.params.dataID, user.id!, req.body)
            .then((updated: Result<boolean>) => {
                if (updated.isError && updated.error) {
                    res.status(updated.error.errorCode).json(updated);
                    return
                }
                res.status(200).json(updated)
            })
            .catch((updated: any) => res.status(500).send(updated))
    }

    private static getFile(req: Request, res: Response, next: NextFunction) {
        FileDataStorage.Instance.Retrieve(req.params.fileID)
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

    private static downloadFile(req: Request, res: Response, next: NextFunction) {
        FileDataStorage.Instance.DomainRetrieve(req.params.fileID, req.params.id)
            .then(file => {
                if (file.isError) {
                    res.status(500).send(file.error)
                    return
                }

                let fileStorageInstance: FileStorage

                switch (file.value.adapter) {
                    case "azure_blob": {
                        fileStorageInstance = new AzureBlobImpl(Config.azure_blob_connection_string, Config.azure_blob_container_name)

                        res.attachment(file.value.file_name)
                        fileStorageInstance.downloadStream(`${file.value.adapter_file_path}${file.value.file_name}`)
                            .then((stream) => stream?.pipe(res))
                        break;
                    }

                    case "filesystem": {
                        fileStorageInstance = new Filesystem(Config.filesystem_storage_directory, Config.is_windows)

                        res.attachment(file.value.file_name)
                        fileStorageInstance.downloadStream(`${file.value.adapter_file_path}${file.value.file_name}`)
                            .then((stream) => stream?.pipe(res))
                        break;
                    }

                    case "mock": {
                        fileStorageInstance = new MockFileStorageImpl()

                        res.attachment(file.value.file_name)
                        fileStorageInstance.downloadStream(`${file.value.adapter_file_path}${file.value.file_name}`)
                            .then((stream) => stream?.pipe(res))
                        break;
                    }

                }

            })
            .catch((err) => res.status(500).send(err))
    }

    private static async uploadFile(req: Request, res: Response, next: NextFunction) {
        const fileNames: string[] = []
        const files: Promise<Result<FileT>>[] = []
        const busboy = new Busboy({headers: req.headers})
        const metadata: { [key: string]: any } = {}
        let metadataFieldCount = 0;

        // upload the file to the relevant file storage provider, saving the file name
        // we can't actually wait on the full upload to finish, so there is no way we
        // can take information about the upload and pass it later on in the busboy parsing
        // because of this we're treating the file upload as fairly standalone
        busboy.on('file', async (fieldname: string, file: NodeJS.ReadableStream, filename: string, encoding: string, mimeType: string) => {
            const user = req.user as UserT
            files.push(DataSourceUploadFile(req.params.id, req.params.sourceID, user.id!, filename, encoding, mimeType, file as Readable))
            fileNames.push(filename)
        })

        // hold on to the field data, we consider this metadata and will create
        // a record to be ingested by deep lynx once the busboy finishes parsing
        busboy.on('field', (fieldName: string, value: any, fieldNameTruncated: boolean, encoding: string, mimetype: string) => {
            metadata[fieldName] = value
            metadataFieldCount++
        })

        busboy.on('finish', () => {
            // if there is no additional metadata we do not not create information
            // to be processed by Deep Lynx, simply store the file and make it available
            // via the normal file querying channels
            if (metadataFieldCount === 0) {
                Promise.all(files)
                    .then((results) => {
                        res.status(200).json(results)
                        next()
                        return;
                    })
            } else {
                // update the passed meta information with the file name deep lynx
                // has stored it under
                for (const i in fileNames) metadata[`deep-lynx-file-${i}`] = fileNames[i]
                const user = req.user as UserT

                // create an "import" with a single object, the metadata and file information
                // the user will then handle the mapping of this via the normal type mapping channels
                ManualJsonImport(user, req.params.sourceID, metadata)
                    .then((result) => {
                        if (result.isError && result.error) {
                            res.status(result.error.errorCode).json(result);
                            return
                        }
                        res.sendStatus(200)
                    })
                    .catch((err) => res.status(500).send(err))
                    .finally(() => next())
            }

        })

        return req.pipe(busboy)
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
        const user = req.user as UserT
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
        const user = req.user as UserT
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
        const user = req.user as UserT

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

