/* eslint-disable @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-misused-promises */
// Express
import { Request, Response, NextFunction, Application } from "express";

// Middleware
import { authInContainer } from "../../../middleware";

// Domain Objects
import File, { FileDescription } from "../../../../domain_objects/data_warehouse/data/file";
import { TS2InitialRequest } from "../../../../domain_objects/data_warehouse/data/report_query";

// Utilities
import Result from "../../../../common_classes/result";
import { plainToClass } from "class-transformer";
import { FileInfo } from "busboy";
const Busboy = require('busboy');
const JSONStream = require('JSONStream');

// Repositories
import ReportQueryRepository from "../../../../data_access_layer/repositories/data_warehouse/data/report_query_repository";
import FileRepository from "../../../../data_access_layer/repositories/data_warehouse/data/file_repository";
import FileFunctions from "./graph_functions/file_functions";
import FileMapper from "../../../../data_access_layer/mappers/data_warehouse/data/file_mapper";
const fileRepo = new FileRepository();
const queryRepo = new ReportQueryRepository();
const fileMapper = FileMapper.Instance;

export default class ReportRoutes {
    public static mount(app: Application, middleware: any[]) {
        // upload timeseries file
        app.post('/containers/:containerID/import/datasources/:sourceID/files/timeseries',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            ...middleware,
            authInContainer('write', 'data'),
            FileFunctions.uploadTimeseries);
        // upload file description results
        app.post('/containers/:containerID/files/timeseries/describe',
            ...middleware,
            authInContainer('read', 'data'),
            this.uploadFileDescription);
        // view file description
        app.get('/containers/:containerID/files/timeseries/:fileID/description',
            ...middleware,
            authInContainer('read', 'data'),
            this.getFileDescription);
        // kick off a request to the TS2 rust module (either describe OR query)
        app.post('/containers/:containerID/reports/query',
            ...middleware,
            authInContainer('write', 'data'),
            this.queryTimeseries);
        // poll reports to check for status changes
        app.get('/containers/:containerID/reports/:reportID/status',
            ...middleware,
            authInContainer('read', 'data'),
            this.reportStatus);
        // upload completed query results (either describe OR query)
        app.post('/containers/:containerID/reports/:reportID/query/:reportQueryID',
            ...middleware,
            authInContainer('write', 'data'),
            this.uploadResults);
    }

    // allows the TS2 rust module to upload file descriptions to DeepLynx
    private static uploadFileDescription(req: Request, res: Response, next: NextFunction) {
        let fileUploaded = false; // track upload status
        let descriptions: FileDescription[] = [];
        // if we have a json body, ignore anything else and simply run the import with the json
        if (req.headers['content-type']?.includes('application/json')) {
            if (Array.isArray(req.body)) {
                descriptions = plainToClass(FileDescription, req.body);
            } else {
                descriptions = [plainToClass(FileDescription, req.body as object)];
            }
        } else {
            const busboy = Busboy({headers: req.headers});
            busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: FileInfo) => {
                if (info.mimeType !== 'application/json') {
                    Result.Failure('file schema description must be in a .json file').asResponse(res);
                    return;
                }

                const stream = JSONStream.parse('*'); // this will parse every object in the array
                const objects: FileDescription[] = [];

                stream.on('data', (data: any) => {
                    objects.push(plainToClass(FileDescription, data));
                });

                stream.on('error', (e: any) => {
                    Result.Failure(e).asResponse(res);
                    return;
                });

                stream.on('end', () => {
                    descriptions = objects;
                });

                try {
                    file.pipe(stream);
                } catch {
                    Result.Failure('unable to load file schema description from file').asResponse(res);
                    return;
                }
            });

            busboy.on('error', (e: any) => {
                Result.Failure(e).asResponse(res);
                return;
            });

            busboy.on('finish', () => {
                fileUploaded = true; // set the flag to true when upload is complete
            });

            try {
                return req.pipe(busboy);
            } catch {
                Result.Failure('unable to load file schema description from file').asResponse(res);
                return;
            }
        }

        fileRepo
            .setDescriptions(descriptions)
            .then((result) => {
                if (result.isError) {
                    // check for a NOT NULL constraint violation- this indicates
                    // that created_at is NULL which means the file id doesn't exist
                    if (result.error.error.code === '23502') {
                        Result.Failure('one or more file ids not found').asResponse(res);
                        return;
                    }
                    result.asResponse(res);
                    return;
                }

                Result.Success(result).asResponse(res);
            })
            .catch((err) => {
                Result.Error(err).asResponse(res)})
            .finally(() => next());
    }

    // retrieve the file description for the given report file
    private static getFileDescription(req: Request, res: Response, next: NextFunction) {
        fileRepo
            .listDescriptionColumns(req.params.fileID)
            .then((result) => {
                if (result.isError) {
                    res.status(result.error?.errorCode).json(result);
                    return;
                }

                res.status(200).json(result);
            })
            .catch((err) => {
                Result.Failure(err, 500).asResponse(res);
            })
            .finally(() => next());
    }

    // send either a describe or a user-provided query to the TS2 rust module for processing
    private static queryTimeseries(req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            const payload = plainToClass(TS2InitialRequest, req.body as object);

            // override the query with DESCRIBE if specified
            if (req.query.describe && String(req.query.describe).toLowerCase() === 'true') {
                payload.query = `DESCRIBE table`;
            } else if (!payload.query) { // verify that payload contains a query
                Result.Failure(`report must contain a query`).asResponse(res);
                next();
                return;
            }

            // verify that payload contains at least 1 file
            if (!Array.isArray(payload.file_ids) || payload.file_ids.length === 0) {
                Result.Failure(`report must query at least one file`).asResponse(res);
                next();
                return;
            }

            queryRepo
                .initiateQuery(req.container.id!, payload, req.currentUser!)
                .then((result) => {
                    result.asResponse(res);
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

    // check a given report's status
    private static reportStatus(req: Request, res: Response, next: NextFunction) {
        // the middleware should fetch the report, so no need for additional db calls
        if (req.report) {
            // return status and status message of the report to the user
            const responseData = {
                status: req.report.status,
                message: req.report.status_message
            }

            Result.Success(responseData).asResponse(res);
        } else {
            Result.Failure(`unable to find report`).asResponse(res);
            next();
        }
    }

    // endpoint for the TS2 rust module to upload file results. TS2 will already have uploaded the data 
    // to the appropriate storage provider, so we just need to attach the file metadata to the report
    private static uploadResults(req: Request, res: Response, next: NextFunction) {
        if (req.reportQuery && req.report) {
            const toSave = plainToClass(File, req.body as object);
            toSave.container_id = req.params.containerID;

            // save the uploaded file and set it as the result file for the given query ID
            // use the mapper so we can get file ID back
            fileMapper
                .Create(req.currentUser!.id!, toSave)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    const fileID = result.value.id!;

                    queryRepo
                        .setResultFile(req.params.reportID, req.params.reportQueryID, fileID)
                        .then((setResult) => {
                            if (setResult.isError) {
                                Result.Failure(`error adding files to report query ${setResult.error?.error}`).asResponse(res);
                            }

                            Result.Success(fileID).asResponse(res);
                        })
                        .catch((err) => {
                            Result.Error(err).asResponse(res);
                        })
                        .finally(() => next());
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                });
        } else {
            Result.Failure(`unable to find report query`).asResponse(res);
            next();
        }
    }
}