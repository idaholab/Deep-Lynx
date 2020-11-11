import {Request, Response, NextFunction, Application} from "express"
import {authenticateRoute} from "./middleware";
import {UserT} from "../types/user_management/userT";
import OAuthApplicationStorage from "../data_storage/user_management/oauth_application_storage";
import {LocalAuthMiddleware} from "../user_management/authentication/local";
import {OAuth} from "../services/oauth/oauth";
import passport from "passport";

const csurf = require('csurf')
const buildUrl = require('build-url')

// These routes pertain to User management. Currently user creation is reserved
// for SAML authentication routes. You cannot manually create a user as of June 2020.
export default class OAuthRoutes {
    public static mount(app: Application) {
        app.post("/oauth/applications", authenticateRoute(), this.createOAuthApplication)
        app.get("/oauth/applications", authenticateRoute(), this.listOAuthApplications)
        app.put("/oauth/applications/:applicationID", authenticateRoute(), this.updateOAuthApplication )
        app.delete("/oauth/applications/:applicationID", authenticateRoute(), this.deleteOAuthApplication)

        app.get("/oauth/login", csurf(), this.loginPage)
        app.post("/oauth/login", csurf(),  LocalAuthMiddleware, this.login)

        app.get("/oauth/register", csurf(), this.registerPage)

        app.get("/oauth/authorize", csurf(), LocalAuthMiddleware, this.authorize)

        app.get("/oauth/profile",csurf(), LocalAuthMiddleware, this.profile)
    }

    private static profile(req: Request, res: Response, next: NextFunction) {
        // @ts-ignore
        return res.render('profile', {_csrfToken: req.csrfToken()})
    }

    private static authorize(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT
        const oauth = new OAuth()
        const request = oauth.FromRequest(req)

        if(!request) {
            res.render('authorize', {_error: "Missing authorization request parameters"})
            return
        }

        const token = oauth.MakeAuthorizationRequest(user.id!, request)

        // fetch the oauth application details
        OAuthApplicationStorage.Instance.Retrieve(request!.client_id)
            .then((application) => {
                if(application.isError) {
                    res.render('authorize', {_error: "Unable to retrieve OAuth client"})
                    return
                }

                res.render('authorize', {
                    // @ts-ignore
                    _csrfToken: req.csrfToken(),
                    token,
                    application: application.value,
                })

                return
            })
    }

    private static registerPage(req: Request, res: Response, next: NextFunction) {
        const oauth = new OAuth()

        return res.render('register', {
            // @ts-ignore
            _csrfToken: req.csrfToken(),
            oauthRequest: oauth.FromRequest(req)
        })
    }

    private static loginPage(req: Request, res: Response, next: NextFunction) {
        const oauth = new OAuth()

        return res.render('login', {
            // @ts-ignore
            _csrfToken: req.csrfToken(),
            oauthRequest: oauth.FromRequest(req),
            registerLink: buildUrl('/oauth/register', {queryParams: req.query})
        })
    }

    private static login(req: Request, res: Response, next: NextFunction) {
        const oauth = new OAuth()
        const request = oauth.FromRequest(req)

        // if they've logged in following an auth request redirect to the authorize page vs. the profile page
        if(request) {
            res.redirect(buildUrl('/oauth/authorize', {queryParams: request}))
            return
        }

        return res.redirect('/oauth/profile')
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
