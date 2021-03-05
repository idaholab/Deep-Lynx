import {Request, Response, NextFunction, Application} from "express"
import {UserT} from "../types/user_management/userT";
import {authInContainer} from "./middleware";
import EventStorage from "../data_mappers/events/event_storage";
import Result from "../result";

const storage = EventStorage.Instance;

// This contains all routes pertaining to Events
export default class EventRoutes {
    public static mount(app: Application, middleware:any[]) {
        app.post("/events",...middleware, authInContainer("write", "data"),this.createRegisteredEvent);
        app.get("/events",...middleware, authInContainer("read", "data"),this.listRegisteredEvent);
        app.get("/events/:id",...middleware, authInContainer("read", "data"),this.retrieveRegisteredEvent);
        app.put("/events/:id",...middleware, authInContainer("write", "data"),this.updateRegisteredEvent);
        app.delete("/events/:id",...middleware, authInContainer("write", "data"),this.deleteRegisteredEvent);
    }

    private static createRegisteredEvent(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;
        storage.Create(user.id!, req.body)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static listRegisteredEvent(req: Request, res: Response, next: NextFunction) {
        storage.List()
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

    private static retrieveRegisteredEvent(req: Request, res: Response, next: NextFunction) {
        storage.Retrieve(req.params.id)
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

    private static updateRegisteredEvent(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;
        const active = req.query.active;

        if (active && active === 'true') {
            storage.SetActive(req.params.id, user.id!)
            .then((updated: Result<boolean>) => {
                if (updated.isError && updated.error) {
                    res.status(updated.error.errorCode).json(updated);
                    return
                }
                res.status(200).json(updated)
            })
            .catch((updated:any) => res.status(500).send(updated))
            .finally(() => next())
        } else if (active && active === 'false') {
            storage.SetInActive(req.params.id, user.id!)
            .then((updated: Result<boolean>) => {
                if (updated.isError && updated.error) {
                    res.status(updated.error.errorCode).json(updated);
                    return
                }
                res.status(200).json(updated)
            })
            .catch((updated:any) => res.status(500).send(updated))
            .finally(() => next())
        } else {
            storage.Update(req.params.id, user.id!, req.body)
            .then((updated: Result<boolean>) => {
                if (updated.isError && updated.error) {
                    res.status(updated.error.errorCode).json(updated);
                    return
                }
                res.status(200).json(updated)
            })
            .catch((updated:any) => res.status(500).send(updated))
            .finally(() => next())
        }
    }

    private static deleteRegisteredEvent(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;
        storage.PermanentlyDelete(req.params.id)
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

