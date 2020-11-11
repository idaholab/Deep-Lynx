import {Request, Response, NextFunction, Application} from "express"
import {UserT} from "../types/user_management/userT";
import OAuthApplicationStorage from "../data_storage/user_management/oauth_application_storage";
import {LocalAuthMiddleware} from "../user_management/authentication/local";
import {OAuth} from "../services/oauth/oauth";

const csurf = require('csurf')
const buildUrl = require('build-url')

export default class OAuthRoutes {
    public static mount(app: Application) {
        // OAuth application management
        app.post("/oauth/applications", csurf(), LocalAuthMiddleware, this.createOAuthApplication)
        app.get("/oauth/applications", csurf(), LocalAuthMiddleware, this.listOAuthApplications)
        app.put("/oauth/applications/:applicationID", csurf(), LocalAuthMiddleware, this.updateOAuthApplication )
        app.delete("/oauth/applications/:applicationID", csurf(), LocalAuthMiddleware, this.deleteOAuthApplication)

        // login, register and authorize
        app.get("/oauth/login", csurf(), this.loginPage)
        app.post("/oauth/login", csurf(),  LocalAuthMiddleware, this.login)

        app.get("/oauth/register", csurf(), this.registerPage)

        app.get("/oauth/authorize", csurf(), LocalAuthMiddleware, this.authorizePage)
        app.post("/oauth/authorize", csurf(), LocalAuthMiddleware, this.authorize)

        // profile management
        app.get("/oauth/profile",csurf(), LocalAuthMiddleware, this.profile)
    }

    private static profile(req: Request, res: Response, next: NextFunction) {
        // @ts-ignore
        return res.render('profile', {_csrfToken: req.csrfToken()})
    }

    private static authorizePage(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT
        const oauth = new OAuth()
        const request = oauth.FromRequest(req)

        if(!request) {
            res.render('authorize', {_error: "Missing authorization request parameters"})
            return
        }

        oauth.MakeAuthorizationRequest(user.id!, request)
            .then(token => {
                // fetch the oauth application details
                OAuthApplicationStorage.Instance.Retrieve(request!.client_id)
                    .then((application) => {
                        if(application.isError) {
                            res.render('authorize', {_error: "Unable to retrieve OAuth client"})
                            return
                        }

                        // verify that the application has been approved or not
                        OAuthApplicationStorage.Instance.ApplicationIsApproved(application.value.id!, user.id!)
                            .then(result => {
                                if(result.isError || !result.value) {
                                    res.render('authorize', {
                                        // @ts-ignore
                                        _csrfToken: req.csrfToken(),
                                        token,
                                        application_id: application.value.id,
                                    })

                                    return;
                                }

                                res.redirect(request.redirect_uri + `?token=${token}`)
                                return

                            })
                        return
                    })
            })
    }


    private static authorize(req: Request, res: Response, next: NextFunction) {
        const oauth = new OAuth()
        const user = req.user as UserT

        OAuthApplicationStorage.Instance.MarkApplicationApproved(req.body.application_id, user.id!)
            .then((result) => {
                if(result.isError && !result.value) {
                    res.render('authorize', {_error:"Unable to authorize OAuth application"})
                    return
                }

                // fetch the request so that we can do the redirect
                const oauthRequest = oauth.FromToken(req.body.token)
                if(!oauthRequest) {
                    res.render('authorize', {_error:"Invalid token"})
                    return
                }

                res.redirect(oauthRequest.redirect_uri + `?token=${req.body.token}`)

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

    private static createOAuthApplication(req: Request, res: Response) {
        const user = req.user as UserT
        OAuthApplicationStorage.Instance.Create(user.id!, req.body)
            .then((result) => {
                if (result.isError && result.error) {
                    res.redirect(buildUrl('/oauth/applications', {queryParams: {error: "Unable to successfully create OAuth application"}}))
                    return
                }

                delete result.value.client_secret;

                res.redirect(buildUrl('/oauth/applications', {queryParams:
                        {
                            success: "Successfully created OAuth application",
                            application_id: result.value.id,
                            application_secret: result.value.client_secret_raw
                        }
                }))
            })
            .catch((err) => res.redirect(buildUrl('/oauth/applications', {queryParams: {error: err}})))
    }

    private static listOAuthApplications(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT
        OAuthApplicationStorage.Instance.ListForUser(user.id!)
            .then((result) => {
                if (result.isError && result.error) {
                    res.render('oauth_applications', {_error: result.error.errorCode});
                    return
                }

                // we don't want to return the hashed secret as part of this endpoint
                result.value = result.value.map(application => {
                    delete application.client_secret
                    return application
                })

                res.render('oauth_applications', {
                    // @ts-ignore
                    _csrfToken: req.csrfToken(),
                    // some parameters come from the create routes successful redirect
                    application_id: req.query.application_id,
                    application_secret: req.query.application_secret,
                    applications: result.value,
                    _error: req.query.error,
                    _success: req.query.success})
            })
            .catch((err) => res.render('oauth_applications', {_error: err}))
    }

    private static updateOAuthApplication(req: Request, res: Response) {
        const user = req.user as UserT

        OAuthApplicationStorage.Instance.Retrieve(req.params.applicationID)
            .then((application) => {
                if(application.isError && application.error) {
                    res.redirect(buildUrl('/oauth/applications', {queryParams: {_error: application.error}}))
                    return
                }

                if(application.value.owner_id !== user.id) {
                    res.redirect(buildUrl('/oauth/applications', {queryParams: {_error: "Unauthorized"}}))
                    return
                }

                OAuthApplicationStorage.Instance.Update(req.params.applicationID, user.id!, req.body)
                    .then((result) => {
                        if (application.isError && application.error) {
                            res.redirect(buildUrl('/oauth/applications', {queryParams: {error: "Unable to update OAuth application"}}))
                            return
                        }

                        res.redirect(buildUrl('/oauth/applications', {queryParams: {success: "Successfully updated OAuth application"}}))
                        return
                    })
                    .catch((err) => res.redirect(buildUrl('/oauth/applications', {queryParams: {error: err}})))

            })
            .catch((err) => res.redirect(buildUrl('/oauth/applications', {queryParams: {error: err}})))
    }

    private static deleteOAuthApplication(req: Request, res: Response) {
        const user = req.user as UserT

        OAuthApplicationStorage.Instance.Retrieve(req.params.applicationID)
            .then((application) => {
                if(application.isError && application.error) {
                    res.redirect(buildUrl('/oauth/applications', {queryParams: {error: application.error}}))
                    return
                }

                if(application.value.owner_id !== user.id) {
                    res.redirect(buildUrl('/oauth/applications', {queryParams: {error: "Unauthorized"}}))
                    return
                }

                OAuthApplicationStorage.Instance.PermanentlyDelete(req.params.applicationID)
                    .then((result) => {
                        if (application.isError && application.error) {
                            res.redirect(buildUrl('/oauth/applications', {queryParams: {error: "Unable to delete OAuth application"}}))
                            return
                        }

                        res.redirect(buildUrl('/oauth/applications', {queryParams: {success: "Successfully deleted OAuth application"}}))
                        return
                    })
                    .catch((err) => res.redirect(buildUrl('/oauth/applications', {queryParams: {error: err}})))

            })
            .catch((err) => res.redirect(buildUrl('/oauth/applications', {queryParams: {error: err}})))
    }
}
