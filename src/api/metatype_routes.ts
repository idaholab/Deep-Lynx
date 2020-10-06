import MetatypeStorage from "../data_storage/metatype_storage";
import {Request, Response, NextFunction, Application} from "express"
import {authInContainer} from "./middleware";
import {UserT} from "../types/user_management/userT";
import MetatypeFilter from "../data_storage/metatype_filter";

const storage = MetatypeStorage.Instance;

// This contains all routes for managing Metatypes.
export default class MetatypeRoutes {
    public static mount(app: Application, middleware: any[] ) {
         app.post("/containers/:id/metatypes", ...middleware, authInContainer("write", "ontology"), this.createMetatype);
         app.get("/containers/:id/metatypes/:typeID", ...middleware, authInContainer("read", "ontology"), this.retrieveMetatype);
         app.get("/containers/:id/metatypes", ...middleware, authInContainer("read", "ontology"), this.listMetatypes);
         app.put("/containers/:id/metatypes/:typeID", ...middleware, authInContainer("write", "ontology"), this.updateMetatype);
         app.delete("/containers/:id/metatypes/:typeID", ...middleware, authInContainer("write", "ontology"), this.archiveMetatype)
    }
    private static createMetatype(req: Request, res: Response, next: NextFunction) {
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


        private static retrieveMetatype(req: Request, res: Response, next: NextFunction) {
            storage.Retrieve(req.params.typeID)
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

        private static listMetatypes(req: Request, res: Response, next: NextFunction) {
            let filter = new MetatypeFilter()
            filter = filter.where().containerID("eq", req.params.id)

            if(req.query.name as string !== "") {
                filter = filter.and().name("like", `%${req.query.name}%`)
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

    private static updateMetatype(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        storage.Update(req.params.typeID, user.id!, req.body)
            .then((updated) => {
                if (updated.isError && updated.error) {
                    res.status(updated.error.errorCode).json(updated);
                    return
                }
                res.status(200).json(updated)
            })
            .catch((updated) => res.status(500).send(updated))
    }

    private static archiveMetatype(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        storage.Archive(req.params.typeID, user.id!)
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

