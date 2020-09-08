import {Request, Response, NextFunction, Application} from "express"
import MetatypeRelationshipPairStorage from "../data_storage/metatype_relationship_pair_storage";
import {authInContainer} from "./middleware";
import {UserT} from "../types/user_management/userT";

const storage = MetatypeRelationshipPairStorage.Instance;

// This contains all routes for Metatype Relationship Pair management.
export default class MetatypeRelationshipPairRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post("/containers/:id/metatype_relationship_pairs", ...middleware, authInContainer("write", "ontology"),this.createMetatypeRelationshipPair);
        app.get("/containers/:id/metatype_relationship_pairs/:relationshipPairID", ...middleware,authInContainer("read", "ontology"), this.retrieveMetatypeRelationshipPair);
        app.get("/containers/:id/metatype_relationship_pairs/", ...middleware, authInContainer("read", "ontology"),this.listMetatypeRelationshipPairs);
        app.delete("/containers/:id/metatype_relationship_pairs/:relationshipPairID", ...middleware, authInContainer("write", "ontology"),this.archiveMetatypeRelationshipPair);
    }

    private static createMetatypeRelationshipPair(req: Request, res: Response, next: NextFunction) {
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

    private static retrieveMetatypeRelationshipPair(req: Request, res: Response, next: NextFunction) {
        storage.Retrieve(req.params.relationshipPairID)
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

    private static listMetatypeRelationshipPairs(req: Request, res: Response, next: NextFunction) {
        if (typeof req.query.destinationID !== "undefined") {
            storage.ListByDestinationMetatype(req.query.destinationID as string)
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
        } else if (typeof req.query.originID !== "undefined") {
            storage.ListByOriginMetatype(req.query.originID as string)
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
        } else {
            // @ts-ignore
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
    }


    private static archiveMetatypeRelationshipPair(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        storage.Archive(req.params.relationshipPairID, user.id!)
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
