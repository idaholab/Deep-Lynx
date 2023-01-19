// Class Transformer
import {plainToInstance} from 'class-transformer';

// Common Classes
import Result from '../../../../../common_classes/result';

// Domain Objects
import Tag from '../../../../../domain_objects/data_warehouse/data/tag';

// Express
import {NextFunction, Request, Response} from 'express';

// Repository
import TagRepository from '../../../../../data_access_layer/repositories/data_warehouse/data/tag_repository';
const tagRepo = new TagRepository();

export default class TagFunctions {
    public static createTag(req: Request, res: Response, next: NextFunction) {

        let payload: Tag[] = []; 
    
        if (Array.isArray(req.body)) {
            payload = plainToInstance(Tag, req.body);
        } else {
            payload = [plainToInstance(Tag, req.body as object)];
        }
    
        if (req.container) {
            payload.forEach((tag: Tag) => {
                tag.container_id = req.container!.id!;
            });
        }
    
        payload.forEach((tag: Tag) => {
            tagRepo.save(tag, req.currentUser!)
            .then((result) => {
                if (result.isError) {
                    Result.Error(result.error?.error).asResponse(res);
                    return;
                }
    
                Result.Success(payload).asResponse(res);
            })
            .catch((err) => {
                Result.Error(err).asResponse(res);
            })
            .finally(() => next());;
        })
    
    }
    
    public static attachTagToNode(req: Request, res: Response, next: NextFunction) {
        if(req.tag && req.node) {
            tagRepo.tagNode(req.tag, req.node)
            .then((result) => {
                result.asResponse(res);
            })
            .catch((err) => {
                Result.Error(err).asResponse(res);
            })
            .finally(() => next());
        }
    }
    
    public static attachTagToEdge(req: Request, res: Response, next: NextFunction) {
        if(req.tag && req.edge) {
            tagRepo.tagEdge(req.tag, req.edge)
            .then((result) => {
                result.asResponse(res);
            })
            .catch((err) => {
                Result.Error(err).asResponse(res);
            })
            .finally(() => next());
        }
    }
    
    public static attachTagToFile(req: Request, res: Response, next: NextFunction) {
        if(req.tag && req.file) {
            tagRepo.tagFile(req.tag, req.file)
            .then((result) => {
                result.asResponse(res);
            })
            .catch((err) => {
                Result.Error(err).asResponse(res);
            })
            .finally(() => next());
        }
    }
}