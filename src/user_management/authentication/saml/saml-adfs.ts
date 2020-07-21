import express from "express"
import passportSaml from "passport-saml"
import passport from "passport";
import * as fs from "fs";

import {UserT} from "../../../types/user_management/userT";
import Config from "../../../config"
import UserStorage from "../../../data_storage/user_management/user_storage";
import Result from "../../../result";


const SamlStrategy = passportSaml.Strategy;

export function SetSamlAdfs(app: express.Application) {
    passport.serializeUser((user, done) => {
        done(null, user);
    });
    passport.deserializeUser((user, done) => {
        done(null, user);
    });

    passport.use(new SamlStrategy({
        entryPoint: Config.saml_adfs_entry_point,
        issuer: Config.saml_adfs_issuer,
        callbackUrl: Config.saml_adfs_callback,
        privateCert: fs.readFileSync(Config.saml_adfs_private_cert_path, 'utf-8'),
        cert: fs.readFileSync(Config.saml_adfs_public_cert_path, 'utf-8'),
        authnContext: 'http://schemas.microsoft.com/ws/2008/06/identity/authenticationmethod/password',
        signatureAlgorithm: 'sha256',
        RACComparison: 'exact'
    },(profile:any, done:any) => {
        const storage = UserStorage.Instance;

        return new Promise(resolve => {
            storage.RetrieveByIdentityProviderID(profile["http://schemas.microsoft.com/identity/claims/objectidentifier"])
                .then((result) => {
                    if(result.isError && result.error?.errorCode !== 404) {
                        resolve(done(result.error, false))
                    }

                    if(result.isError && result.error?.errorCode === 404) {
                        storage.List(0, 1)
                            .then(users => {
                                storage.Create('saml-adfs login', {
                                    identity_provider_id: profile["http://schemas.microsoft.com/identity/claims/objectidentifier"],
                                    identity_provider: "saml_adfs",
                                    display_name: profile["http://schemas.microsoft.com/identity/claims/displayname"],
                                    email: profile.nameID,
                                    admin: users.value.length === 0
                                } as UserT)
                                    .then((user: Result<UserT>) => {
                                        if(user.isError) {
                                            resolve(done(user.error, false))
                                        }

                                        resolve(done(null, user.value))
                                    })
                            })

                    } else {
                        resolve(done(null, result.value))
                    }

                })
                .catch(error => resolve(done(error, false)))
        })
    }));
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
