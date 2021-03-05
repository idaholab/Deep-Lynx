import {Request, Response, NextFunction, Application} from "express"
import MetatypeRelationshipKeyStorage from "../data_mappers/metatype_relationship_key_storage";
import {authInContainer} from "./middleware";
import {UserT} from "../types/user_management/userT";

const storage = MetatypeRelationshipKeyStorage.Instance;

// This contains all routes pertaining to Metatype Relationship Keys and their management.
export default class MetatypeRelationshipKeyRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post("/containers/:id/metatype_relationships/:relationshipID/keys", ...middleware, authInContainer("write", "ontology"),this.createMetatypeRelationshipKey);
        app.get("/containers/:id/metatype_relationships/:relationshipID/keys/:relationshipKeyID", ...middleware, authInContainer("read", "ontology"), this.retrieveMetatypeRelationshipKey);
        app.get("/containers/:id/metatype_relationships/:relationshipID/keys", ...middleware, authInContainer("read", "ontology"), this.listMetatypeRelationshipKeys);
        app.delete("/containers/:id/metatype_relationships/:relationshipID/keys/:relationshipKeyID", ...middleware, authInContainer("write", "ontology"), this.archiveMetatypeRelationshipKey);
        app.put("/containers/:id/metatype_relationships/:relationshipID/keys/:relationshipKeyID", ...middleware, authInContainer("write", "ontology"),this.updateMetatypeRelationshipKey)
    }

    private static createMetatypeRelationshipKey(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        storage.Create(req.params.relationshipID, user.id!, req.body)
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

    private static retrieveMetatypeRelationshipKey(req: Request, res: Response, next: NextFunction) {
        storage.Retrieve(req.params.relationshipKeyID)
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

    private static listMetatypeRelationshipKeys(req: Request, res: Response, next: NextFunction) {
        storage.List(req.params.relationshipID)
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


    private static updateMetatypeRelationshipKey(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        storage.Update(req.params.relationshipKeyID, user.id!, req.body)
            .then((updated) => {
                if (updated.isError && updated.error) {
                    res.status(updated.error.errorCode).json(updated);
                    return
                }
                res.status(200).json(updated)
            })
            .catch((updated) => res.status(500).send(updated))
    }

    private static archiveMetatypeRelationshipKey(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        storage.Archive(req.params.relationshipKeyID, user.id!)
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
