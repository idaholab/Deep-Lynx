import express from "express"
import Config from "../../config"
import passport from "passport"
import passportJWT, {ExtractJwt} from "passport-jwt"
import * as fs from "fs";

const JwtStrategy = passportJWT.Strategy;

export function SetJWTAuthMethod(app: express.Application) {
    passport.use(new JwtStrategy({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: Config.encryption_key_secret
    }, (jwt, done) => {
            done(null, jwt)
    } ))
}
