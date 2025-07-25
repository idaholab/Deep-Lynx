import express from 'express';
import passport from 'passport';
import * as fs from 'fs';
import Config from '../../../services/config';
import UserMapper from '../../../data_access_layer/mappers/access_management/user_mapper';
import Result from '../../../common_classes/result';
import Logger from '../../../services/logger';
import {User} from '../../../domain_objects/access_management/user';
import {serialize} from 'class-transformer';

const SamlStrategy = require('@node-saml/passport-saml').Strategy;

export function SetSamlAdfs(app: express.Application) {
    // do not set the auth strategy if we don't have a public/private key pair.
    // If a user attempts to auth with this strategy attempting the login routes
    // without a public/private key present the application will return an error
    if (!Config.saml_adfs_private_cert_path || !Config.saml_adfs_public_cert_path) {
        Logger.info(`No public/private key pair. ${Config}`);
        return;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - as of 1/6/2021 passport.js types haven't been updated
    passport.serializeUser((user: User, done: any) => {
        if (typeof user === 'string') {
            user = JSON.parse(user);
        }
        user.password = '';
        done(null, user.id);
    });

    passport.deserializeUser((user: string, done: any) => {
        void UserMapper.Instance.Retrieve(user).then((result) => {
            if (result.isError) done('unable to retrieve user', null);

            done(null, result.value);
        });
    });

    passport.use(
        new SamlStrategy(
            {
                entryPoint: Config.saml_adfs_entry_point,
                issuer: Config.saml_adfs_issuer,
                callbackUrl: Config.saml_adfs_callback,
                privateCert: fs.readFileSync(Config.saml_adfs_private_cert_path, 'utf-8'),
                cert: fs.readFileSync(Config.saml_adfs_public_cert_path, 'utf-8'),
                signatureAlgorithm: Config.saml_adfs_signature_algorithm,
                racComparison: 'exact',
                disableRequestedAuthnContext: Config.saml_adfs_disable_requested_authn_context,
                identifierFormat: null,
                wantAuthnResponseSigned: Config.saml_adfs_want_authn_response_signed,
                wantAssertionsSigned: Config.saml_adfs_want_assertions_signed,
                audience: Config.saml_adfs_audience,
            },
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            (profile: any, done: any) => {
                Logger.info(`Saml email key: ${Config.saml_claims_email}`);
                Logger.info(`Saml email value: ${profile[Config.saml_claims_email]}`);
                const storage = UserMapper.Instance;

                return new Promise((resolve) => {
                    storage
                        .RetrieveByEmail(profile[Config.saml_claims_email])
                        .then((result) => {
                            Logger.info(`Retrieved user: ${result.value}`)
                            if (result.isError && result.error?.errorCode !== 404) {
                                Logger.error(`Error with retrieved user. Error code is not 404. ${result.error}`);
                                resolve(done(result.error, false));
                            }

                            if (result.isError && result.error?.errorCode === 404) {
                                void storage.List().then((users) => {
                                    // if there are no other users of this DeepLynx instance
                                    // we go ahead and assign admin status to this newly created
                                    // user
                                    void storage
                                        .Create(
                                            'saml-adfs login',
                                            new User({
                                                identity_provider_id: profile[Config.saml_claims_email],
                                                identity_provider: 'saml_adfs',
                                                display_name: profile[Config.saml_claims_name]
                                                    ? profile[Config.saml_claims_name]
                                                    : profile[Config.saml_claims_email],
                                                email: profile[Config.saml_claims_email],
                                                admin: users.value.length === 0,
                                            }),
                                        )
                                        .then((user: Result<User>) => {
                                            if (user.isError) {
                                                resolve(done(user.error, false));
                                            }

                                            resolve(done(null, serialize(user.value)));
                                        });
                                });
                            } else {
                                resolve(done(null, serialize(result.value)));
                            }
                        })
                        .catch((error) => resolve(done(error, false)));
                });
            },
        ),
    );
}

/*
Example response from a SAML service
{
                "issuer": "",
                "nameID": "john@thirdhousesoftware.com",
                "inResponseTo": "",
                "nameIDFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
                "sessionIndex": "",
                "http://schemas.microsoft.com/identity/claims/tenantid": "",
                "http://schemas.microsoft.com/identity/claims/displayname": "John Darrington",
                "http://schemas.microsoft.com/claims/authnmethodsreferences": "http://schemas.microsoft.com/ws/2008/06/identity/authenticationmethod/password",
                "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": "john@thirdhousesoftware.com",
                "http://schemas.microsoft.com/identity/claims/identityprovider": "",
                "http://schemas.microsoft.com/identity/claims/objectidentifier": "",
                "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname": "Darrington",
                "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname": "John"
            }
 */
