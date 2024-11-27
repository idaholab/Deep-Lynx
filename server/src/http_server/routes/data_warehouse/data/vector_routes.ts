import { Request, Response, NextFunction, Application } from "express";
import Result from "../../../../common_classes/result";
import { plainToClass } from "class-transformer";
import VectorData from "../../../../domain_objects/data_warehouse/data/vector";
import { FileInfo } from "busboy";
import VectorRepository from "../../../../data_access_layer/repositories/data_warehouse/data/vector_repository";
const Busboy = require('busboy');
const JSONStream = require('JSONStream');

export default class VectorRoutes {
    public static mount(app: Application, middleware: any[]) {
        // insert vectors via json. TODO: better encoding for this?
        app.post('/vectors/copy', ...middleware, this.uploadVectors);
        // vector comparison (similarity search)
        app.post('/vectors/search', ...middleware, this.similaritySearch);
    }

    private static uploadVectors(req: Request, res: Response, next: NextFunction) {
        const repo = new VectorRepository();
        let embeddings: VectorData[] = [];

        // if we have a json body, ignore anything else and simply use the json
        if (req.headers['content-type']?.includes('application/json')) {
            if (Array.isArray(req.body)) {
                embeddings = plainToClass(VectorData, req.body);
            } else {
                embeddings = [plainToClass(VectorData, req.body as object)];
            }
            repo.copyFromJson(embeddings)
                .then((result) => {
                    if (result.isError) {
                        res.status(500).json(result);
                        next();
                        return;
                    }

                    res.status(200).json(result);
                    next();
                    return;
                })
                .catch((e) => {
                    Result.Failure(`error parsing body: ${(e as Error).message}`).asResponse(res);
                    return;
                });
        } else if (req.headers['content-type']) {
            const busboy = Busboy({headers: req.headers});

            busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: FileInfo) => {
                if (info.mimeType !== 'application/json') {
                    Result.Failure('text and embeddings must be in a .json file').asResponse(res);
                    return;
                }

                const stream = JSONStream.parse();
                file.pipe(stream);

                stream.on('data', (data: any) => {
                    let embeddingsToAdd: VectorData[] = []
                    if (Array.isArray(data)) {
                        embeddingsToAdd = plainToClass(VectorData, data);
                    } else {
                        embeddingsToAdd = [plainToClass(VectorData, data as object)];
                    }
                    embeddings.push(...embeddingsToAdd);
                });

                stream.on('error', (error: Error) => {
                    Result.Failure(error.message).asResponse(res);
                });

                stream.on('end', () => {
                    repo.copyFromJson(embeddings)
                        .then((result) => {
                            if (result.isError) {
                                res.status(500).json(result);
                                next();
                                return;
                            }
        
                            res.status(200).json(result);
                            next();
                            return;
                        })
                        .catch((e) => {
                            Result.Failure(`error parsing body: ${(e as Error).message}`).asResponse(res);
                            return;
                        });
                });
            });

            busboy.on('error', (error: Error) => {
                Result.Failure(error.message).asResponse(res);
                return;
            });
    
            try {
                return req.pipe(busboy);
            } catch (e: any) {
                Result.Failure(`error parsing body: ${(e as Error).message}`).asResponse(res);
                return;
            }
        } else {
            Result.Failure(`unable to find embeddings`, 404).asResponse(res);
            next();
            return;
        }
    }

    private static similaritySearch(req: Request, res: Response, next: NextFunction) {
        const repo = new VectorRepository();
        let embedding: number[] = [];

        if (req.headers['content-type']?.includes('application/json')) {
            if (Array.isArray(req.body)) {
                embedding = req.body[0]['ebmedding']
            } else {
                embedding = req.body['embedding']
            }
            repo.similaritySearch(embedding)
                .then((result) => {
                    if (result.isError) {
                        res.status(500).json(result);
                        next();
                        return;
                    }

                    res.status(200).json(result);
                    next();
                    return;
                })
                .catch((e) => {
                    Result.Failure(`error parsing body: ${(e as Error).message}`).asResponse(res);
                    return;
                });
        } else if (req.headers['content-type']) {
            const busboy = Busboy({headers: req.headers});

            busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: FileInfo) => {
                if (info.mimeType !== 'application/json') {
                    Result.Failure('query embedding must be in a .json file').asResponse(res);
                    return;
                }

                const stream = JSONStream.parse('*');
                file.pipe(stream);

                stream.on('data', (data: any) => {
                    embedding.push(data);
                });

                stream.on('error', (error: Error) => {
                    Result.Failure(error.message).asResponse(res);
                });

                stream.on('end', () => {
                    repo.similaritySearch(embedding)
                        .then((result) => {
                            if (result.isError) {
                                res.status(500).json(result);
                                next();
                                return;
                            }

                            res.status(200).json(result);
                            next();
                            return;
                        })
                        .catch((e) => {
                            Result.Failure(`error parsing body: ${(e as Error).message}`).asResponse(res);
                            return;
                        });
                });
            });

            busboy.on('error', (error: Error) => {
                Result.Failure(error.message).asResponse(res);
                return;
            });
    
            try {
                return req.pipe(busboy);
            } catch (e: any) {
                Result.Failure(`error parsing body: ${(e as Error).message}`).asResponse(res);
                return;
            }
        } else {
            Result.Failure(`unable to find query embedding`, 404).asResponse(res);
            next();
            return;
        }
    }
}