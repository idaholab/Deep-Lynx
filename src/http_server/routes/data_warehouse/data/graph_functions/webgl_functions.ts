// Class Transformer
import {plainToInstance} from 'class-transformer';

// Common Classes
import Result from '../../../../../common_classes/result';

// Domain Objects
import File from '../../../../../domain_objects/data_warehouse/data/file';
import Tag from '../../../../../domain_objects/data_warehouse/data/tag';

// Express
import {NextFunction, Request, Response} from 'express';

// Repository
import TagRepository from '../../../../../data_access_layer/repositories/data_warehouse/data/tag_repository';
import FileRepository from '../../../../../data_access_layer/repositories/data_warehouse/data/file_repository';
const fileRepo = new FileRepository();
const tagRepo = new TagRepository();

// Utilities
import {Readable} from 'stream';
import {FileInfo} from 'busboy';
const Busboy = require('busboy');
const xmlToJson = require('xml-2-json-streaming');


export default class WebGLFunctions {

    public static createTag(req: Request, res: Response, next: NextFunction) {

        if(!req.query.tag) {
            Result.Failure(`please pass a "tag" query parameter`, 400).asResponse(res);
            return
        }

        let payload: Tag[] = []; 
    
        if (Array.isArray(req.query.tag)) {
            payload = plainToInstance(Tag, [{tag_name: req.query.tag, metadata: {webgl: true}, container_id: req.container!.id!}]);
        } else {
            payload = [plainToInstance(Tag, {tag_name: req.query.tag, metadata: {webgl: true}, container_id: req.container!.id!} as object)];
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
        const busboy = Busboy({headers: req.headers});

        // upload the file to the relevant file storage provider, saving the file name
        // we can't actually wait on the full upload to finish, so there is no way we
        // can take information about the upload and pass it later on in the busboy parsing
        // because of this we're treating the file upload as fairly standalone
        busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: FileInfo) => {
            const {filename, encoding, mimeType} = info;
            files.push(fileRepo.uploadFile(req.params.containerID, req.currentUser!, filename, file as Readable, req.params.sourceID));
            fileNames.push(filename);
        });

        busboy.on('error', (e: any) => {
            Result.Error(e).asResponse(res);
            return;
        });

        busboy.on('finish', () => {
            // if there is no additional metadata we do not not create information
            // to be processed by Deep Lynx, simply store the file and make it available
            // via the normal file querying channels
            void Promise.all(files)
                .then((results) => {
                    results.forEach(result => {
                        const file = result.value;
                        res.locals.tags.forEach((tag: Tag) => {
                            WebGLFunctions.tagWebGL(tag, file);
                        });
                    })

                    Result.Success(results).asResponse(res);
                    next();
                    return;
                })
                .catch((e) => {
                    Result.Error(e).asResponse(res);
                    return;
                });
        });

        return req.pipe(busboy);
    }

    private static tagWebGL(tag: Tag, file: File) {
        tagRepo.tagFile(tag, file);
    }
}


