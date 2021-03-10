import MetatypeKeyMapper from "../data_access_layer/mappers/metatype_key_mapper"

import {Request, Response, NextFunction, Application} from "express"
import {authInContainer} from "./middleware";
import {UserT} from "../types/user_management/userT";

const storage = MetatypeKeyMapper.Instance;

// This contains all routes pertaining to MetatypeKeys and their management.
export default class MetatypeKeyRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post("/containers/:id/metatypes/:metatypeID/keys", ...middleware, authInContainer("write", "ontology"),this.createMetatypeKey);
        app.get("/containers/:id/metatypes/:metatypeID/keys/:metatypeKeyID", ...middleware, authInContainer("read", "ontology"),this.retrieveMetatypeKey);
        app.get("/containers/:id/metatypes/:metatypeID/keys", ...middleware, authInContainer("read", "ontology"),this.listMetatypeKeys);
        app.delete("/containers/:id/metatypes/:metatypeID/keys/:metatypeKeyID", ...middleware, authInContainer("write", "ontology"),this.archiveMetatypeKey);
        app.put("/containers/:id/metatypes/:metatypeID/keys/:metatypeKeyID", ...middleware, authInContainer("write", "ontology"),this.updateMetatypeKey)
    }

    private static createMetatypeKey(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        storage.Create(req.params.metatypeID, user.id!, req.body)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(201).json(result)
            })
            .catch((err) => {
                res.status(500).json(err.message)
            })
            .finally(() => next())
    }

    private static retrieveMetatypeKey(req: Request, res: Response, next: NextFunction) {
        storage.Retrieve(req.params.metatypeKeyID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }
                res.status(200).json(result)
            })
            .catch((err) => res.status(404).send(err))
            .finally(() => next())
    }

    private static listMetatypeKeys(req: Request, res: Response, next: NextFunction) {
        storage.List(req.params.metatypeID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }
                res.status(200).json(result)
            })
            .catch((err) => {
                res.status(404).send(err)
            })
            .finally(() => next())
    }


    private static updateMetatypeKey(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        storage.Update(req.params.metatypeKeyID, user.id!, req.body)
            .then((updated) => {
                if (updated.isError && updated.error) {
                    res.status(updated.error.errorCode).json(updated);
                    return
                }
                res.status(200).json(updated)
            })
            .catch((updated) => res.status(500).send(updated))
    }

    private static archiveMetatypeKey(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        storage.Archive(req.params.metatypeKeyID, user.id!)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }
                res.sendStatus(200)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }
}
