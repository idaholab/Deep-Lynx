const passport = require('passport');
const OpenIDConnectStrategy = require('passport-openidconnect');
import express from 'express'
import Config from '../../../services/config';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import {serialize} from 'class-transformer';
import { User } from '../../../domain_objects/access_management/user';
import Result from '../../../common_classes/result';

export function SetOidc(app: express.Application) {
    passport.use(new OpenIDConnectStrategy({
        issuer: Config.oidc_issuer,
        authorizationURL: Config.oidc_authorizationURL,
        tokenURL: Config.oidc_tokenURL,
        userInfoURL: Config.oidc_userInfoURL,
        clientID: Config.oidc_clientID,
        clientSecret: Config.oidc_clientSecret,
        callbackURL: Config.oidc_callbackURL,
        scope: ['profile']
    }, function verify(issuer: any, profile: any, cb: any) {
        const storage = UserMapper.Instance;
        return new Promise((resolve) => {
            storage
                .RetrieveByEmail(profile.username)
                .then((result) => {
                    if (result.isError && result.error?.errorCode !== 404) {
                        resolve(cb(result.error, false));
                    }
                    if (result.isError && result.error?.errorCode === 404) {
                        void storage.List().then((users) => {
                            // if there are no other users of this DeepLynx instance
                            // we go ahead and assign admin status to this newly created
                            // user
                            void storage
                                .Create(
                                    'oidc login',
                                    new User({
                                        identity_provider_id: profile.username,
                                        identity_provider: 'oidc',
                                        display_name: profile.displayName
                                            ? profile.displayName
                                            : profile.username,
                                        email: profile.username,
                                        admin: users.value.length === 0,
                                    }),
                                )
                                .then((user: Result<User>) => {
                                    if (user.isError) {
                                        resolve(cb(user.error, false));
                                    }

                                    resolve(cb(null, serialize(user.value)));
                                });
                        });
                    } else {
                        resolve(cb(null, serialize(result.value)));
                    }
                })
                .catch((error) => resolve(cb(error, false)));
        });
    }));

    passport.serializeUser((user: User, done: any) => {
        if (typeof user === 'string') {
            user = JSON.parse(user);
        }
        done(null, user.id);
    });

    passport.deserializeUser((user: string, done: any) => {
        void UserMapper.Instance.Retrieve(user).then((result) => {
            if (result.isError) done('unable to retrieve user', null);

            done(null, result.value);
        });
    });
}
