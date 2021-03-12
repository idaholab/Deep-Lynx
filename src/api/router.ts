import express from "express"
const cors = require('cors')
import helmet from "helmet"
import passport from "passport"
import passportHttp from "passport-http"
const BasicStrategy = passportHttp.BasicStrategy;
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const exphbs = require('express-handlebars')
const methodOverride = require('method-override')

import { Server } from "./server"
import {
    PerformanceMiddleware,
    authenticateRoute,
    offsetLimitReplacer,
    containerContext,
    metatypeContext, metatypeRelationshipContext, metatypeRelationshipPairContext
} from "./middleware";
import ContainerRoutes from "./container_routes"
import MetatypeRoutes from "./metatype_routes"
import MetatypeKeyRoutes from "./metatype_key_routes";
import MetatypeRelationshipRoutes from "./metatype_relationship_routes";
import MetatypeRelationshipKeyRoutes from "./metatype_relationship_key_routes";
import MetatypeRelationshipPairRoutes from "./metatype_relationship_pair_routes";
import PostgresAdapter from "../data_access_layer/mappers/adapters/postgres/postgres";
import Config from "../config";
import {SetSamlAdfs} from "../user_management/authentication/saml/saml-adfs";
import {SuperUser, UserT} from "../types/user_management/userT";
import UserRoutes from "./user_routes";
import DataSourceRoutes from "./data_source_routes";
import {SetJWTAuthMethod} from "../user_management/authentication/jwt";
import {SetLocalAuthMethod} from "../user_management/authentication/local";
import QueryRoutes from "./query_routes";
import GraphRoutes from "./graph_routes";
import OAuthRoutes from "./oauth_routes";
import UserStorage from "../data_access_layer/mappers/user_management/user_storage";
import EventRoutes from "./event_routes";
import ExportRoutes from "./export_routes";

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



    // single, raw endpoint for a health check
    this.app.get("/health", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.sendStatus(200);
      next();
    });

    // Auth middleware is mounted as part of the pre-middleware, making all middleware
    // mounted afterwards secure
    this.mountPreMiddleware();

    // Mount application controllers, middleware is passed in as an array of functions
    UserRoutes.mount(this.app, [authenticateRoute(), containerContext()]);
    ContainerRoutes.mount(this.app, [authenticateRoute(), containerContext()]);
    ExportRoutes.mount(this.app, [authenticateRoute(), containerContext()]);
    DataSourceRoutes.mount(this.app, [authenticateRoute(), containerContext()]);
    MetatypeRoutes.mount(this.app, [authenticateRoute(), containerContext(), metatypeContext()]);
    MetatypeKeyRoutes.mount(this.app, [authenticateRoute(), containerContext(), metatypeContext()]);
    MetatypeRelationshipRoutes.mount(this.app, [authenticateRoute(), containerContext(), metatypeRelationshipContext()]);
    MetatypeRelationshipKeyRoutes.mount(this.app, [authenticateRoute(), containerContext(), metatypeRelationshipContext()]);
    MetatypeRelationshipPairRoutes.mount(this.app, [authenticateRoute(), containerContext(), metatypeRelationshipPairContext()]);
    QueryRoutes.mount(this.app, [authenticateRoute(), containerContext()]);
    GraphRoutes.mount(this.app, [authenticateRoute(), containerContext()]);
    EventRoutes.mount(this.app, [authenticateRoute(), containerContext()]);

    // OAuth and Identity Provider routes - these are the only routes that serve up
    // webpages. WE ALSO MOUNT THE '/' ENDPOINT HERE
    OAuthRoutes.mount(this.app)

    this.mountPostMiddleware()
  }

  private mountPreMiddleware() {
      this.app.use(methodOverride('_method'))

      // templating engine
      this.app.engine('.hbs', exphbs({extname: '.hbs'}))
      this.app.set('view engine', '.hbs')
      this.app.set('views', Config.template_dir)

      // assets
      this.app.use(express.static(Config.asset_dir))

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

    // @ts-ignore - as of 1/6/2021 passport.js types haven't been updated
    passport.serializeUser((user: UserT, done: any) => {
          user.password = ""
          done(null, user.id);
      });

    passport.deserializeUser((user: string, done: any) => {
          UserStorage.Instance.Retrieve(user)
              .then(result => {
                  if(result.isError) done("unable to retrieve user", null)

                  done(null, result.value)
              })
      });

    // finalize passport.js usage
    this.app.use(passport.initialize());
    this.app.use(passport.session());
  }

  private mountPostMiddleware() {
    this.app.use([this.perfMiddleware.Post()])
  }
}
