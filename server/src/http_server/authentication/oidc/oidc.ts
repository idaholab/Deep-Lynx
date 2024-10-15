const passport = require('passport');
const OpenIDConnectStrategy = require('passport-openidconnect');
import Config from '../../../services/config';


passport.use(new OpenIDConnectStrategy({
    issuer: Config.oidc_issuer,
    authorizationURL: Config.oidc_authorizationURL,
    tokenURL: Config.oidc_tokenURL,
    userInfoURL: Config.oidc_userInfoURL,
    clientID: Config.oidc_clientID,
    clientSecret: Config.oidc_clientSecret,
    callbackURL: Config.oidc_callbackURL,
    scope: [ 'profile' ]
}, function verify(issuer: any, profile: any, cb: any) {
    return cb(null, profile);
}));
