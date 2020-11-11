import express from "express"
const cors = require('cors')
import helmet from "helmet"
import passport from "passport"
import passportHttp from "passport-http"

import { Server } from "./server"
import { PerformanceMiddleware, authenticateRoute, offsetLimitReplacer } from "./middleware";
import ContainerRoutes from "./container_routes"
import MetatypeRoutes from "./metatype_routes"
import MetatypeKeyRoutes from "./metatype_key_routes";
import MetatypeRelationshipRoutes from "./metatype_relationship_routes";
import MetatypeRelationshipKeyRoutes from "./metatype_relationship_key_routes";
import MetatypeRelationshipPairRoutes from "./metatype_relationship_pair_routes";
import PostgresAdapter from "../data_storage/adapters/postgres/postgres";
import Config from "../config";
import {SetSamlAdfs} from "../user_management/authentication/saml/saml-adfs";
import {SuperUser, UserT} from "../types/user_management/userT";
import UserRoutes from "./user_routes";
import DataSourceRoutes from "./data_source_routes";
import {SetJWTAuthMethod} from "../user_management/authentication/jwt";
import jwt from "jsonwebtoken"
import {SetLocalAuthMethod} from "../user_management/authentication/local";
import KeyPairStorage from "../data_storage/user_management/keypair_storage";
import {RetrieveResourcePermissions} from "../user_management/users";
import QueryRoutes from "./query_routes";
import GraphRoutes from "./graph_routes";
import OAuthRoutes from "./oauth_routes";
import UserStorage from "../data_storage/user_management/user_storage";
import result from "../result";

const BasicStrategy = passportHttp.BasicStrategy;
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const exphbs = require('express-handlebars')

// Router is a self contained set of routes and middleware that the main express.js
// application should call. It should be called only once.
export class Router {
  // This may little convoluted, but it allows use to keep the `app` name.
  // I'm choosing to do this so that new developers to the project to use
  // documentation from node.js and express.js to understand what we're doing
  // with the underlying express.js application
  private app: express.Application;

  // Middleware classes if needed, try to maintain single functions for middleware
  // when possible and export directly from middleware.ts
  private perfMiddleware: PerformanceMiddleware;

  public constructor(app: Server) {
    this.app = app.UnderlyingExpressApplication;
    this.perfMiddleware = new PerformanceMiddleware()
  }

  public mount() {
    // DO NOT REMOVE - this is required for some auth methods to work correctly
    this.app.use(express.urlencoded({ extended: false }));

    // templating engine

    this.app.engine('.hbs', exphbs({extname: '.hbs'}))
    this.app.set('view engine', '.hbs')
    this.app.set('views', Config.template_dir)

    // single, raw endpoint for a health check
    this.app.get("/health", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.sendStatus(200);
      next();
    });

    // Auth middleware is mounted as part of the pre-middleware, making all middleware
    // mounted afterwards secure
    this.mountPreMiddleware();

    // Mount application controllers, middleware is passed in as an array of functions
    UserRoutes.mount(this.app, [authenticateRoute()]);
    ContainerRoutes.mount(this.app, [authenticateRoute()]);
    DataSourceRoutes.mount(this.app, [authenticateRoute()]);
    MetatypeRoutes.mount(this.app, [authenticateRoute()]);
    MetatypeKeyRoutes.mount(this.app, [authenticateRoute()]);
    MetatypeRelationshipRoutes.mount(this.app, [authenticateRoute()]);
    MetatypeRelationshipKeyRoutes.mount(this.app, [authenticateRoute()]);
    MetatypeRelationshipPairRoutes.mount(this.app, [authenticateRoute()]);
    QueryRoutes.mount(this.app, [authenticateRoute()]);
    GraphRoutes.mount(this.app, [authenticateRoute()]);

    // OAuth and Identity Provider routes - these are the only routes that serve up
    // webpage. WE ALSO MOUNT THE '/' ENDPOINT HERE
    OAuthRoutes.mount(this.app)

