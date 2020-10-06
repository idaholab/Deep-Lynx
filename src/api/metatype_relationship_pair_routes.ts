import {Request, Response, NextFunction, Application} from "express"
import MetatypeRelationshipPairStorage from "../data_storage/metatype_relationship_pair_storage";
import {authInContainer} from "./middleware";
import {UserT} from "../types/user_management/userT";
import MetatypeRelationshipPairFilter from "../data_storage/metatype_relationship_pair_filter";

const storage = MetatypeRelationshipPairStorage.Instance;

// This contains all routes for Metatype Relationship Pair management.
export default class MetatypeRelationshipPairRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post("/containers/:id/metatype_relationship_pairs", ...middleware, authInContainer("write", "ontology"),this.createMetatypeRelationshipPair);
        app.get("/containers/:id/metatype_relationship_pairs/:relationshipPairID", ...middleware,authInContainer("read", "ontology"), this.retrieveMetatypeRelationshipPair);
        app.get("/containers/:id/metatype_relationship_pairs/", ...middleware, authInContainer("read", "ontology"),this.listMetatypeRelationshipPairs);
        app.put("/containers/:id/metatype_relationship_pairs/:relationshipPairID", ...middleware, authInContainer("write", "ontology"), this.updateMetatypeRelationshipPair);
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
        let filter = new MetatypeRelationshipPairFilter()
        filter = filter.where().containerID("eq", req.params.id)

        if(typeof req.query.destinationID !== "undefined" && req.query.destinationID as string !== "") {
            filter = filter.and().destination_metatype_id("eq", req.query.destinationID)
        }

        if(typeof req.query.originID !== "undefined" && req.query.originID as string !== "") {
            filter = filter.and().origin_metatype_id("eq", req.query.originID)
        }

        if(typeof req.query.name !== "undefined" && req.query.name as string !== "") {
            filter = filter.and().name("like", `%${req.query.name}%`)
        }

        if(typeof req.query.metatypeID !== "undefined" && req.query.metatypeID as string !== "") {
            filter = filter.and().metatypeID("eq", req.query.metatypeID)
        }

        if(req.query.archived as string !== "true") {
            filter = filter.and().archived("eq", false)
        }

        // @ts-ignore
        filter.all(+req.query.limit, +req.query.offset)
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

    private static updateMetatypeRelationshipPair(req: Request, res: Response, next: NextFunction) {
        storage.Update(req.params.relationshipPairID, req.body)
            .then((updated) => {
                if (updated.isError && updated.error) {
                    res.status(updated.error.errorCode).json(updated);
                    return
                }
                res.status(200).json(updated)
            })
            .catch((updated) => res.status(500).send(updated))
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
