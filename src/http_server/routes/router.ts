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

import { Server } from "../server"
import {
    PerformanceMiddleware,
    authenticateRoute,
    offsetLimitReplacer,
    containerContext,
    metatypeContext,
    metatypeRelationshipContext,
    metatypeRelationshipPairContext,
    metatypeKeyContext,
    metatypeRelationshipKeyContext,
    currentUser,
    userContext,
    oauthAppContext,
    nodeContext,
    typeTransformationContext,
    typeMappingContext, exporterContext, importContext, dataStagingContext, dataSourceContext, eventRegistrationContext
} from "../middleware";
import ContainerRoutes from "./data_warehouse/ontology/container_routes"
import MetatypeRoutes from "./data_warehouse/ontology/metatype_routes"
import MetatypeKeyRoutes from "./data_warehouse/ontology/metatype_key_routes";
import MetatypeRelationshipRoutes from "./data_warehouse/ontology/metatype_relationship_routes";
import MetatypeRelationshipKeyRoutes from "./data_warehouse/ontology/metatype_relationship_key_routes";
import MetatypeRelationshipPairRoutes from "./data_warehouse/ontology/metatype_relationship_pair_routes";
import PostgresAdapter from "../../data_access_layer/mappers/db_adapters/postgres/postgres";
import Config from "../../services/config";
import {SetSamlAdfs} from "../../access_management/authentication/saml/saml-adfs";
import UserRoutes from "./access_management/user_routes";
import DataSourceRoutes from "./data_warehouse/import/data_source_routes";
import {SetJWTAuthMethod} from "../../access_management/authentication/jwt";
import {SetLocalAuthMethod} from "../../access_management/authentication/local";
import QueryRoutes from "./data_warehouse/data/query/query_routes";
import GraphRoutes from "./data_warehouse/data/graph_routes";
import OAuthRoutes from "./access_management/oauth_routes";
import UserMapper from "../../data_access_layer/mappers/access_management/user_mapper";
import EventRoutes from "./event_system/event_routes";
import ExportRoutes from "./data_warehouse/export/export_routes";
import TypeMappingRoutes from "./data_warehouse/etl/type_mapping_routes";
import {serialize} from "class-transformer";
import {SuperUser} from "../../access_management/user";
import ImportRoutes from "./data_warehouse/import/import_routes";


/*
 Router is a self contained set of routes and middleware that the main express.js
 application should call. It should be called only once.
*/
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
    this.app.use(express.urlencoded({ extended: false, limit: `${Config.max_request_body_size}mb` }));

    // single, raw endpoint for a health check
    this.app.get("/health", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.sendStatus(200);
      next();
    });

    // Auth middleware is mounted as part of the pre-middleware, making all middleware
    // mounted afterwards secure
    this.mountPreMiddleware();

    // Mount application controllers, middleware is passed in as an array of functions
    UserRoutes.mount(this.app, [authenticateRoute(), containerContext(), userContext(), currentUser()]);
    ContainerRoutes.mount(this.app, [authenticateRoute(), containerContext(), currentUser()]);
    ExportRoutes.mount(this.app, [authenticateRoute(), containerContext(), exporterContext(), currentUser()]);
    DataSourceRoutes.mount(this.app, [authenticateRoute(), containerContext(),dataSourceContext(), currentUser()]);
    ImportRoutes.mount(this.app, [authenticateRoute(), containerContext(), importContext(), dataStagingContext(), dataSourceContext(), currentUser()])
    TypeMappingRoutes.mount(this.app, [authenticateRoute(), containerContext(), typeTransformationContext(), typeMappingContext(), dataSourceContext(), currentUser()])
    MetatypeRoutes.mount(this.app, [authenticateRoute(), containerContext(), metatypeContext(), currentUser()]);
    MetatypeKeyRoutes.mount(this.app, [authenticateRoute(), containerContext(), metatypeContext(), metatypeKeyContext(), currentUser()]);
    MetatypeRelationshipRoutes.mount(this.app, [authenticateRoute(), containerContext(), metatypeRelationshipContext(), currentUser()]);
    MetatypeRelationshipKeyRoutes.mount(this.app, [authenticateRoute(), containerContext(), metatypeRelationshipContext(), metatypeRelationshipKeyContext(), currentUser()]);
    MetatypeRelationshipPairRoutes.mount(this.app, [authenticateRoute(), containerContext(), metatypeRelationshipPairContext(), currentUser()]);
    QueryRoutes.mount(this.app, [authenticateRoute(), containerContext(), currentUser()]);
    GraphRoutes.mount(this.app, [authenticateRoute(), containerContext(), nodeContext(), metatypeContext(), currentUser()]);
    EventRoutes.mount(this.app, [authenticateRoute(), containerContext(),eventRegistrationContext(), currentUser()]);

    // OAuth and Identity Provider routes - these are the only routes that serve up
    // webpages. WE ALSO MOUNT THE '/' ENDPOINT HERE
    OAuthRoutes.mount(this.app, [oauthAppContext()])

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

      this.app.use(express.json({limit: `${Config.max_request_body_size}mb`}));

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
            return done(null, serialize(SuperUser));
          }

          return done(null, false)
        }
    ));



    // SetSaml will initialize and assign the saml auth strategy
    if(Config.saml_enabled) SetSamlAdfs(this.app);
    SetLocalAuthMethod(this.app);

    // Once a user has authed against one of the accepted auth methods - the application using the API must
    // use a JWT for each subsequent request
    SetJWTAuthMethod(this.app)

    // @ts-ignore - as of 1/6/2021 passport.js types haven't been updated
    passport.serializeUser((user: User, done: any) => {
          user.password = ""
          done(null, user.id);
      });

    passport.deserializeUser((user: string, done: any) => {
          UserMapper.Instance.Retrieve(user)
              .then(result => {
                  if(result.isError) done("unable to retrieve user", null)

                  done(null, result.value)
              })
      });

    // finalize passport.js usage
    this.app.use(passport.initialize());
    this.app.use(passport.session());
    this.app.use(currentUser()) // current user can be pulled after passport runs
  }

  private mountPostMiddleware() {
    this.app.use([this.perfMiddleware.Post()])
  }
}
