/* eslint-disable @typescript-eslint/ban-ts-comment */
import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer} from '../../../middleware';
import ImportMapper from '../../../../data_access_layer/mappers/data_warehouse/import/import_mapper';
import {Readable} from 'stream';
import FileDataStorage from '../../../../data_access_layer/mappers/data_warehouse/data/file_mapper';
import Result from '../../../../common_classes/result';
import File from '../../../../domain_objects/data_warehouse/data/file';
import FileRepository from '../../../../data_access_layer/repositories/data_warehouse/data/file_repository';
import DataStagingRepository from '../../../../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import {plainToClass} from 'class-transformer';
import Import, {DataStaging} from '../../../../domain_objects/data_warehouse/import/import';
import ImportRepository from '../../../../data_access_layer/repositories/data_warehouse/import/import_repository';
import {QueryOptions} from '../../../../data_access_layer/repositories/repository';
import Logger from '../../../../services/logger';
import Config from '../../../../services/config';

import express from 'express';
import {FileInfo} from 'busboy';
const csv = require('csvtojson');
const Busboy = require('busboy');
const fileRepo = new FileRepository();
const stagingRepo = new DataStagingRepository();
const importRepo = new ImportRepository();
const xmlToJson = require('xml-2-json-streaming');
const xmlParser = xmlToJson();

// This contains all routes pertaining to DataSources.
export default class ImportRoutes {
    // unfortunately we have to mount the express.json middleware manually on this set of routes so that we can avoid
    // having it run on the upload routes as it reads the request body into memory, no matter size, and doesn't reset it
    public static mount(app: Application, middleware: any[]) {
        app.get(
            '/containers/:containerID/import/datasources/:sourceID/imports',
            ...middleware,
            express.json({limit: `${Config.max_request_body_size}mb`}),
            authInContainer('read', 'data'),
            this.listDataSourcesImports,
        );
        app.post('/containers/:containerID/import/datasources/:sourceID/imports', ...middleware, authInContainer('write', 'data'), this.createManualImport);

        app.post(
            '/containers/:containerID/datasources/:sourceID/imports/',
            ...middleware,
            express.json({limit: `${Config.max_request_body_size}mb`}),
            authInContainer('write', 'data'),
            this.createImport,
        );
        app.delete(
            '/containers/:containerID/import/imports/:importID',
            ...middleware,
            express.json({limit: `${Config.max_request_body_size}mb`}),
            authInContainer('write', 'data'),
            this.deleteImport,
        );
        app.post(
            '/containers/:containerID/datasources/:sourceID/imports/:importID/data',
            ...middleware,
            authInContainer('write', 'data'),
            this.addDataToImport,
        );
        app.post('/containers/:containerID/import/imports/:importID/reprocess', ...middleware, authInContainer('write', 'data'), this.reprocessImport);
        app.get(
            '/containers/:containerID/import/imports/:importID/data',
            ...middleware,
            express.json({limit: `${Config.max_request_body_size}mb`}),
            authInContainer('read', 'data'),
            this.listDataForImport,
        );
        app.get(
            '/containers/:containerID/import/imports/:importID/data/:dataID',
            ...middleware,
            express.json({limit: `${Config.max_request_body_size}mb`}),
            authInContainer('read', 'data'),
            this.getImportData,
        );
        app.put(
            '/containers/:containerID/import/imports/:importID/data/:dataID',
            ...middleware,
            express.json({limit: `${Config.max_request_body_size}mb`}),
            authInContainer('write', 'data'),
            this.updateImportData,
        );
        app.delete(
            '/containers/:containerID/import/imports/:importID/data/:dataID',
            ...middleware,
            express.json({limit: `${Config.max_request_body_size}mb`}),
            authInContainer('write', 'data'),
            this.deleteImportData,
        );

        app.post('/containers/:containerID/import/datasources/:sourceID/files', ...middleware, authInContainer('write', 'data'), this.uploadFile);
        app.get(
            '/containers/:containerID/files/:fileID',
            ...middleware,
            express.json({limit: `${Config.max_request_body_size}mb`}),
            authInContainer('read', 'data'),
            this.getFile,
        );
        app.put('/containers/:containerID/import/datasources/:sourceID/files/:fileID', ...middleware, authInContainer('write', 'data'), this.updateFile);
        app.get(
            '/containers/:containerID/files/:fileID/download',
            ...middleware,
            express.json({limit: `${Config.max_request_body_size}mb`}),
            authInContainer('read', 'data'),
            this.downloadFile,
        );
    }

