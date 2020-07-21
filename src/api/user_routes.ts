import {Request, Response, NextFunction, Application} from "express"
import {
    AssignUserRole,
    CreateNewUser,
    RetrieveUser,
    RetrieveUserRoles
} from "../user_management/users";
import {authInContainer, authRequest} from "./middleware";
import UserStorage from "../data_storage/user_management/user_storage";
import {UserT} from "../types/user_management/userT";

// These routes pertain to User management. Currently user creation is reserved
// for SAML authentication routes. You cannot manually create a user as of June 2020.
export default class UserRoutes {
    public static mount(app: Application, middleware: any[]) {
        // TODO: endpoint for user creation that immediately assigns the user to a container
        app.post("/users", ...middleware,authRequest("write", "users"), this.createNewUser)
        app.get("/users",...middleware,authRequest("read", "users"), this.listUsers);

        // this endpoint will return all users of the application, not users who have permissions in the container
        // we use the container to make sure the requester has permissions to view all users, but this could be
        // be a little confusing
        // TODO: modify these endpoint to retrieve only users that have been assigned that container
        app.get("/containers/:id/users",...middleware,authInContainer("read", "users"), this.listUsers);
        app.get("/containers/:id/users/:id", ...middleware,authInContainer("read", "users"), this.retrieveUser);

        app.get("/containers/:id/users/:userID", ...middleware,authInContainer("read", "users"), this.retrieveUser);
        app.post("/containers/:id/users/roles", ...middleware, authInContainer("write", "users"), this.assignRole);
        app.get("/containers/:id/users/:userID/roles", ...middleware, authInContainer("read", "users"), this.listUserRoles)

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

    private static createNewUser(req: Request, res: Response, next: NextFunction) {
        CreateNewUser(req.user as UserT, req.body)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                delete result.value.password;

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
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
        storage.List(+req.query.offset, +req.query.limit)
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
}
