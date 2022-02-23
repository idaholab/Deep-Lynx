import express from 'express';
import passport from 'passport';
import {Strategy} from 'passport-local';
import UserMapper from '../../data_access_layer/mappers/access_management/user_mapper';
import bcrypt from 'bcryptjs';
import Logger from '../../services/logger';
import {classToPlain} from 'class-transformer';
import OAuthRepository from '../../data_access_layer/repositories/access_management/oauth_repository';
const buildUrl = require('build-url');

// just a wrapper for the passport.js local authentication method
export function SetLocalAuthMethod(app: express.Application) {
    passport.use(
        new Strategy({passReqToCallback: true}, (req, username, password, done) => {
            void UserMapper.Instance.RetrieveByEmail(username).then((result) => {
                if (result.isError) return done(result.error);
                if (!result.value) return done('unable to login as provided user');

                bcrypt
                    .compare(password, result.value.password!)
                    .then((match) => {
                        if (match) return done(null, result.value);

                        return done(null, false);
                    })
                    .catch((e) => {
                        Logger.error(`error comparing hashed passwords ${e}`);
                        return done(null, false);
                    });
            });
        }),
    );
}

/*
 This middleware will attempt to authenticate a user using the local authentication method
 if the user has already been authenticated it will pass them to the next handler
 in the chain - http://www.passportjs.org/packages/passport-local/
*/
export function LocalAuthMiddleware(req: express.Request, resp: express.Response, next: express.NextFunction): any {
    const oauthRepo = new OAuthRepository();
    const oauthRequest = oauthRepo.authorizationFromRequest(req);

    if (req.isAuthenticated()) {
        next();
        return;
    }

    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return resp.redirect(buildUrl('/oauth', {queryParams: {error: `${err}`}}));
        }
        if (!user) {
            return resp.redirect(buildUrl('/oauth', {queryParams: req.query}));
        }
        req.logIn(user, (err) => {
            if (err) {
                return resp.redirect(buildUrl('/oauth', {queryParams: {error: err.toString()}}));
            }

            if (oauthRequest) {
                return resp.redirect(
                    buildUrl('/oauth/authorize', {
                        queryParams: classToPlain(oauthRequest),
                    }),
                );
            }

            return resp.redirect('/oauth/profile');
        });
    })(req, resp, next);
}
