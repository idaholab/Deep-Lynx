// Class Transformer
import {plainToInstance} from 'class-transformer';

// Common Classes
import Result from '../../../../../common_classes/result';

// Domain Objects
import Tag from '../../../../../domain_objects/data_warehouse/data/tag';
import {NodeIDPayload} from '../../../../../domain_objects/data_warehouse/data/node';

// Express
import {NextFunction, Request, Response} from 'express';

// Repository
import TagRepository from '../../../../../data_access_layer/repositories/data_warehouse/data/tag_repository';
import { EdgeIDPayload } from '../../../../../domain_objects/data_warehouse/data/edge';
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
            tagRepo
                .create(tag, req.currentUser!)
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
                .finally(() => next());
        });
    }

    public static updateTag(req: Request, res: Response, next: NextFunction) {
        if (req.tag && req.container) {
            const payload: Tag = plainToInstance(Tag, {...req.body, id: req.tag.id!, container_id: req.container.id!} as object);

            tagRepo
                .update(payload, req.currentUser!)
                .then((result) => {
                    if (result.isError) {
                        Result.Error(result.error?.error).asResponse(res);
                        return;
                    }

                    Result.Success(result).asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`container or tag not found`, 404).asResponse(res);
            next();
        }
    }

    public static attachTagToNode(req: Request, res: Response, next: NextFunction) {
        if (req.tag && req.node) {
            tagRepo
                .tagNode(req.tag, req.node)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`tag or node not found`, 404).asResponse(res);
            next();
        }
    }

    public static bulkTagNodes(req: Request, res: Response, next: NextFunction) {
        if (req.tag && req.body) {
            const payload = plainToInstance(NodeIDPayload, req.body as object);

            tagRepo
                .bulkTagNode(req.tag, payload.node_ids!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`tag not found or node IDs not supplied`, 404).asResponse(res);
            next();
        }
    }

    public static bulkDetachNodeTag(req: Request, res: Response, next: NextFunction) {
        if (req.tag && req.body) {
            const payload = plainToInstance(NodeIDPayload, req.body as object);

            tagRepo
                .bulkDetachNodeTag(req.tag, payload.node_ids!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`tag not found or node IDs not supplied`, 404).asResponse(res);
            next();
        }
    }

    public static bulkTagEdges(req: Request, res: Response, next: NextFunction) {
        if (req.tag && req.body) {
            const payload = plainToInstance(EdgeIDPayload, req.body as object);

            tagRepo
                .bulkTagEdge(req.tag, payload.edge_ids!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`tag not found or edge IDs not supplied`, 404).asResponse(res);
            next();
        }
    }

    public static bulkDetachEdgeTag(req: Request, res: Response, next: NextFunction) {
        if (req.tag && req.body) {
            const payload = plainToInstance(EdgeIDPayload, req.body as object);

            tagRepo
                .bulkDetachEdgeTag(req.tag, payload.edge_ids!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`tag not found or edge IDs not supplied`, 404).asResponse(res);
            next();
        }
    }

    public static attachTagToEdge(req: Request, res: Response, next: NextFunction) {
        if (req.tag && req.edge) {
            tagRepo
                .tagEdge(req.tag, req.edge)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`tag or edge not found`, 404).asResponse(res);
            next();
        }
    }

    public static attachTagToFile(req: Request, res: Response, next: NextFunction) {
        if (req.tag && req.file) {
            tagRepo
                .tagFile(req.tag, req.file)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`tag or file not found`, 404).asResponse(res);
            next();
        }
    }

    public static listTags(req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            new TagRepository()
                .where()
                .containerID('eq', req.container.id!)
                .list()
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`container not found`, 404).asResponse(res);
            next();
        }
    }

    public static listFilesWithAnyTag(req: Request, res: Response, next: NextFunction) {
        new TagRepository()
            .join('file_tags', {origin_col: 'id', destination_col: 'tag_id'}, {join_type: 'INNER'})
            .join('files', {origin_col: 'file_id', destination_col: 'id'}, {join_type: 'INNER', origin: 'file_tags'}, )
            .addFields({id: 'file_id', created_at: 'file_created_at', modified_at: 'file_modified_at', file_name: 'file_name', file_size: 'file_size'}, 'files')
            .where()
            .containerID('eq', req.container!.id!)
            .list()
            .then((result) => {
                result.asResponse(res);
            })
            .catch((err) => {
                Result.Error(err).asResponse(res);
            })
            .finally(() => next());
    }

    public static listTagsForNode(req: Request, res: Response, next: NextFunction) {
        if (req.node) {
            tagRepo
                .listTagsForNode(req.node)
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

    public static listTagsForFile(req: Request, res: Response, next: NextFunction) {
        if (req.file) {
            tagRepo
                .listTagsForFile(req.file)
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

    public static listTagsForEdge(req: Request, res: Response, next: NextFunction) {
        if (req.edge) {
            tagRepo
                .listTagsForEdge(req.edge)
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

    public static listNodesWithTag(req: Request, res: Response, next: NextFunction) {
        if (req.tag) {
            tagRepo
                .listNodesWithTag(req.tag)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`tag not found`, 404).asResponse(res);
            next();
        }
    }

    public static detachTagFromNode(req: Request, res: Response, next: NextFunction) {
        if (req.tag && req.node) {
            tagRepo
                .detachTagFromNode(req.tag, req.node)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`tag or node not found`, 404).asResponse(res);
            next();
        }
    }

    public static detachTagFromEdge(req: Request, res: Response, next: NextFunction) {
        if (req.tag && req.edge) {
            tagRepo
                .detachTagFromEdge(req.tag, req.edge)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`tag or edge not found`, 404).asResponse(res);
            next();
        }
    }

    public static detachTagFromFile(req: Request, res: Response, next: NextFunction) {
        if (req.tag && req.file) {
            tagRepo
                .detachTagFromFile(req.tag, req.file)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`tag or file not found`, 404).asResponse(res);
            next();
        }
    }

    public static listFilesWithTag(req: Request, res: Response, next: NextFunction) {
        if (req.tag) {
            tagRepo
                .listFilesWithTag(req.tag)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`tag not found`, 404).asResponse(res);
            next();
        }
    }

    public static listEdgesWithTag(req: Request, res: Response, next: NextFunction) {
        if (req.tag) {
            tagRepo
                .listEdgesWithTag(req.tag)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`tag not found`, 404).asResponse(res);
            next();
        }
    }
}
