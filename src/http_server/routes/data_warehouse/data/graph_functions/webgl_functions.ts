// Class Transformer
import {plainToInstance} from 'class-transformer';

// Common Classes
import Result from '../../../../../common_classes/result';

// Domain Objects
import Import, {DataStaging} from '../../../../../domain_objects/data_warehouse/import/import';
import File from '../../../../../domain_objects/data_warehouse/data/file';
import Tag from '../../../../../domain_objects/data_warehouse/data/tag';

// Express
import {NextFunction, Request, Response} from 'express';

// Mappers
import FileDataStorage from '../../../../../data_access_layer/mappers/data_warehouse/data/file_mapper';

// Repository
import TagRepository from '../../../../../data_access_layer/repositories/data_warehouse/data/tag_repository';
import ImportRepository from '../../../../../data_access_layer/repositories/data_warehouse/import/import_repository';
import FileRepository from '../../../../../data_access_layer/repositories/data_warehouse/data/file_repository';
import DataStagingRepository from '../../../../../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
const fileRepo = new FileRepository();
const stagingRepo = new DataStagingRepository();
const tagRepo = new TagRepository();

// Graph Functions
import FileFunctions from '../../import/import_functions/file_functions';
import TagFunctions from './tag_functions';

// Utilities
import {Readable} from 'stream';
import {FileInfo} from 'busboy';
import Logger from '../../../../../services/logger';
import Config from '../../../../../services/config';
const Busboy = require('busboy');
const csv = require('csvtojson');
const xmlToJson = require('xml-2-json-streaming');
const xmlParser = xmlToJson();


export default class WebGLFunctions {

    public static createTag(req: Request, res: Response, next: NextFunction) {

        if(!req.query.tag) {
            Result.Failure(`please provide a 'tag' in the query params. this should be a string or an array of strings`, 400).asResponse(res);
        }

        let payload: Tag[] = []; 
    
        if (Array.isArray(req.query.tag)) {
            payload = plainToInstance(Tag, [{tag_name: req.query.tag, container_id: req.container!.id!}]);
        } else {
            payload = [plainToInstance(Tag, {tag_name: req.query.tag, container_id: req.container!.id!} as object)];
        }
    
        if (req.container) {
            payload.forEach((tag: Tag) => {
                tag.container_id = req.container!.id!;
            });
        }

        res.locals.tags = [];

        payload.forEach((tag: Tag) => {
            tagRepo.create(tag, req.currentUser!)
            .then((result) => {
                if (result.isError) {
                    Result.Error(result.error?.error).asResponse(res);
                    return;
                }
                
                res.locals.tags.push(result.value);
            })
            .catch((err) => {
                Result.Error(err).asResponse(res);
            })
            .finally(() => next());
        });
    }

    public static uploadFiles(req: Request, res: Response, next: NextFunction) {
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

                        results.forEach(result => {
                            const file = result.value;
                            res.locals.tags.forEach((tag: Tag) => {
                                tagWebGL(tag, file);
                            });
                        })

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

                                results.forEach(result => {
                                    const file = result.value;
                                    res.locals.tags.forEach((tag: Tag) => {
                                        tagWebGL(tag, file);
                                    });
                                })
                                
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
}

function tagWebGL(tag: Tag, file: File) {
    console.log("tagging file " + file.id + "with tag " + tag.tag_name + `(${tag.id})`);
    tagRepo.tagFile(tag, file);
}
