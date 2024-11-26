// Express
import { Request, Response, NextFunction, Application } from "express";

// Middleware
import { authInContainer } from "../../../middleware";

// Domain Objects
import { TimeseriesInitialRequest } from "../../../../domain_objects/data_warehouse/data/report_query";

// Utilities
import Result from "../../../../common_classes/result";
import { plainToClass } from "class-transformer";
import { Readable } from "stream";
import VectorData from "../../../../domain_objects/data_warehouse/data/vector";
import VectorMapper from "../../../../data_access_layer/mappers/data_warehouse/data/vector_mapper";
import { FileInfo } from "busboy";
const Busboy = require('busboy');
const JSONStream = require('JSONStream');

export default class VectorRoutes {
    public static mount(app: Application, middleware: any[]) {
        // insert vectors via npy file
        app.post('/vectors/copy', ...middleware, this.copyVectors);
    }

    private static copyVectors(req: Request, res: Response, next: NextFunction) {
        const mapper = VectorMapper.Instance;
        let embeddings: VectorData[] = [];

        // if we have a json body, ignore anything else and simply use the json
        if (req.headers['content-type']?.includes('application/json')) {
            if (Array.isArray(req.body)) {
                embeddings = plainToClass(VectorData, req.body);
            } else {
                embeddings = [plainToClass(VectorData, req.body as object)];
            }
            mapper.CopyFromJson(embeddings)
                .then((result) => {
                    result.asResponse(res);
                    next();
                })
                .catch((e) => Result.Error(e).asResponse(res));
        } else {
            const busboy = Busboy({headers: req.headers});

            busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: FileInfo) => {
                if (info.mimeType !== 'application/json') {
                    Result.Failure('text and embeddings must be in a .json file').asResponse(res);
                    return;
                }

                const stream = JSONStream.parse('*');
                file.pipe(stream);

                stream.on('data', (data: any) => {
                    const vectorData = plainToClass(VectorData, data);
                    embeddings.push(vectorData);
                });

                stream.on('error', (error: Error) => {
                    Result.Failure(error.message).asResponse(res);
                });

                stream.on('end', () => {
                    mapper.CopyFromJson(embeddings)
                        .then((result) => {
                            result.asResponse(res);
                            next();
                        })
                        .catch((e) => Result.Error(e).asResponse(res));
                });
            });

            busboy.on('error', (error: Error) => {
                Result.Failure(error.message).asResponse(res);
            });
    
            req.pipe(busboy);
        }
        
        
        if (!req.file) {
            return res.status(400).send('No file uploaded');
        }
    }
}