    this.mountPostMiddleware()
  }

  private mountPreMiddleware() {
    this.app.use([this.perfMiddleware.Pre()]); // performance middleware
    this.app.use(helmet()); // helmet contains a bunch of pre-built http protections

    // TODO: change before attempting to deploy this application to production
    this.app.use(cors({
      origin: '*'
    }))

    this.app.use(express.json());

    // basic session storage to postgres - keep in mind that this is currently
    // not used. It's here to facilitate future extension of the application and
    // as an example.
    this.app.use(session({
      store: new pgSession({
        pool : PostgresAdapter.Instance.Pool,                // Connection pool
        tableName : 'session'   // Use another table-name than the default "session" one
      }),
      secret: Config.session_secret,
      resave: false,
      saveUninitialized: true,
        secure: true,
      cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
    }));

    this.app.use(offsetLimitReplacer())

    // we call mount auth here because we depend on the session functionality
    this.mountAuthMiddleware()
  }

  private mountAuthMiddleware(): void {
    // BasicStrategy should be used only on the endpoints that we want secured, but don't care if they're "secure"
    // basic auth is considered insufficient for production applications.
    passport.use(new BasicStrategy(
        (userID, password, done) => {
          if(userID === Config.basic_user && password === Config.basic_password) {
            return done(null, SuperUser());
          }

          return done(null, false)
        }
    ));



    // SetSaml will initialize and assign the saml auth strategy
    SetSamlAdfs(this.app);
    SetLocalAuthMethod(this.app);

    // Once a user has authed against one of the accepted auth methods - the application using the API must
    // use a JWT for each subsequent request
    SetJWTAuthMethod(this.app)

    passport.serializeUser((user: UserT, done) => {
          user.password = ""
          done(null, user.id);
      });

    passport.deserializeUser((user: string, done) => {
          UserStorage.Instance.Retrieve(user)
              .then(result => {
                  if(result.isError) done("unable to retrieve user", null)

                  done(null, result.value)
              })
      });

    // finalize passport.js usage
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // set login/logout pages for SAML
    this.app.post('/login-saml',(req: express.Request, resp: express.Response, next: express.NextFunction) => {
      passport.authenticate('saml', (err, user, info) => {
        if(err) { return next(err)}

        if(!user) {return resp.redirect('/')}

        // fetch set of permissions per resource for the user before returning
        RetrieveResourcePermissions((user as UserT).id!)
            .then((permissions: string[][]) => {
                const token = jwt.sign(user, Config.encryption_key_secret, {expiresIn: '1000m'})

                return resp.redirect(req.body.RelayState + `?jwt=${token}`)
            })

      })(req, resp, next)},(req: express.Request, res: express.Response, next: express.NextFunction) => {
          res.redirect('/health');
        }
    );

    // this route should be called with the "redirect" query parameter so that deep lynx knows where to send the user
    // after they've been authenticated with the SAML method
    this.app.get('/login-saml',(req: express.Request, resp: express.Response, next: express.NextFunction) => {
      req.query.RelayState = req.query.redirect
      passport.authenticate('saml', { failureRedirect: '/unauthorized', failureFlash: true })(req, resp, next)
      }, (req: express.Request, res: express.Response) => {
          res.redirect('/health');
        }
    );


    // this route will take an API KeyPair and return a JWT token encapsulating the user to which the supplied
    // KeyPair belongs
    this.app.get("/login-token", (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const key = req.header("x-api-key");
        const secret = req.header("x-api-secret");

        if(key && secret) {
          KeyPairStorage.Instance.ValidateKeyPair(key, secret)
              .then(valid => {
                if(!valid) {
                  res.status(401).send('unauthorized');
                  return
                }

                KeyPairStorage.Instance.UserForKeyPair(key)
                    .then(user => {
                      if(user.isError) {
                        // even though its an error with the user, we don't want
                        // to give that away, keep them thinking its an error
                        // with credentials
                        res.status(401);
                        return;
                      }

                      // fetch set of permissions per resource for the user before returning
                      RetrieveResourcePermissions(user.value.id!)
                          .then(permissions => {
                              user.value.permissions = permissions

                              const token = jwt.sign(user.value, Config.encryption_key_secret, {expiresIn: '1000m'})
                              res.status(200).json(token)
                              return
                          })
                    })
              })
        } else {
          res.status(401).send('unauthorized');
          return
        }

    })
  }


  private mountPostMiddleware() {
    this.app.use([this.perfMiddleware.Post()])
  }
}
