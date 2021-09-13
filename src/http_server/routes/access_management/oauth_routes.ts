/* eslint-disable @typescript-eslint/ban-ts-comment,@typescript-eslint/no-floating-promises */
import {Application, NextFunction, Request, Response} from 'express';
import OAuthMapper from '../../../data_access_layer/mappers/access_management/oauth_mapper';
import {LocalAuthMiddleware} from '../../authentication/local';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import KeyPairMapper from '../../../data_access_layer/mappers/access_management/keypair_mapper';
import Config from '../../../services/config';
import Cache from '../../../services/cache/cache';

import passport from 'passport';
import jwt from 'jsonwebtoken';
import uuid from 'uuid';
import UserRepository from '../../../data_access_layer/repositories/access_management/user_repository';
import {KeyPair, ResetUserPasswordPayload, User} from '../../../domain_objects/access_management/user';
import {classToPlain, plainToClass, serialize} from 'class-transformer';
import KeyPairRepository from '../../../data_access_layer/repositories/access_management/keypair_repository';
import OAuthRepository from '../../../data_access_layer/repositories/access_management/oauth_repository';
import {OAuthApplication, OAuthTokenExchangeRequest} from '../../../domain_objects/access_management/oauth/oauth';

const csurf = require('csurf');
const buildUrl = require('build-url');

const userRepo = new UserRepository();
const keyRepo = new KeyPairRepository();
const oauthRepo = new OAuthRepository();

/*
    OAuthRoutes contain all routes pertaining to oauth application management and
    the OAuth2 compliant identity provider system of Deep Lynx's http server. These
    are the only routes in the application which serve actual web pages.
 */
export default class OAuthRoutes {
    public static mount(app: Application, middleware: any[]) {
        // OAuth application management
        app.get('/oauth/applications/create', csurf(), ...middleware, LocalAuthMiddleware, this.createOAuthApplicationPage);
        app.post('/oauth/applications', csurf(), ...middleware, LocalAuthMiddleware, this.createOAuthApplication);
        app.get('/oauth/applications', csurf(), ...middleware, LocalAuthMiddleware, this.listOAuthApplications);
        app.get('/oauth/applications/:oauthAppID', ...middleware, csurf(), LocalAuthMiddleware, this.oauthApplicationPage);
        app.put('/oauth/applications/:oauthAppID', ...middleware, csurf(), LocalAuthMiddleware, this.updateOAuthApplication);
        app.delete('/oauth/applications/:oauthAppID', ...middleware, csurf(), LocalAuthMiddleware, this.deleteOAuthApplication);

        // login, register and authorize
        app.get('/', csurf(), this.loginPage);
        app.get('/logout', this.logout);
        app.post('/', csurf(), LocalAuthMiddleware, this.login);

        // saml specific
        app.get('/login-saml', this.loginSaml);
        app.post('/oauth/saml', this.saml);

        app.get('/oauth/register', csurf(), this.registerPage);
        app.post('/oauth/register', csurf(), this.createNewUser);

        app.get('/oauth/authorize', csurf(), LocalAuthMiddleware, this.authorizePage);
        app.post('/oauth/authorize', csurf(), LocalAuthMiddleware, this.authorize);
        app.post('/oauth/exchange', this.tokenExchange);
        app.get('/oauth/token', this.getToken);

        // profile management and email validation/reset password
        app.get('/oauth/profile', csurf(), LocalAuthMiddleware, this.profile);
        app.post('/oauth/profile/keys', csurf(), LocalAuthMiddleware, this.generateKeyPair);
        app.delete('/oauth/profile/keys/:keyID', csurf(), LocalAuthMiddleware, this.deleteKeyPair);

        app.get('/validate-email', this.validateEmail);

        app.get('/reset-password', csurf(), this.resetPasswordPage);
        app.post('/reset-password', csurf(), this.initiatePasswordReset);
        app.post('/reset-password/reset', csurf(), this.resetPassword);
    }

