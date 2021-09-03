/* eslint-disable @typescript-eslint/ban-ts-comment */
import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer} from '../../../middleware';
import ImportMapper from '../../../../data_access_layer/mappers/data_warehouse/import/import_mapper';
import {Readable} from 'stream';
import FileDataStorage from '../../../../data_access_layer/mappers/data_warehouse/data/file_mapper';
import Result from '../../../../common_classes/result';
import File from '../../../../data_warehouse/data/file';
import FileRepository from '../../../../data_access_layer/repositories/data_warehouse/data/file_repository';
import DataStagingRepository from '../../../../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import {plainToClass} from 'class-transformer';
import Import, {DataStaging} from '../../../../data_warehouse/import/import';
import ImportRepository from '../../../../data_access_layer/repositories/data_warehouse/import/import_repository';
import {QueryOptions} from '../../../../data_access_layer/repositories/repository';
import {toStream} from '../../../../services/utilities';

const Busboy = require('busboy');
const fileUpload = require('express-fileupload');
const csv = require('csvtojson');
const fileRepo = new FileRepository();
const stagingRepo = new DataStagingRepository();
const importRepo = new ImportRepository();

// This contains all routes pertaining to DataSources.
export default class ImportRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.get('/containers/:containerID/import/datasources/:sourceID/imports', ...middleware, authInContainer('read', 'data'), this.listDataSourcesImports);
        app.post(
            '/containers/:containerID/import/datasources/:sourceID/imports',
            ...middleware,
            fileUpload({limits: {fileSize: 50 * 6024 * 6024}}),
            authInContainer('write', 'data'),
            this.createManualImport,
        );

        app.post('/containers/:containerID/datasources/:sourceID/imports/', ...middleware, authInContainer('write', 'data'), this.createImport);
        app.delete('/containers/:containerID/import/imports/:importID', ...middleware, authInContainer('write', 'data'), this.deleteImport);
        app.post(
            '/containers/:containerID/datasources/:sourceID/imports/:importID/data',
            ...middleware,
            authInContainer('write', 'data'),
            this.addDataToImport,
        );
        app.get('/containers/:containerID/import/imports/:importID/data', ...middleware, authInContainer('read', 'data'), this.listDataForImport);
        app.get('/containers/:containerID/import/imports/:importID/data/:dataID', ...middleware, authInContainer('read', 'data'), this.getImportData);
        app.put('/containers/:containerID/import/imports/:importID/data/:dataID', ...middleware, authInContainer('write', 'data'), this.updateImportData);
        app.delete('/containers/:containerID/import/imports/:importID/data/:dataID', ...middleware, authInContainer('write', 'data'), this.deleteImportData);

        app.post('/containers/:containerID/import/datasources/:sourceID/files', ...middleware, authInContainer('write', 'data'), this.uploadFile);
        app.get('/containers/:containerID/files/:fileID', ...middleware, authInContainer('read', 'data'), this.getFile);
        app.get('/containers/:containerID/files/:fileID/download', ...middleware, authInContainer('read', 'data'), this.downloadFile);
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
                    res.status(500).json(err.message);
                })
                .finally(() => next());
        } else {
            Result.Failure(`unable to find data source`, 404).asResponse(res);
            next();
        }
    }

    private static deleteImport(req: Request, res: Response, next: NextFunction) {
        ImportMapper.Instance.Delete(req.params.importID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return;
                }

                res.sendStatus(200);
            })
            .catch((err) => {
                res.status(404).send(err);
            })
            .finally(() => next());
    }

    private static listDataSourcesImports(req: Request, res: Response, next: NextFunction) {
        // we'll use a fresh repository every time to insure no leftover queries
        let repository = new ImportRepository();
        repository = repository.where().dataSourceID('eq', req.params.sourceID);

        if (req.query.count !== 'undefined' && req.query.count === 'true') {
            repository
                .count()
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next());
        } else {
            repository
                .list({
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                    sortBy: req.query.sortBy,
                    sortDesc: req.query.sortDesc ? req.query.sortDesc === 'true' : undefined,
                } as QueryOptions)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    res.status(404).send(err);
                })
                .finally(() => next());
        }
    }

    private static listDataForImport(req: Request, res: Response, next: NextFunction) {
        // we'll use a fresh repository every time to insure no leftover queries
        let repository = new DataStagingRepository();
        repository = repository.where().importID('eq', req.params.importID);

        if (req.query.count !== 'undefined' && req.query.count === 'true') {
            repository
                .count()
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next());
        } else {
            repository
                .list({
                    limit: req.query.limit ? +req.query.limit : undefined,
                    offset: req.query.offset ? +req.query.offset : undefined,
                    sortBy: req.query.sortBy,
                    sortDesc: req.query.sortDesc ? req.query.sortDesc === 'true' : undefined,
                } as QueryOptions)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    res.status(404).send(err);
                })
                .finally(() => next());
        }
    }

    // createManualImport will accept either a file or a raw JSON body
    private static createManualImport(req: Request, res: Response, next: NextFunction) {
        if (req.dataSource) {
            if (Object.keys(req.body).length !== 0) {
                req.dataSource
                    .ReceiveData(toStream(req.body), req.currentUser!)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => res.status(404).send(err))
                    .finally(() => next());
                // @ts-ignore
            } else if (req.files.import.mimetype === 'application/json') {
                req.dataSource
                    // @ts-ignore
                    .ReceiveData(toStream(JSON.parse(req.files.import.data)), req.currentUser!)
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => {
                        res.status(404).send(err);
                    })
                    .finally(() => next());
            }
            // @ts-ignore - we have to handle microsoft's excel csv type, as when you save a csv file using excel the mimetype is different than text/csv
            else if (req.files.import.mimetype === 'text/csv' || req.files.import.mimetype === 'application/vnd.ms-excel') {
                csv()
                    // @ts-ignore
                    .fromString(req.files.import.data.toString())
                    .then((json: any) => {
                        req.dataSource
                            ?.ReceiveData(toStream(json), req.currentUser!)
                            .then((result) => {
                                result.asResponse(res);
                            })
                            .catch((err) => res.status(404).send(err))
                            .finally(() => next());
                    });
            } else {
                res.sendStatus(500);
                next();
            }
        } else {
            Result.Failure(`unable to find data source`, 404).asResponse(res);
            next();
        }
    }

    private static deleteImportData(req: Request, res: Response, next: NextFunction) {
        if (req.dataStagingRecord) {
            stagingRepo
                .delete(req.dataStagingRecord)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
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
                .catch((err) => res.status(500).send(err))
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
            .catch((err) => res.status(404).send(err))
            .finally(() => next());
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
                    .catch((err) => res.status(500).send(err));
            })
            .catch(() => Result.Failure(`unable to find file`).asResponse(res));
    }

    private static uploadFile(req: Request, res: Response, next: NextFunction) {
        const fileNames: string[] = [];
        const files: Promise<Result<File>>[] = [];
        const busboy = new Busboy({headers: req.headers});
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
        busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, filename: string, encoding: string, mimeType: string) => {
            const user = req.currentUser!;
            files.push(
                new FileRepository().uploadFile(req.params.containerID, req.params.sourceID, req.currentUser!, filename, encoding, mimeType, file as Readable),
            );
            fileNames.push(filename);
        });

        // hold on to the field data, we consider this metadata and will create
        // a record to be ingested by deep lynx once the busboy finishes parsing
        busboy.on('field', (fieldName: string, value: any, fieldNameTruncated: boolean, encoding: string, mimetype: string) => {
            metadata[fieldName] = value;
            metadataFieldCount++;
        });

        busboy.on('finish', () => {
            // if there is no additional metadata we do not not create information
            // to be processed by Deep Lynx, simply store the file and make it available
            // via the normal file querying channels
            if (metadataFieldCount === 0) {
                void Promise.all(files).then((results) => {
                    if (results[0].isError) {
                        res.status(500).json(results);
                        next();
                        return;
                    } else {
                        res.status(200).json(results);
                        next();
                        return;
                    }
                });
            } else {
                // update the passed meta information with the file name deep lynx
                // has stored it under
                // eslint-disable-next-line @typescript-eslint/no-for-in-array
                const user = req.currentUser!;

                void Promise.all(files).then((results) => {
                    if (results[0].isError) {
                        res.status(500).json(results);
                        next();
                        return;
                    } else {
                        metadata['deep-lynx-files'] = results;

                        req.dataSource
                            ?.ReceiveData(toStream([metadata]), user)
                            .then((result) => {
                                result.asResponse(res);
                            })
                            .catch((err) => res.status(500).send(err))
                            .finally(() => next());
                    }
                });
            }
        });

        return req.pipe(busboy);
    }

    // createManualImport will accept either a file or a raw JSON body
    private static addDataToImport(req: Request, res: Response, next: NextFunction) {
        if (req.dataSource && req.dataImport) {
            if (Object.keys(req.body).length !== 0) {
                req.dataSource
                    .ReceiveData(toStream(req.body), req.currentUser!, {importID: req.dataImport.id})
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => res.status(404).send(err))
                    .finally(() => next());
                // @ts-ignore
            } else if (req.files.import.mimetype === 'application/json') {
                req.dataSource
                    // @ts-ignore
                    .ReceiveData(toStream(JSON.parse(req.files.import.data)), req.currentUser!, {importID: req.dataImport.id})
                    .then((result) => {
                        result.asResponse(res);
                    })
                    .catch((err) => {
                        res.status(404).send(err);
                    })
                    .finally(() => next());
            }
            // @ts-ignore - we have to handle microsoft's excel csv type, as when you save a csv file using excel the mimetype is different than text/csv
            else if (req.files.import.mimetype === 'text/csv' || req.files.import.mimetype === 'application/vnd.ms-excel') {
                csv()
                    // @ts-ignore
                    .fromString(req.files.import.data.toString())
                    .then((json: any) => {
                        req.dataSource
                            ?.ReceiveData(toStream(json), req.currentUser!, {importID: req.dataImport!.id})
                            .then((result) => {
                                result.asResponse(res);
                            })
                            .catch((err) => res.status(404).send(err))
                            .finally(() => next());
                    });
            } else {
                res.sendStatus(500);
                next();
            }
        } else {
            Result.Failure(`unable to find data source or import`, 404).asResponse(res);
            next();
        }
    }
}
