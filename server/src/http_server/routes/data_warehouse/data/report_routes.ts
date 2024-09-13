/* eslint-disable @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-misused-promises */
// Express
import { Request, Response, NextFunction, Application } from "express";

// Middleware
import { authInContainer } from "../../../middleware";

// Domain Objects
import { TS2InitialRequest } from "../../../../domain_objects/data_warehouse/data/report_query";

// Utilities
import Result from "../../../../common_classes/result";
import { plainToClass } from "class-transformer";

// Repositories
import ReportQueryRepository from "../../../../data_access_layer/repositories/data_warehouse/data/report_query_repository";
import FileRepository from "../../../../data_access_layer/repositories/data_warehouse/data/file_repository";
import FileFunctions from "./graph_functions/file_functions";
const fileRepo = new FileRepository();
const queryRepo = new ReportQueryRepository();

export default class ReportRoutes {
    public static mount(app: Application, middleware: any[]) {
        // upload timeseries file
        app.post('/containers/:containerID/import/datasources/:sourceID/files/timeseries',
            ...middleware,
            authInContainer('write', 'data'),
            FileFunctions.uploadTimeseries);
        // view file description
        app.get('/containers/:containerID/import/datasources/:sourceID/files/:fileID/description',
            ...middleware,
            authInContainer('read', 'data'),
            this.getFileDescription);
        // kick off a request to the TS2 rust module (either describe OR query)
        app.post('/containers/:containerID/import/datasources/:sourceID/reports/query',
            ...middleware,
            authInContainer('write', 'data'),
            this.queryTimeseries);
        // poll reports to check for status changes
        app.get('/containers/:containerID/import/datasources/:sourceID/reports/:reportID',
            ...middleware,
            authInContainer('read', 'data'),
            this.reportStatus);
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

            // verify that payload contains at least 1 file
            if (!Array.isArray(payload.file_ids) || payload.file_ids.length === 0) {
                Result.Failure(`report must query at least one file`).asResponse(res);
                next();
                return;
            }

            // ensure query is included if this isn't a describe
            if ((!req.query.describe || String(req.query.describe).toLowerCase() === 'false') && !payload.query) {
                Result.Failure(`report must contain a query`).asResponse(res);
                next();
                return;
            }

            queryRepo
                .initiateQuery(
                    req.params.containerID, 
                    req.params.sourceID, 
                    payload, 
                    req.currentUser!, 
                    String(req.query.describe).toLowerCase() === 'true'
                 )
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
}
