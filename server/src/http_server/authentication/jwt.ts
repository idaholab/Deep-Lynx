import express from 'express';
import Config from '../../services/config';
import passport from 'passport';
import passportJWT, {ExtractJwt} from 'passport-jwt';

const JwtStrategy = passportJWT.Strategy;

export function SetJWTAuthMethod(app: express.Application) {
    passport.use(
        new JwtStrategy(
            {
                jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), ExtractJwt.fromUrlQueryParameter("auth_token")]),
                secretOrKey: Config.encryption_key_secret,
                algorithms: ['RS256'],
            },
            (jwt, done) => {
                done(null, jwt);
            },
        ),
    );
}