    private static profile(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;
        // profile must include a user's keys
        KeyPairMapper.Instance.KeysForUser(user.id!)
            .then((result) => {
                if (result.isError && result.error) {
                    res.render('profile', {
                        _error: "Unable to fetch user's API keys",
                    });
                    return;
                }

                // @ts-ignore
                res.render('profile', {
                    // @ts-ignore
                    _csrfToken: req.csrfToken(),
                    user: req.currentUser!,
                    apiKeys: result.value,
                    _success: req.query.success,
                    _error: req.query.error,
                    api_key: req.query.newKey,
                    api_secret: req.query.newSecret,
                });
                return;
            })
            .catch((err) => res.render('profile', {_error: err}));
    }

    private static createOAuthApplicationPage(req: Request, res: Response) {
        res.render('oauth_application_create', {
            _error: req.query.error,
            // @ts-ignore
            _csrfToken: req.csrfToken(),
        });
        return;
    }

    private static oauthApplicationPage(req: Request, res: Response) {
        if (req.oauthApp) {
            res.render('oauth_application_single', {
                // @ts-ignore
                _csrfToken: req.csrfToken(),
                application: classToPlain(req.oauthApp),
            });
        } else {
            res.redirect(
                buildUrl('/oauth/applications', {
                    queryParams: {error: `uanble to find oauth application`},
                }),
            );
            return;
        }
    }

    private static generateKeyPair(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;
        const keyPair = new KeyPair(user.id);

        keyRepo
            .save(keyPair, user)
            .then((result) => {
                if (result.isError && result.error) {
                    res.redirect(
                        buildUrl('/oauth/profile', {
                            queryParams: {
                                error: 'Unable to generate key pair',
                            },
                        }),
                    );
                    return;
                }

                // @ts-ignore due to strictNullCheck being on
                delete result.value.secret; // we don't want to show the hashed value on return

                res.redirect(
                    buildUrl('/oauth/profile', {
                        queryParams: {
                            success: 'Successfully generated key pair',
                            newKey: keyPair.key,
                            newSecret: keyPair.secret_raw,
                        },
                    }),
                );
                return;
            })
            .catch((err) => res.redirect(buildUrl('/oauth/profile', {queryParams: {error: err}})));
    }