    private static createImport(req: Request, res: Response, next: NextFunction) {
        if (req.dataSource) {
            const toSave = new Import({data_source_id: req.dataSource.DataSourceRecord!.id!});
            importRepo
                .save(toSave, req.currentUser!)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    Result.Success(toSave).asResponse(res);
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

    private static deleteImport(req: Request, res: Response, next: NextFunction) {
        ImportMapper.Instance.Delete(req.params.importID, String(req.query.withData).toLowerCase() === 'true')
            .then((result) => {
                if (result.isError && result.error) {
                    result.asResponse(res);
                    return;
                }

                res.sendStatus(200);
            })
            .catch((err) => {
                Result.Failure(err, 404).asResponse(res);
            })
            .finally(() => next());
    }

    private static listDataSourcesImports(req: Request, res: Response, next: NextFunction) {
        // we'll use a fresh repository every time to insure no leftover queries
        let repository = new ImportRepository();
        repository = repository.where().dataSourceID('eq', req.params.sourceID);

        if (req.query.count !== 'undefined' && String(req.query.count).toLowerCase() === 'true') {
            repository
                .count()
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => Result.Failure(err, 404).asResponse(res))
                .finally(() => next());
        } else {
            repository
                .list({
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                    sortBy: req.query.sortBy,
                    sortDesc: req.query.sortDesc ? String(req.query.sortDesc).toLowerCase() === 'true' : undefined,
                } as QueryOptions)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Failure(err, 404).asResponse(res);
                })
                .finally(() => next());
        }
    }

    private static listDataForImport(req: Request, res: Response, next: NextFunction) {
        // we'll use a fresh repository every time to insure no leftover queries
        let repository = new DataStagingRepository();
        repository = repository.where().importID('eq', req.params.importID);

        if (req.query.count !== 'undefined' && String(req.query.count).toLowerCase() === 'true') {
            repository
                .count()
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => Result.Failure(err, 404).asResponse(res))
                .finally(() => next());
        } else {
            repository
                .list({
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                    sortBy: req.query.sortBy,
                    sortDesc: req.query.sortDesc ? String(req.query.sortDesc).toLowerCase() === 'true' : undefined,
                } as QueryOptions)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Failure(err, 404).asResponse(res);
                })
                .finally(() => next());
        }
    }

    // createManualImport will accept either a file or a raw JSON body
    private static createManualImport(req: Request, res: Response, next: NextFunction) {
        if (req.dataSource) {
            if (req.headers['content-type']?.includes('application/json')) {
                req.dataSource
                    .ReceiveData(req, req.currentUser!)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => {
                        Result.Failure(err, 404).asResponse(res);
                    });
                // @ts-ignore
            } else {
                const busboy = Busboy({headers: req.headers});
                const importPromises: Promise<Result<Import | DataStaging[] | boolean>>[] = [];

                busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: FileInfo) => {
                    const {filename, encoding, mimeType} = info;
                    Logger.debug(`file found at ${fieldname} - ${filename}, attempting upload`);
                    if (mimeType === 'application/json') {
                        // shouldn't need to do anything special for a valid json file, ReceiveData can handle valid json
                        // files
                        importPromises.push(req.dataSource!.ReceiveData(file as Readable, req.currentUser!));
                    } else if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
                        importPromises.push(
                            req.dataSource!.ReceiveData(file as Readable, req.currentUser!, {
                                transformStream: csv({
                                    downstreamFormat: 'array', // this is necessary as the ReceiveData expects an array of json, not single objects
                                }),
                                bufferSize: Config.data_source_receive_buffer,
                            }),
                        );
                    } else if (mimeType === 'text/xml' || mimeType === 'application/xml') {
                        const xmlStream = xmlParser.createStream();
                        importPromises.push(
                            req.dataSource!.ReceiveData(file as Readable, req.currentUser!, {
                                transformStream: xmlStream,
                                bufferSize: Config.data_source_receive_buffer,
                            }),
                        );
                    } else {
                        Result.Failure(`Please provide a valid json, csv, or xml file`).asResponse(res);
                        next();
                        return;
                    }
                });

                busboy.on('finish', () => {
                    if (importPromises.length <= 0) {
                        Result.Failure(`no valid files attached`).asResponse(res);
                        next();
                        return;
                    }

                    Promise.all(importPromises)
                        .then((imports) => {
                            if (imports.length <= 0) {
                                Result.Failure(`no json, csv, or xml files included for upload`);
                            } else if (imports.length === 1) {
                                imports[0].asResponse(res);
                            } else {
                                Result.Success(imports).asResponse(res);
                            }

                            next();
                            return;
                        })
                        .catch((err) => {
                            Result.Error(err).asResponse(res);
                        });
                });

                return req.pipe(busboy);
            }
        } else {
            Result.Failure(`unable to find data source`, 404).asResponse(res);
            return;
        }
    }

    private static deleteImportData(req: Request, res: Response, next: NextFunction) {
        if (req.dataStagingRecord) {
            stagingRepo
                .delete(req.dataStagingRecord)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`unable to find data staging record`, 404).asResponse(res);
            next();
        }
    }

    private static getImportData(req: Request, res: Response, next: NextFunction) {
        if (req.dataStagingRecord) {
            Result.Success(req.dataStagingRecord).asResponse(res);
            next();
        } else {
            Result.Failure(`unable to find data staging record`, 404).asResponse(res);
            next();
        }
    }

    private static updateImportData(req: Request, res: Response, next: NextFunction) {
        if (req.dataStagingRecord && req.dataImport) {
            // easiest way to handle full update right now is to assign
            const payload = plainToClass(DataStaging, req.body as object);
            payload.id = req.dataStagingRecord.id;
            payload.import_id = req.dataImport.id;

            stagingRepo
                .save(payload)
                .then((result) => {
                    if (result.isError) {
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
            Result.Failure(`data staging record or import not found `, 404).asResponse(res);
            next();
        }
    }

    private static getFile(req: Request, res: Response, next: NextFunction) {
        FileDataStorage.Instance.Retrieve(req.params.fileID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return;
                }

                res.status(200).json(result);
            })
            .catch((err) => {
                Result.Failure(err, 404).asResponse(res);
            })
            .finally(() => next());
    }

    private static updateFile(req: Request, res: Response, next: NextFunction) {
        const fileNames: string[] = [];
        const files: Promise<Result<File>>[] = [];
        const dataStagingRecords: Promise<Result<Import | DataStaging[] | boolean>>[] = [];
        const busboy = Busboy({headers: req.headers});
        const metadata: {[key: string]: any} = {};
        let metadataFieldCount = 0;

        if (!req.dataSource) {
            Result.Failure(`unable to find data source`, 404).asResponse(res);
            next();
            return;
        }

        // upload the file to the relevant file storage provider, saving the file name
        // we can't actually wait on the full upload to finish, so there is no way we
        // can take information about the upload and pass it later on in the busboy parsing
        // because of this we're treating the file upload as fairly standalone
        busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: FileInfo) => {
            const {filename, encoding, mimeType} = info;
            // check if this is the metadata file - if it is, attempt to process it
            if (fieldname === 'metadata') {
                if (mimeType === 'application/json') {
                    dataStagingRecords.push(
                        req.dataSource!.ReceiveData(file as Readable, req.currentUser!, {
                            importID: req.query.importID as string | undefined,
                            returnStagingRecords: true,
                            bufferSize: Config.data_source_receive_buffer,
                        }),
                    );
                } else if (mimeType === 'text/csv') {
                    dataStagingRecords.push(
                        req.dataSource!.ReceiveData(file as Readable, req.currentUser!, {
                            importID: req.query.importID as string | undefined,
                            returnStagingRecords: true,
                            transformStream: csv({
                                downstreamFormat: 'array', // this is necessary as the ReceiveData expects an array of json, not single objects
                            }),
                            bufferSize: Config.data_source_receive_buffer,
                        }),
                    );
                } else if (mimeType === 'text/xml' || mimeType === 'application/xml') {
                    const xmlStream = xmlParser.createStream();
                    dataStagingRecords.push(
                        req.dataSource!.ReceiveData(file as Readable, req.currentUser!, {
                            importID: req.query.importID as string | undefined,
                            returnStagingRecords: true,
                            transformStream: xmlStream,
                            bufferSize: Config.data_source_receive_buffer,
                        }),
                    );
                }
            } else {
                files.push(
                    new FileRepository().updateFile(
                        req.params.fileID,
                        req.params.containerID,
                        req.params.sourceID,
                        req.currentUser!,
                        filename,
                        file as Readable,
                    ),
                );
                fileNames.push(filename);
            }
        });

        busboy.on('error', (e: any) => {
            Result.Error(e).asResponse(res);
            return;
        });

        // hold on to the field data, we consider this metadata and will create
        // a record to be ingested by deep lynx once the busboy finishes parsing
        busboy.on('field', (fieldName: string, value: any) => {
            metadata[fieldName] = value;
            metadataFieldCount++;
        });

        busboy.on('finish', () => {
            // if there is no additional metadata we do not not create information
            // to be processed by Deep Lynx, simply store the file and make it available
            // via the normal file querying channels
            void Promise.all(files)
                .then((results) => {
                    if (dataStagingRecords.length > 0) {
                        void Promise.all(dataStagingRecords)
                            .then((stagingResults) => {
                                stagingResults.forEach((stagingResult) => {
                                    if (stagingResult.isError) {
                                        stagingResult.asResponse(res);
                                        return;
                                    }

                                    (stagingResult.value as DataStaging[]).forEach((stagingResult) => {
                                        results.forEach((fileResult) => {
                                            void stagingRepo
                                                .addFile(stagingResult, fileResult.value.id!)
                                                .then((addFileResult) => {
                                                    if (addFileResult.isError) {
                                                        Logger.error(`error adding file to staging record ${addFileResult.error?.error}`);
                                                    } else {
                                                        Logger.debug(`file added to staging record successfully`);
                                                    }
                                                })
                                                .catch((e) => {
                                                    Logger.error(`error adding file to staging record ${e}`);
                                                });
                                        });
                                    });
                                });
                            })
                            .catch((e) => {
                                Result.Error(e).asResponse(res);
                                return;
                            });
                    }

                    if (metadataFieldCount === 0) {
                        Result.Success(results).asResponse(res);
                        next();
                        return;
                    } else {
                        const updatePromises: Promise<Result<boolean>>[] = [];
                        // eslint-disable-next-line @typescript-eslint/no-for-in-array
                        for (const i in results) {
                            if (results[i].isError) {
                                continue;
                            }

                            results[i].value.metadata = metadata;
                            updatePromises.push(new FileRepository().save(results[i].value, req.currentUser!));
                        }

                        void Promise.all(updatePromises)
                            .then(() => {
                                if (results.length === 1) {
                                    results[0].asResponse(res);
                                    next();
                                    return;
                                }

                                Result.Success(results).asResponse(res);
                                next();
                                return;
                            })
                            .catch((err) => {
                                Result.Error(err).asResponse(res);
                            });
                    }
                })
                .catch((e) => {
                    Result.Error(e).asResponse(res);
                    return;
                });
        });

        return req.pipe(busboy);
    }

    private static downloadFile(req: Request, res: Response, next: NextFunction) {
        fileRepo
            .findByIDAndContainer(req.params.fileID, req.params.containerID)
            .then((file) => {
                if (file.isError) {
                    file.asResponse(res);
                    return;
                }

                res.attachment(file.value.file_name);
                fileRepo
                    .downloadFile(file.value)
                    .then((stream) => {
                        if (!stream) {
                            res.sendStatus(500);
                            return;
                        }

                        stream.pipe(res);
                    })
                    .catch((err) => {
                        Result.Error(err).asResponse(res);
                    });
            })
            .catch(() => Result.Failure(`unable to find file`).asResponse(res));
    }

    private static uploadFile(req: Request, res: Response, next: NextFunction) {
        const fileNames: string[] = [];
        const files: Promise<Result<File>>[] = [];
        const dataStagingRecords: Promise<Result<Import | DataStaging[] | boolean>>[] = [];
        const busboy = Busboy({headers: req.headers});
        const metadata: {[key: string]: any} = {};
        let metadataFieldCount = 0;

        if (!req.dataSource) {
            Result.Failure(`unable to find data source`, 404).asResponse(res);
            next();
            return;
        }

        // upload the file to the relevant file storage provider, saving the file name
        // we can't actually wait on the full upload to finish, so there is no way we
        // can take information about the upload and pass it later on in the busboy parsing
        // because of this we're treating the file upload as fairly standalone
        busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: FileInfo) => {
            const {filename, encoding, mimeType} = info;
            // check if this is the metadata file - if it is, attempt to process it
            if (fieldname === 'metadata') {
                if (mimeType === 'application/json') {
                    dataStagingRecords.push(
                        req.dataSource!.ReceiveData(file as Readable, req.currentUser!, {
                            importID: req.query.importID as string | undefined,
                            returnStagingRecords: true,
                            bufferSize: Config.data_source_receive_buffer,
                            has_files: true,
                        }),
                    );
                } else if (mimeType === 'text/csv') {
                    dataStagingRecords.push(
                        req.dataSource!.ReceiveData(file as Readable, req.currentUser!, {
                            importID: req.query.importID as string | undefined,
                            returnStagingRecords: true,
                            transformStream: csv({
                                downstreamFormat: 'array', // this is necessary as the ReceiveData expects an array of json, not single objects
                            }),
                            bufferSize: Config.data_source_receive_buffer,
                            has_files: true,
                        }),
                    );
                } else if (mimeType === 'text/xml' || mimeType === 'application/xml') {
                    const xmlStream = xmlParser.createStream();
                    dataStagingRecords.push(
                        req.dataSource!.ReceiveData(file as Readable, req.currentUser!, {
                            importID: req.query.importID as string | undefined,
                            returnStagingRecords: true,
                            transformStream: xmlStream,
                            bufferSize: Config.data_source_receive_buffer,
                            has_files: true,
                        }),
                    );
                }
            } else {
                files.push(new FileRepository().uploadFile(req.params.containerID, req.currentUser!, filename, file as Readable, req.params.sourceID));
                fileNames.push(filename);
            }
        });

        busboy.on('error', (e: any) => {
            Result.Error(e).asResponse(res);
            return;
        });

        // hold on to the field data, we consider this metadata and will create
        // a record to be ingested by deep lynx once the busboy finishes parsing
        busboy.on('field', (fieldName: string, value: any) => {
            metadata[fieldName] = value;
            metadataFieldCount++;
        });

        busboy.on('finish', () => {
            // if there is no additional metadata we do not not create information
            // to be processed by Deep Lynx, simply store the file and make it available
            // via the normal file querying channels
            void Promise.all(files)
                .then((results) => {
                    if (dataStagingRecords.length > 0) {
                        void Promise.all(dataStagingRecords)
                            .then((stagingResults) => {
                                stagingResults.forEach((stagingResult) => {
                                    if (stagingResult.isError) {
                                        stagingResult.asResponse(res);
                                        return;
                                    }

                                    (stagingResult.value as DataStaging[]).forEach((stagingResult) => {
                                        results.forEach((fileResult) => {
                                            void stagingRepo
                                                .addFile(stagingResult, fileResult.value.id!)
                                                .then((addFileResult) => {
                                                    if (addFileResult.isError) {
                                                        Logger.error(`error adding file to staging record ${addFileResult.error?.error}`);
                                                    } else {
                                                        Logger.debug(`file added to staging record successfully`);
                                                    }
                                                })
                                                .catch((e) => {
                                                    Logger.error(`error adding file to staging record ${e}`);
                                                });
                                        });
                                    });
                                });
                            })
                            .catch((e) => {
                                Result.Error(e).asResponse(res);
                                return;
                            });
                    }

                    if (metadataFieldCount === 0) {
                        Result.Success(results).asResponse(res);
                        next();
                        return;
                    } else {
                        const updatePromises: Promise<Result<boolean>>[] = [];
                        // eslint-disable-next-line @typescript-eslint/no-for-in-array
                        for (const i in results) {
                            if (results[i].isError) {
                                continue;
                            }

                            results[i].value.metadata = metadata;
                            updatePromises.push(new FileRepository().save(results[i].value, req.currentUser!));
                        }

                        void Promise.all(updatePromises)
                            .then(() => {
                                if (results.length === 1) {
                                    results[0].asResponse(res);
                                    next();
                                    return;
                                }

                                Result.Success(results).asResponse(res);
                                next();
                                return;
                            })
                            .catch((err) => {
                                Result.Error(err).asResponse(res);
                            });
                    }
                })
                .catch((e) => {
                    Result.Error(e).asResponse(res);
                    return;
                });
        });

        return req.pipe(busboy);
    }

    // createManualImport will accept either a file or a raw JSON body
    private static addDataToImport(req: Request, res: Response, next: NextFunction) {
        if (req.dataSource && req.dataImport) {
            if (req.headers['content-type']?.includes('application/json') || req.headers['Content-Type']?.includes('application/json')) {
                req.dataSource
                    .ReceiveData(req, req.currentUser!, {importID: req.dataImport.id, bufferSize: Config.data_source_receive_buffer})
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => Result.Failure(err, 404).asResponse(res))
                    .finally(() => next());
                // @ts-ignore
            } else {
                const busboy = Busboy({headers: req.headers});
                const importPromises: Promise<Result<Import | DataStaging[] | boolean>>[] = [];

                busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: FileInfo) => {
                    const {filename, encoding, mimeType} = info;
                    Logger.debug(`file found at ${fieldname} - ${filename}, attempting upload`);
                    if (mimeType === 'application/json') {
                        // shouldn't need to do anything special for a valid json file, ReceiveData can handle valid json
                        // files
                        importPromises.push(
                            req.dataSource!.ReceiveData(file as Readable, req.currentUser!, {
                                importID: req.dataImport!.id,
                                bufferSize: Config.data_source_receive_buffer,
                            }),
                        );
                    } else if (mimeType === 'text/csv') {
                        importPromises.push(
                            req.dataSource!.ReceiveData(file as Readable, req.currentUser!, {
                                importID: req.dataImport!.id,
                                transformStream: csv({
                                    downstreamFormat: 'array', // this is necessary as the ReceiveData expects an array of json, not single objects
                                }),
                                bufferSize: Config.data_source_receive_buffer,
                            }),
                        );
                    } else if (mimeType === 'text/xml' || mimeType === 'application/xml') {
                        const xmlStream = xmlParser.createStream();
                        importPromises.push(
                            req.dataSource!.ReceiveData(file as Readable, req.currentUser!, {
                                importID: req.dataImport!.id,
                                transformStream: xmlStream,
                                bufferSize: Config.data_source_receive_buffer,
                            }),
                        );
                    }
                });

                busboy.on('finish', () => {
                    if (importPromises.length <= 0) {
                        Result.Failure(`no valid files attached`).asResponse(res);
                        next();
                        return;
                    }

                    Promise.all(importPromises)
                        .then((imports) => {
                            if (imports.length <= 0) {
                                Result.Failure(`no json or csv files included for upload`);
                            } else if (imports.length === 1) {
                                imports[0].asResponse(res);
                            } else {
                                Result.Success(imports).asResponse(res);
                            }

                            next();
                            return;
                        })
                        .catch((err) => {
                            Result.Error(err).asResponse(res);
                        });
                });

                return req.pipe(busboy);
            }
        } else {
            Result.Failure(`unable to find data source or import`, 404).asResponse(res);
            next();
        }
    }

    private static reprocessImport(req: Request, res: Response, next: NextFunction) {
        if (req.dataImport) {
            importRepo
                .reprocess(req.dataImport.id!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`unable to find data source or import`, 404).asResponse(res);
            next();
        }
    }
}
