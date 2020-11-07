import {Request, Response, NextFunction, Application} from "express"
import {authenticateRoute, authInContainer, authRequest, authUser} from "./middleware";
import {UserT} from "../types/user_management/userT";
import OAuthApplicationStorage from "../data_storage/user_management/oauth_application_storage";

// These routes pertain to User management. Currently user creation is reserved
// for SAML authentication routes. You cannot manually create a user as of June 2020.
export default class OAuthRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post("/oauth/applications", authenticateRoute(), this.createOAuthApplication)
        app.get("/oauth/applications", authenticateRoute(), this.listOAuthApplications)
        app.put("/oauth/applications/:applicationID", authenticateRoute(), this.updateOAuthApplication )
        app.delete("/oauth/applications/:applicationID", authenticateRoute(), this.deleteOAuthApplication)
    }

    private static createOAuthApplication(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT
        OAuthApplicationStorage.Instance.Create(user.id!, req.body)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                delete result.value.client_secret;

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static listOAuthApplications(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT
        OAuthApplicationStorage.Instance.ListForUser(user.id!)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                // we don't want to return the hashed secret as part of this endpoint
                result.value = result.value.map(application => {
                    delete application.client_secret
                    return application
                })

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static updateOAuthApplication(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT

        OAuthApplicationStorage.Instance.Retrieve(req.params.applicationID)
            .then((application) => {
                if(application.isError && application.error) {
                    res.status(application.error.errorCode).json(application)
                    return
                }

                if(application.value.owner_id !== user.id) {
                    res.sendStatus(401)
                    return
                }

                OAuthApplicationStorage.Instance.Update(req.params.applicationID, user.id!, req.body)
                    .then((result) => {
                        if (application.isError && application.error) {
                            res.status(application.error.errorCode).json(application)
                            return
                        }

                        res.sendStatus(200)
                        return
                    })
                    .catch((err) => res.status(500).send(err))
                    .finally(() => next())

            })
            .catch((err) => res.status(500).send(err))
    }

    private static deleteOAuthApplication(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT

        OAuthApplicationStorage.Instance.Retrieve(req.params.applicationID)
            .then((application) => {
                if(application.isError && application.error) {
                    res.status(application.error.errorCode).json(application)
                    return
                }

                if(application.value.owner_id !== user.id) {
                    res.sendStatus(401)
                    return
                }

                OAuthApplicationStorage.Instance.PermanentlyDelete(req.params.applicationID)
                    .then((result) => {
                        if (application.isError && application.error) {
                            res.status(application.error.errorCode).json(application)
                            return
                        }

                        res.sendStatus(200)
                        return
                    })
                    .catch((err) => res.status(500).send(err))
                    .finally(() => next())

            })
            .catch((err) => res.status(500).send(err))
    }
}