    private static deleteKeyPair(req: Request, res: Response, next: NextFunction) {
        KeyPairMapper.Instance.Delete(req.params.keyID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.redirect(
                        buildUrl('/oauth/profile', {
                            queryParams: {error: 'Unable to delete key pair'},
                        }),
                    );
                    return;
                }

                res.redirect(
                    buildUrl('/oauth/profile', {
                        queryParams: {
                            success: 'Deleted key pair successfully',
                        },
                    }),
                );
                return;
            })
            .catch((err) => res.redirect(buildUrl('/oauth/profile', {queryParams: {error: err}})));
    }

    private static authorizePage(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;
        const request = oauthRepo.authorizationFromRequest(req);

        if (!request) {
            res.redirect(
                buildUrl('/', {
                    queryParams: {
                        error: 'Missing authorization request parameters',
                    },
                }),
            );
            return;
        }

        oauthRepo.makeAuthorizationRequest(user.id!, request).then((token) => {
            // fetch the oauth application details
            OAuthMapper.Instance.RetrieveByClientID(request.client_id!).then((application) => {
                if (application.isError) {
                    res.redirect(
                        buildUrl('/', {
                            queryParams: {
                                error: 'Unable to retrieve OAuth application',
                            },
                        }),
                    );
                    return;
                }

                // verify that the application has been approved or not
                OAuthMapper.Instance.ApplicationIsApproved(application.value.id!, user.id!).then((result) => {
                    if (result.isError || !result.value) {
                        res.render('authorize', {
                            // @ts-ignore
                            _csrfToken: req.csrfToken(),
                            token: token.value,
                            application_id: application.value.id,
                            application_name: application.value.name,
                            user_email: user.email,
                        });

                        return;
                    }

                    res.redirect(
                        buildUrl(request.redirect_uri, {
                            queryParams: {
                                token: token.value,
                                state: request.state,
                            },
                        }),
                    );
                    return;
                });
            });
        });
    }

    private static authorize(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;
        OAuthMapper.Instance.MarkApplicationApproved(req.body.application_id, user.id!).then((result) => {
            if (result.isError && !result.value) {
                res.render('authorize', {
                    _error: 'Unable to authorize OAuth application',
                });
                return;
            }

            // fetch the request so that we can do the redirect
            oauthRepo.authorizationFromToken(req.body.token).then((oauthRequest) => {
                if (!oauthRequest) {
                    res.render('authorize', {_error: 'Invalid token'});
                    return;
                }

                res.redirect(
                    buildUrl(oauthRequest.redirect_uri, {
                        queryParams: {
                            token: req.body.token,
                            state: oauthRequest.state,
                        },
                    }),
                );
            });
        });
    }

    private static registerPage(req: Request, res: Response, next: NextFunction) {
        return res.render('register', {
            // @ts-ignore
            _csrfToken: req.csrfToken(),
            oauthRequest: serialize(oauthRepo.authorizationFromRequest(req)),
            _success: req.query.success,
            _error: req.query.error,
        });
    }

    private static createNewUser(req: Request, res: Response) {
        const oauthRequest = oauthRepo.authorizationFromRequest(req);

        userRepo
            .save(plainToClass(User, req.body as object), req.currentUser!)
            .then((result) => {
                if (result.isError && result.error) {
                    res.redirect(
                        buildUrl('/oauth/register', {
                            queryParams: {
                                error: 'Unable to create a new user',
                            },
                        }),
                    );
                    return;
                }

                if (oauthRequest) {
                    req.login(result.value, () => {
                        res.redirect(
                            buildUrl('/oauth/authorize', {
                                queryParams: oauthRequest,
                            }),
                        );
                    });
                    return;
                }

                req.login(result.value, () => {
                    res.redirect(
                        buildUrl('/oauth/profile', {
                            queryParams: {
                                success: 'Successfully created account',
                            },
                        }),
                    );
                });
                return;
            })
            .catch((err) => res.redirect(buildUrl('/oauth/register', {queryParams: {error: err}})));
    }

    private static loginPage(req: Request, res: Response, next: NextFunction) {
        req.logout(); // in case a previous user logged into a session
        const oauthRequest = oauthRepo.authorizationFromRequest(req);

        return res.render('login', {
            // @ts-ignore
            _csrfToken: req.csrfToken(),
            oauthRequest: classToPlain(oauthRequest),
            registerLink: buildUrl('/oauth/register', {
                queryParams: req.query,
            }),
            loginWithWindowsLink: buildUrl('/login-saml', {
                queryParams: req.query,
            }),
            _success: req.query.success,
            _error: req.query.error,
            saml_enabled: Config.saml_enabled,
        });
    }

    private static loginSaml(req: Request, res: Response) {
        const oauthRequest = oauthRepo.authorizationFromRequest(req);

        // if this login is part of an OAuth request flow, we must save it in cache
        // so that we can restore it as part of the redirect
        if (oauthRequest) {
            const token = Buffer.from(uuid.v4()).toString('base64');
            Cache.set(token, classToPlain(oauthRequest), 60 * 10);
            req.query.RelayState = token;
        }

        passport.authenticate('saml', {
            failureRedirect: '/unauthorized',
            failureFlash: true,
        })(req, res);
    }

    private static saml(req: Request, res: Response, next: NextFunction) {
        passport.authenticate('saml', (err, user, info) => {
            if (err) {
                res.redirect(buildUrl('/', {queryParams: {error: `${err}`}}));
                return;
            }

            if (!user) {
                return res.redirect('/');
            }

            req.logIn(user, () => {
                if (req.body.RelayState) {
                    const oauthRequest = Cache.get<object>(req.body.RelayState as string);
                    // TODO: correct this to be truly async
                    // eslint-disable-next-line @typescript-eslint/no-misused-promises
                    if (oauthRequest) {
                        res.redirect(
                            buildUrl('/oauth/authorize', {
                                queryParams: oauthRequest,
                            }),
                        );
                        return;
                    }
                }

                res.redirect('/oauth/profile');
                return;
            });
        })(req, res, next);
    }

    private static logout(req: Request, res: Response, next: NextFunction) {
        req.logout();

        if (req.query.redirect_uri) {
            return res.redirect(req.query.redirect_uri as string);
        }

        return res.redirect('/');
    }

    private static login(req: Request, res: Response, next: NextFunction) {
        const request = oauthRepo.authorizationFromRequest(req);

        // if they've logged in following an auth request redirect to the authorize page vs. the profile page
        if (request) {
            res.redirect(
                buildUrl('/oauth/authorize', {
                    queryParams: classToPlain(request),
                }),
            );
            return;
        }

        return res.redirect('/oauth/profile');
    }

    private static createOAuthApplication(req: Request, res: Response) {
        const user = req.currentUser!;
        const payload = plainToClass(OAuthApplication, req.body as object);
        payload.owner_id = user.id!;

        oauthRepo
            .save(payload, user)
            .then((result) => {
                if (result.isError && result.error) {
                    res.redirect(
                        buildUrl('/oauth/applications', {
                            queryParams: {
                                error: 'Unable to successfully create OAuth application',
                            },
                        }),
                    );
                    return;
                }

                res.redirect(
                    buildUrl('/oauth/applications', {
                        queryParams: {
                            success: 'Successfully created OAuth application',
                            application_name: payload.name,
                            application_id: payload.client_id,
                            application_secret: payload.client_secret_raw,
                        },
                    }),
                );
            })
            .catch((err) =>
                res.redirect(
                    buildUrl('/oauth/applications', {
                        queryParams: {error: err},
                    }),
                ),
            );
    }

    private static listOAuthApplications(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;
        oauthRepo
            .listForUser(user)
            .then((result) => {
                if (result.isError && result.error) {
                    res.render('oauth_applications', {
                        _error: result.error.errorCode,
                    });
                    return;
                }

                res.render('oauth_applications', {
                    // @ts-ignore
                    _csrfToken: req.csrfToken(),
                    // some parameters come from the create routes successful redirect
                    application_id: req.query.application_id,
                    application_secret: req.query.application_secret,
                    applications: classToPlain(result.value),
                    _error: req.query.error,
                    _success: req.query.success,
                });
            })
            .catch((err) => res.render('oauth_applications', {_error: err}));
    }

    private static updateOAuthApplication(req: Request, res: Response) {
        const user = req.currentUser!;

        if (req.oauthApp) {
            if (req.oauthApp.owner_id !== user.id) {
                res.redirect(
                    buildUrl('/oauth/applications', {
                        queryParams: {_error: 'Unauthorized'},
                    }),
                );
                return;
            }

            const payload = plainToClass(OAuthApplication, req.body as object);
            payload.id = req.oauthApp.id;

            oauthRepo
                .save(payload, user)
                .then((result) => {
                    if (result.isError && result.error) {
                        res.redirect(
                            buildUrl('/oauth/applications', {
                                queryParams: {
                                    error: 'Unable to update OAuth application',
                                },
                            }),
                        );
                        return;
                    }

                    res.redirect(
                        buildUrl('/oauth/applications', {
                            queryParams: {
                                success: 'Successfully updated OAuth application',
                            },
                        }),
                    );
                    return;
                })
                .catch((err) =>
                    res.redirect(
                        buildUrl('/oauth/applications', {
                            queryParams: {error: err},
                        }),
                    ),
                );
        } else {
            res.redirect(
                buildUrl('/oauth/applications', {
                    queryParams: {_error: 'application not found'},
                }),
            );
            return;
        }
    }

    private static deleteOAuthApplication(req: Request, res: Response) {
        if (req.oauthApp) {
            oauthRepo
                .delete(req.oauthApp)
                .then((result) => {
                    if (result.isError && result.error) {
                        res.redirect(
                            buildUrl('/oauth/applications', {
                                queryParams: {
                                    error: 'Unable to delete OAuth application',
                                },
                            }),
                        );
                        return;
                    }

                    res.redirect(
                        buildUrl('/oauth/applications', {
                            queryParams: {
                                success: 'Successfully deleted OAuth application',
                            },
                        }),
                    );
                    return;
                })
                .catch((err) =>
                    res.redirect(
                        buildUrl('/oauth/applications', {
                            queryParams: {error: err},
                        }),
                    ),
                );
        } else {
            res.redirect(
                buildUrl('/oauth/applications', {
                    queryParams: {error: 'oauth app not found'},
                }),
            );
        }
    }

    private static tokenExchange(req: Request, res: Response, next: NextFunction) {
        oauthRepo
            .authorizationCodeExchange(plainToClass(OAuthTokenExchangeRequest, req.body as object))
            .then((result) => {
                if (result.isError) {
                    res.status(result.error?.errorCode!).json(result.error);
                    return;
                }

                return res.status(200).json(result);
            })
            .catch((e) => res.status(500).json(e))
            .finally(() => next());
    }

    // this route will take an API KeyPair and return a JWT token encapsulating the user to which the supplied
    // KeyPair belongs
    private static getToken(req: Request, res: Response, next: NextFunction) {
        const key = req.header('x-api-key');
        const secret = req.header('x-api-secret');
        const expiry = req.header('x-api-expiry');

        if (key && secret) {
            keyRepo.validateKeyPair(key, secret).then((valid) => {
                if (!valid) {
                    res.status(401).send('unauthorized');
                    return;
                }

                KeyPairMapper.Instance.UserForKeyPair(key).then((user) => {
                    if (user.isError) {
                        // even though its an error with the user, we don't want
                        // to give that away, keep them thinking its an error
                        // with credentials
                        res.status(401);
                        return;
                    }

                    // fetch set of permissions per resource for the user before returning
                    userRepo.retrievePermissions(user.value).then((result) => {
                        if (result.isError) {
                            res.sendStatus(500);
                            return;
                        }

                        const token = jwt.sign(classToPlain(user.value), Config.encryption_key_secret, {expiresIn: expiry});
                        res.status(200).json(token);
                        return;
                    });
                });
            });
        } else {
            res.status(401).send('unauthorized');
            return;
        }
    }

    private static validateEmail(req: Request, res: Response, next: NextFunction) {
        // @ts-ignore
        UserMapper.Instance.ValidateEmail(req.query.id, req.query.token)
            .then((result) => {
                if (result.isError && result.error) {
                    res.render('email_validate', {_error: result.error});
                    return;
                }

                res.render('email_validate', {
                    _success: 'Successfully Validated Email',
                });
                return;
            })
            .catch((err) => res.render('email_validate', {_error: err}));
    }

    private static resetPasswordPage(req: Request, res: Response) {
        res.render('reset_password', {
            _success: req.query.success,
            _error: req.query.error,
            email: req.query.email,
            token: req.query.token,
            // @ts-ignore
            _csrfToken: req.csrfToken(),
        });
        return;
    }

    private static initiatePasswordReset(req: Request, res: Response) {
        // @ts-ignore
        userRepo
            .initiateResetPassword(req.body.email)
            .then((result) => {
                if (result.isError && result.error) {
                    res.redirect(
                        buildUrl('/reset-password', {
                            queryParams: {error: result.error},
                        }),
                    );
                    return;
                }

                res.redirect(
                    buildUrl('/', {
                        queryParams: {
                            success: 'Password reset initiated successfully.',
                            // @ts-ignore
                        },
                    }),
                );
                return;
            })
            .catch((err) => res.redirect(buildUrl('/reset-password', {queryParams: {error: err}})));
    }

    // the actual password reset will redirect users back to the login page with a successful user flash
    private static resetPassword(req: Request, res: Response) {
        // @ts-ignore
        userRepo
            .resetPassword(plainToClass(ResetUserPasswordPayload, req.body as object))
            .then((result) => {
                if (result.isError && result.error) {
                    res.redirect(buildUrl('/', {queryParams: {error: result.error}}));
                    return;
                }

                res.redirect(
                    buildUrl('/', {
                        queryParams: {success: 'Password reset successfully'},
                    }),
                );
                return;
            })
            .catch((err) => res.redirect(buildUrl('/', {queryParams: {error: err}})));
    }
}
