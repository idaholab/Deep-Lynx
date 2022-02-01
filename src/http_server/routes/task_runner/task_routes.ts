import {plainToClass} from 'class-transformer';
import {Application, NextFunction, Request, Response} from 'express';
import Result from '../../../common_classes/result';
import {authInContainer} from '../../middleware';
import Config from '../../../services/config';
import {User} from '../../../domain_objects/access_management/user';
import TaskRecord, {HpcTaskConfig} from '../../../domain_objects/task_runner/task';
import TaskRepository from '../../../data_access_layer/repositories/task_runner/task_repository';
import {QueryOptions} from '../../../data_access_layer/repositories/repository';

const taskRepo = new TaskRepository();

export default class TaskRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/containers/:containerID/task', ...middleware, authInContainer('write', 'data'), this.createTask);

        app.get('/containers/:containerID/task', ...middleware, authInContainer('read', 'data'), this.listTasks);

        app.put('/containers/:containerID/task/:taskID', ...middleware, authInContainer('write', 'data'), this.updateTask);

        app.get('/containers/:containerID/task/:taskID', ...middleware, authInContainer('read', 'data'), this.getTask);
    }

    private static createTask(req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            const currentUser = req.currentUser!;
            if (!instance.verifyUser(currentUser)) {
                res.status(401).send('Unauthorized');
                next();
            }

            const payload = plainToClass(TaskRecord, req.body as object);
            payload.container_id = req.container.id!;

            // Create config if not present for HPC use case
            if (!payload.config) payload.config = new HpcTaskConfig({user: currentUser});

            taskRepo
                .save(payload, currentUser)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    Result.Success(payload).asResponse(res);
                })
                .catch((err) => {
                    res.status(500).send(err);
                })
                .finally(() => next());
        } else {
            Result.Failure(`unable to find container`).asResponse(res);
            next();
        }
    }

    private static updateTask(req: Request, res: Response, next: NextFunction) {
        if (req.container && req.task) {
            const currentUser = req.currentUser!;

            const payload = plainToClass(TaskRecord, req.body as object);
            payload.container_id = req.container.id!;
            payload.id = req.params.taskID;

            // Use existing config if none provided
            if (!payload.config) payload.config = req.task.config;

            taskRepo
                .save(payload, currentUser)
                .then((result) => {
                    if (result.isError) {
                        result.asResponse(res);
                        return;
                    }

                    Result.Success(payload).asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next());
        } else {
            Result.Failure(`unable to find container or task `).asResponse(res);
            next();
        }
    }

    private static getTask(req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            taskRepo
                .findByID(req.params.taskID)
                .then((result) => {
                    if (result.isError) {
                        Result.Failure(`unable to find task`, 404).asResponse(res);
                        return;
                    }

                    result.asResponse(res);
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next());
        } else {
            Result.Failure(`unable to find task`, 404).asResponse(res);
            next();
        }
    }

    // retrieves all tasks for the container with a ready status
    private static listTasks(req: Request, res: Response, next: NextFunction) {
        const repository = new TaskRepository();
        repository
            .where()
            .containerID('eq', req.container!.id!)
            .and()
            .status('eq', 'ready')
            .list({
                limit: req.query.limit ? +req.query.limit : undefined,
                offset: req.query.offset ? +req.query.offset : undefined,
                sortBy: req.query.sortBy,
                sortDesc: req.query.sortDesc ? String(req.query.sortDesc).toLowerCase() === 'true' : undefined,
            } as QueryOptions)
            .then((result) => {
                if (result.isError) {
                    result.asResponse(res);
                    return;
                }

                Result.Success(result.value).asResponse(res);
            })
            .catch((err) => {
                res.status(404).send(err);
            })
            .finally(() => next());
    }

    private verifyUser(user: User): boolean {
        if (user.email === Config.hpc_email) {
            return true;
        } else {
            return false;
        }
    }
}

const instance: TaskRoutes = new TaskRoutes();
