// Common Classes
import Result from '../../../../../common_classes/result';

// Domain Objects
import Import, {DataStaging} from '../../../../../domain_objects/data_warehouse/import/import';
import File from '../../../../../domain_objects/data_warehouse/data/file';

// Express
import {NextFunction, Request, Response} from 'express';

// Mappers
import FileDataStorage from '../../../../../data_access_layer/mappers/data_warehouse/data/file_mapper';

// Repository
import NodeRepository from '../../../../../data_access_layer/repositories/data_warehouse/data/node_repository';
import EdgeRepository from '../../../../../data_access_layer/repositories/data_warehouse/data/edge_repository';
import FileRepository from '../../../../../data_access_layer/repositories/data_warehouse/data/file_repository';
import DataStagingRepository from '../../../../../data_access_layer/repositories/data_warehouse/import/data_staging_repository';

const fileRepo = new FileRepository();
const nodeRepo = new NodeRepository();
const edgeRepo = new EdgeRepository();
const stagingRepo = new DataStagingRepository();

// Utilities
import {Readable} from 'stream';
import {FileInfo} from 'busboy';
import Logger from '../../../../../services/logger';
import Config from '../../../../../services/config';
const Busboy = require('busboy');
const csv = require('csvtojson');
const xmlToJson = require('xml-2-json-streaming');
const xmlParser = xmlToJson();

export default class FileFunctions {
    public static getFile(req: Request, res: Response, next: NextFunction) {
        fileRepo
            .findByID(req.params.fileID)
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

    public static updateFile(req: Request, res: Response, next: NextFunction) {
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
                files.push(fileRepo.updateFile(req.params.fileID, req.params.containerID, req.currentUser!, filename, file as Readable, req.params.sourceID));
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

    public static downloadFile(req: Request, res: Response, next: NextFunction) {
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

                        if (req.query.deleteAfter && String(req.query.deleteAfter).toLowerCase() === 'true') {
                            res.on('finish', () => {
                                fileRepo.delete(file.value).catch((e) => {
                                    Logger.error(`unable to delete file after downloading ${e.message}`);
                                });
                            });
                        }

                        stream.pipe(res);
                    })
                    .catch((err) => {
                        Result.Error(err).asResponse(res);
                    });
            })
            .catch(() => Result.Failure(`unable to find file`).asResponse(res));
    }

    public static uploadFile(req: Request, res: Response, next: NextFunction) {
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

    public static listFilesForNode(req: Request, res: Response, next: NextFunction) {
        if (req.node) {
            nodeRepo
                .listFiles(req.node)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`node not found`, 404).asResponse(res);
            next();
        }
    }

    public static attachFileToNode(req: Request, res: Response, next: NextFunction) {
        if (req.node && req.file) {
            nodeRepo
                .addFile(req.node, req.file.id!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`node or file not found`, 404).asResponse(res);
            next();
        }
    }

    public static detachFileFromNode(req: Request, res: Response, next: NextFunction) {
        if (req.node && req.file) {
            nodeRepo
                .removeFile(req.node, req.file.id!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`node or file not found`, 404).asResponse(res);
            next();
        }
    }

    public static listFilesForEdge(req: Request, res: Response, next: NextFunction) {
        if (req.edge) {
            edgeRepo
                .listFiles(req.edge)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`edge not found`, 404).asResponse(res);
            next();
        }
    }

    public static attachFileToEdge(req: Request, res: Response, next: NextFunction) {
        if (req.edge && req.file) {
            edgeRepo
                .addFile(req.edge, req.file.id!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`edge or file not found`, 404).asResponse(res);
            next();
        }
    }

    public static detachFileFromEdge(req: Request, res: Response, next: NextFunction) {
        if (req.edge && req.file) {
            edgeRepo
                .removeFile(req.edge, req.file.id!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`edge or file not found`, 404).asResponse(res);
            next();
        }
    }

    public static deleteFile(req: Request, res: Response, next: NextFunction) {
        if (req.file) {
            fileRepo
                .delete(req.file)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`file not found`, 404).asResponse(res);
            next();
        }
    }
}
