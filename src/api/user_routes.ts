import {Request, Response, NextFunction, Application} from "express"
import {
    AcceptContainerInvite,
    AssignUserRole,
    CreateNewUser, InitiateResetPassword, InviteUserToContainer, ResetPassword,
    RetrieveUser,
    RetrieveUserRoles
} from "../user_management/users";
import {authInContainer, authRequest, authUser} from "./middleware";
import UserStorage from "../data_access_layer/mappers/user_management/user_storage";
import {UserT} from "../types/user_management/userT";
import KeyPairStorage from "../data_access_layer/mappers/user_management/keypair_storage";
import {UsersForContainer} from "../api_handlers/user";
import UserContainerInviteStorage from "../data_access_layer/mappers/user_management/user_container_invite_storage";

// These routes pertain to User management. Currently user creation is reserved
// for SAML authentication routes. You cannot manually create a user as of June 2020.
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
        app.get("/containers/:id/users",...middleware,authInContainer("read", "users"), this.listUsersForContainer);
        app.get("/containers/:id/users/:userID", ...middleware,authInContainer("read", "users"), this.retrieveUser);

        app.get("/containers/:id/users/:userID", ...middleware,authInContainer("read", "users"), this.retrieveUser);
        app.post("/containers/:id/users/roles", ...middleware, authInContainer("write", "users"), this.assignRole);
        app.get("/containers/:id/users/:userID/roles", ...middleware, authInContainer("read", "users"), this.listUserRoles)

        app.post("/containers/:id/users/invite", ...middleware, authInContainer("write", "users"), this.inviteUserToContainer)
        app.get("/containers/:id/users/invite", ...middleware, authInContainer("write", "users"), this.listInvitedUsers)
    }

    private static retrieveUser(req: Request, res: Response, next: NextFunction) {
        RetrieveUser(req.user, req.params.userID)
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

    private static acceptContainerInvite(req: Request, res: Response, next: NextFunction) {
        // @ts-ignore
        AcceptContainerInvite(req.user as UserT, req.query.token)
            .then((result) => {
                if (!result) {
                    res.sendStatus(500)
                    return
                }

                res.sendStatus(200)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static listInvitedUsers(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT
        UserContainerInviteStorage.Instance.InvitesByUser(req.params.id, user.id!)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(200).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static listOutstandingInvites(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT
        UserContainerInviteStorage.Instance.InvitesForEmail(user.email)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(200).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static keysForUser(req: Request, res: Response, next: NextFunction) {
        KeyPairStorage.Instance.KeysForUser(req.params.id)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(200).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static deleteUser(req: Request, res: Response, next: NextFunction) {
        UserStorage.Instance.PermanentlyDelete(req.params.userID)
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

    private static updateUser(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;
        UserStorage.Instance.Update(req.params.userID, user.id!, req.body)
            .then((updated) => {
                if (updated.isError && updated.error) {
                    res.status(updated.error.errorCode).json(updated);
                    return
                }
                res.status(200).json(updated)
            })
            .catch((updated) => res.status(500).send(updated))
    }

    private static assignRole(req: Request, res: Response, next: NextFunction) {
        AssignUserRole(req.user, req.body)
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

    private static listUserRoles(req: Request, res: Response, next: NextFunction) {
        RetrieveUserRoles(req.params.userID, req.params.id)
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

    private static async listUsers(req: Request, res: Response, next: NextFunction) {
        const storage = UserStorage.Instance;
        storage.List()
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                result.value.map(u => delete u.password)

                res.status(200).json(result)
            })
            .catch((err) => res.status(404).send(err))
            .finally(() => next())
    }

    private static async listUsersForContainer(req: Request, res: Response, next: NextFunction) {
        UsersForContainer(req.user as UserT, req.params.id)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                result.value.map(u => delete u.password)

                res.status(200).json(result)
            })
            .catch((err) => res.status(404).send(err))
            .finally(() => next())
    }

    private static inviteUserToContainer(req: Request, res: Response, next: NextFunction) {
        // @ts-ignore
        InviteUserToContainer(req.user as UserT, req.params.id, req.body)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.sendStatus(200)
            })
            .catch(() => res.status(500).send('unable to invite user to container')) // overwrite the error message because we don't need to broadcast issues with our email service
            .finally(() => next())
    }

}
