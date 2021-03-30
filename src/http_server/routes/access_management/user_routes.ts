import {Application, NextFunction, Request, Response} from "express"
import {authInContainer, authRequest} from "../../middleware";
import ContainerUserInviteMapper
    from "../../../data_access_layer/mappers/access_management/container_user_invite_mapper";
import UserRepository from "../../../data_access_layer/repositories/access_management/user_repository";
import Result from "../../../common_classes/result";
import {plainToClass} from "class-transformer";
import {AssignUserRolePayload, ContainerUserInvite, User} from "../../../access_management/user";
import {QueryOptions} from "../../../data_access_layer/repositories/repository";

const userRepo = new UserRepository()

/*
 These routes pertain to User management. Currently user creation is reserved
 for SAML authentication routes. You cannot manually create a user as of June 2020.
*/
export default class UserRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.get("/users",...middleware,authRequest("read", "users"), this.listUsers);
        app.delete("/users/:userID", middleware, authRequest("write", "users"), this.deleteUser)
        app.put("/users/:userID", ...middleware,authRequest("write", "users"), this.updateUser)

        app.get("/users/invite", ...middleware, this.acceptContainerInvite)
        app.get("/users/invites", ...middleware, this.listOutstandingInvites)

        // this endpoint will return all users of the application, not users who have permissions in the container
        // we use the container to make sure the requester has permissions to view all users, but this could be
        // be a little confusing
        app.get("/containers/:containerID/users",...middleware,authInContainer("read", "users"), this.listUsersForContainer);
        app.get("/containers/:containerID/users/:userID", ...middleware,authInContainer("read", "users"), this.retrieveUser);

        app.get("/containers/:containerID/users/:userID", ...middleware,authInContainer("read", "users"), this.retrieveUser);
        app.post("/containers/:containerID/users/roles", ...middleware, authInContainer("write", "users"), this.assignRole);
        app.get("/containers/:containerID/users/:userID/roles", ...middleware, authInContainer("read", "users"), this.listUserRoles)

        app.post("/containers/:containerID/users/invite", ...middleware, authInContainer("write", "users"), this.inviteUserToContainer)
        app.get("/containers/:containerID/users/invite", ...middleware, authInContainer("write", "users"), this.listInvitedUsers)
    }

    private static retrieveUser(req: Request, res: Response, next: NextFunction) {
        if(req.routeUser){
            Result.Success(req.routeUser).asResponse(res)
            next()
            return
        }

        Result.Failure('user not found', 404).asResponse(res)
        next()
    }

    private static acceptContainerInvite(req: Request, res: Response, next: NextFunction) {
        // @ts-ignore
        userRepo.acceptContainerInvite(req.currentUser! , req.query.token)
            .then((result) => {
                result.asResponse(res)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static listInvitedUsers(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!
        ContainerUserInviteMapper.Instance.InvitesByUser(req.params.id, user.id!)
            .then((result) => {
                result.asResponse(res)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static listOutstandingInvites(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!
        ContainerUserInviteMapper.Instance.InvitesForEmail(user.email)
            .then((result) => {
                result.asResponse(res)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static deleteUser(req: Request, res: Response, next: NextFunction) {
        if(req.routeUser) {
            userRepo.delete(req.currentUser!)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        } else {
            Result.Failure('user not found', 404).asResponse(res)
            next()
        }
    }

    private static updateUser(req: Request, res: Response, next: NextFunction) {
        if(req.currentUser && req.routeUser) {
            const payload = plainToClass(User, req.body as object)
            payload.id = req.routeUser.id!

            userRepo.save(payload, req.currentUser!)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        } else {
            Result.Failure('user not found', 404).asResponse(res)
            next()
        }
    }

    private static assignRole(req: Request, res: Response, next: NextFunction) {
        userRepo.assignRole(req.currentUser!, plainToClass(AssignUserRolePayload, req.body as object))
            .then((result) => {
                result.asResponse(res)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static listUserRoles(req: Request, res: Response, next: NextFunction) {
        if(req.routeUser && req.container) {
            userRepo.rolesInContainer(req.routeUser, req.container.id!)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        } else {
            Result.Failure('user not found', 404).asResponse(res)
            next()
        }
    }

    private static async listUsers(req: Request, res: Response, next: NextFunction) {
        const repository = new UserRepository()

        if (req.query.count !== undefined) {
            if (req.query.count === "true") {
                repository.count()
                    .then((result) => {
                        result.asResponse(res)
                    })
                    .catch((err) => {
                        res.status(404).send(err)
                    })
                    .finally(() => next())
            }
        } else {
            // @ts-ignore
            repository.list(req.query.loadKeys === undefined || req.query.loadKeys === "true",
                {
                    limit: (req.query.limit) ? +req.query.limit : undefined,
                    offset: (req.query.offset) ? +req.query.offset : undefined,
                    sortBy: req.query.sortBy,
                    sortDesc: (req.query.sortDesc) ? req.query.sortDesc === "true" : undefined
                } as QueryOptions)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => {
                    res.status(404).send(err)
                })
                .finally(() => next())
        }
    }

    private static async listUsersForContainer(req: Request, res: Response, next: NextFunction) {
        if(req.container){
            userRepo.usersForContainer(req.container.id!)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next())
        } else {
            Result.Failure('container not found', 404).asResponse(res)
            next()
        }
    }

    private static inviteUserToContainer(req: Request, res: Response, next: NextFunction) {
        if(req.currentUser && req.container) {
            const payload = plainToClass(ContainerUserInvite, req.body as object)
            payload.container = req.container

            userRepo.inviteUserToContainer(req.currentUser, payload)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch(() => res.status(500).send('unable to invite user to container')) // overwrite the error message because we don't need to broadcast issues with our email service
                .finally(() => next())
        } else {
            Result.Failure('container or current user not found', 404).asResponse(res)
            next()
        }
    }
}
