import MetatypeRelationshipStorage from "../data_storage/metatype_relationship_storage";
import {Request, Response, NextFunction, Application} from "express"
import {authInContainer} from "./middleware";
import {UserT} from "../types/user_management/userT";

const storage = MetatypeRelationshipStorage.Instance;

// This contains all routes for managing Metatype Relationships.
export default class MetatypeRelationshipRoutes {
    public static mount(app: Application, middleware: any[]) {
         app.post("/containers/:id/metatype_relationships", ...middleware, authInContainer("write", "ontology"),this.createMetatypeRelationship);
         app.get("/containers/:id/metatype_relationships/:relationshipID", ...middleware, authInContainer("read", "ontology"),this.retrieveMetatypeRelationship);
         app.get("/containers/:id/metatype_relationships", ...middleware, authInContainer("read", "ontology"),this.listMetatypeRelationships);
         app.put("/containers/:id/metatype_relationships/:relationshipID", ...middleware, authInContainer("write", "ontology"),this.updateMetatypeRelationship);
         app.delete("/containers/:id/metatype_relationships/:relationshipID", ...middleware, authInContainer("write", "ontology"),this.archiveMetatypeRelationship)
    }

    private static createMetatypeRelationship(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        storage.Create(req.params.id, user.id!, req.body)
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

        private static retrieveMetatypeRelationship(req: Request, res: Response, next: NextFunction) {
            storage.Retrieve(req.params.relationshipID)
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

        private static listMetatypeRelationships(req: Request, res: Response, next: NextFunction) {
            storage.List(req.params.id, +req.query.offset, +req.query.limit)
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


    private static updateMetatypeRelationship(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        storage.Update(req.params.relationshipID, user.id!, req.body)
            .then((updated) => {
                if (updated.isError && updated.error) {
                    res.status(updated.error.errorCode).json(updated);
                    return
                }
                res.status(200).json(updated)
            })
            .catch((updated) => res.status(500).send(updated))
    }

    private static archiveMetatypeRelationship(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        storage.Archive(req.params.relationshipID, user.id!)
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

