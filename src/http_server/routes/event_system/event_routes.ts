import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer} from '../../middleware';
import Result from '../../../common_classes/result';
import {plainToClass} from 'class-transformer';
import Event from '../../../domain_objects/event_system/event';
import EventRepository from '../../../data_access_layer/repositories/event_system/event_repository';
import EventActionRepository from '../../../data_access_layer/repositories/event_system/event_action_repository';
import EventActionStatusRepository from '../../../data_access_layer/repositories/event_system/event_action_status_repository';
import EventAction from '../../../domain_objects/event_system/event_action';
import EventActionStatus from '../../../domain_objects/event_system/event_action_status';

const eventRepo = new EventRepository();
const actionRepo = new EventActionRepository();
const statusRepo = new EventActionStatusRepository();

// This contains all routes pertaining to Events
export default class EventRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/events', ...middleware, authInContainer('write', 'data'), this.createEvent);

        app.post('/event_actions', ...middleware, authInContainer('write', 'data'), this.createEventAction);
        app.put('/event_actions/:actionID', ...middleware, authInContainer('write', 'data'), this.updateEventAction);
        app.get('/event_actions', ...middleware, authInContainer('read', 'data'), this.listEventActions);
        app.get('/event_actions/:actionID', ...middleware, authInContainer('read', 'data'), this.retrieveEventAction);
        app.delete('/event_actions/:actionID', ...middleware, authInContainer('write', 'data'), this.deleteEventAction);

        app.put('/event_action_status/:statusID', ...middleware, authInContainer('write', 'data'), this.updateEventActionStatus);
        app.get('/event_action_status', ...middleware, authInContainer('read', 'data'), this.listEventActionStatuses);
        app.get('/event_action_status/:statusID', ...middleware, authInContainer('read', 'data'), this.retrieveEventActionStatus);
    }

    // events
    private static createEvent(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;

        const payload = plainToClass(Event, req.body as object);

        eventRepo
            .save(payload, user)
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

    // event actions
    private static createEventAction(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;

        const payload = plainToClass(EventAction, req.body as object);

        actionRepo
            .save(payload, user)
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

    private static updateEventAction(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;
        const active = req.query.active;
        if (req.eventAction) {
            if (active && String(active).toLowerCase() === 'true') {
                actionRepo
                    .setActive(user, req.eventAction)
                    .then((updated) => {
                        updated.asResponse(res);
                    })
                    .catch((updated: any) => res.status(500).send(updated))
                    .finally(() => next());
            } else if (active && active === 'false') {
                actionRepo
                    .setInactive(user, req.eventAction)
                    .then((updated) => {
                        updated.asResponse(res);
                    })
                    .catch((updated: any) => res.status(500).send(updated))
                    .finally(() => next());
            } else {
                const payload = plainToClass(EventAction, req.body as object);
                payload.id = req.eventAction.id;

                actionRepo
                    .save(payload, user)
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
            Result.Failure(`event action not found`, 404).asResponse(res);
            next();
        }
    }

    private static listEventActions(req: Request, res: Response, next: NextFunction) {
        actionRepo
            .list()
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

    private static retrieveEventAction(req: Request, res: Response, next: NextFunction) {
        if (req.eventAction) {
            Result.Success(req.eventAction).asResponse(res);
            next();
            return;
        }

        Result.Failure(`event action not found`, 404).asResponse(res);
        next();
    }

    private static deleteEventAction(req: Request, res: Response, next: NextFunction) {
        if (req.eventAction) {
            actionRepo
                .delete(req.eventAction)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next());
        } else {
            Result.Failure(`event action not found`, 404).asResponse(res);
            next();
        }
    }

    // event action status
    private static updateEventActionStatus(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;
        if (req.eventActionStatus) {
            const payload = plainToClass(EventActionStatus, req.body as object);
            payload.id = req.eventActionStatus.id;

            statusRepo
                .save(payload, user)
                .then((updated: Result<boolean>) => {
                    if (updated.isError) {
                        updated.asResponse(res);
                        return;
                    }
                    Result.Success(payload).asResponse(res);
                })
                .catch((updated: any) => res.status(500).send(updated));
        } else {
            Result.Failure(`event action status not found`, 404).asResponse(res);
            next();
        }
    }

    private static listEventActionStatuses(req: Request, res: Response, next: NextFunction) {
        let repo = new EventActionStatusRepository();
        if (typeof req.query.eventID !== 'undefined' && (req.query.eventID as string) !== '') {
            repo = repo.where().eventID('eq', req.query.eventID)
        }
        repo
            .list()
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

    private static retrieveEventActionStatus(req: Request, res: Response, next: NextFunction) {
        if (req.eventActionStatus) {
            Result.Success(req.eventActionStatus).asResponse(res);
            next();
            return;
        }

        Result.Failure(`event action status not found`, 404).asResponse(res);
        next();
    }
}
