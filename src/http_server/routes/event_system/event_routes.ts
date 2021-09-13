import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer} from '../../middleware';
import Result from '../../../common_classes/result';
import {plainToClass} from 'class-transformer';
import EventRegistration from '../../../domain_objects/event_system/event_registration';
import EventRegistrationRepository from '../../../data_access_layer/repositories/event_system/event_registration_repository';

const repo = new EventRegistrationRepository();

// This contains all routes pertaining to Events
export default class EventRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/events', ...middleware, authInContainer('write', 'data'), this.createRegisteredEvent);
        app.get('/events', ...middleware, authInContainer('read', 'data'), this.listRegisteredEvent);
        app.get('/events/:eventRegistrationID', ...middleware, authInContainer('read', 'data'), this.retrieveRegisteredEvent);
        app.put('/events/:eventRegistrationID', ...middleware, authInContainer('write', 'data'), this.updateRegisteredEvent);
        app.delete('/events/:eventRegistrationID', ...middleware, authInContainer('write', 'data'), this.deleteRegisteredEvent);
    }

    private static createRegisteredEvent(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;

        const payload = plainToClass(EventRegistration, req.body as object);

        repo.save(payload, user)
            .then((result) => {
                if (result.isError) {
                    result.asResponse(res);
                    return;
                }

                Result.Success(payload).asResponse(res);
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next());
    }

    private static listRegisteredEvent(req: Request, res: Response, next: NextFunction) {
        repo.list()
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return;
                }
                res.status(200).json(result);
            })
            .catch((err) => res.status(404).send(err))
            .finally(() => next());
    }

    private static retrieveRegisteredEvent(req: Request, res: Response, next: NextFunction) {
        if (req.eventRegistration) {
            Result.Success(req.eventRegistration).asResponse(res);
            next();
            return;
        }

        Result.Failure(`event registration not found`, 404).asResponse(res);
        next();
    }

    private static updateRegisteredEvent(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;
        const active = req.query.active;
        if (req.eventRegistration) {
            if (active && active === 'true') {
                repo.setActive(user, req.eventRegistration)
                    .then((updated) => {
                        updated.asResponse(res);
                    })
                    .catch((updated: any) => res.status(500).send(updated))
                    .finally(() => next());
            } else if (active && active === 'false') {
                repo.setInactive(user, req.eventRegistration)
                    .then((updated) => {
                        updated.asResponse(res);
                    })
                    .catch((updated: any) => res.status(500).send(updated))
                    .finally(() => next());
            } else {
                const payload = plainToClass(EventRegistration, req.body as object);
                payload.id = req.eventRegistration.id;

                repo.save(payload, user)
                    .then((updated: Result<boolean>) => {
                        if (updated.isError) {
                            updated.asResponse(res);
                            return;
                        }
                        Result.Success(payload).asResponse(res);
                    })
                    .catch((updated: any) => res.status(500).send(updated));
            }
        } else {
            Result.Failure(`event registration not found`, 404).asResponse(res);
            next();
        }
    }

    private static deleteRegisteredEvent(req: Request, res: Response, next: NextFunction) {
        if (req.eventRegistration) {
            repo.delete(req.eventRegistration)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next());
        } else {
            Result.Failure(`event registration not found`, 404).asResponse(res);
            next();
        }
    }
}
