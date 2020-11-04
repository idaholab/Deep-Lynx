import express from "express";
import uuid from "uuid-random";
import { performance, PerformanceObserver } from "perf_hooks";
import Logger from "../logger"
import Authorization from "../user_management/authorization/authorization";
import Config from "../config";
import passport from "passport";
import {SuperUser, UserT} from "../types/user_management/userT";

// PerformanceMiddleware uses the provided logger to display the time each route
// took to process and send a response to the requester. This leverages node.js's
// performance API. At time of writing this middleware is only compatible with express.js.
export class PerformanceMiddleware {
    public constructor() {
        this.performanceObserver.observe({ entryTypes: ["measure"] })
    }

    public performanceObserver = new PerformanceObserver(items => {
        Logger.info(
            `${items.getEntries()[0].name} ${items
                .getEntries()[0]
                .duration.toFixed(2)} MS`
        );
        performance.clearMarks();
    });

    public Pre() {
        return (
            req: express.Request,
            res: express.Response,
            next: express.NextFunction
        ) => {
            const id = uuid();

            res.setHeader("benchmarking", id);
            performance.mark(id);

            next();
        }
    }

    public Post() {
        return (
            req: express.Request,
            res: express.Response,
            next: express.NextFunction
        ) => {
            const id = uuid();
            performance.mark(id);
            const firstMark = res.get("benchmarking");
            if (firstMark) {
                performance.measure(`${req.method} ${req.path}`, firstMark, id);
            }

            next();
        }
    }
}

// authRequest is used to manage user authorization against resources, optional param for declaring domain
export function authRequest( action: "read" | "write", resource: string, domainParam?:string) {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        let domain: string | undefined;
        const user = req.user as UserT

        // pass auth if user is an admin
        if(user.admin) {
            next()
            return
        }

        // set the domain(container) from the provided parameterID
        if(domainParam) domain = req.params[domainParam];

        Authorization.AuthUser(req.user, action, resource, domain)
            .then(result => {
                if(result) {
                    next();
                    return
                }

                resp.status(400).send('unauthorized');
                return
            })
            .catch(() => {
                resp.status(400).send('unauthorized');
                return
            })
    }
}


// authUser is used to manage user authorization against themselves, id refers to the user ID
export function authUser() {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        const user = req.user as UserT

        if(req.params.id === user.id) next()
        else {
            resp.status(401).send('unauthorized')
        }
    }
}

// authDomain assumes the request paramater 'id' refers to the current domain of the user
export function authInContainer(action: "read" | "write", resource: string) {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        const user = req.user as UserT

        // pass auth if user is an admin
        if(user.admin) {
            next()
            return
        }

        Authorization.AuthUser(req.user, action, resource, req.params.id)
            .then(result => {
                if(result) {
                    next();
                    return
                }

                resp.status(401).send('unauthorized');
                return
            })
            .catch(() => {
                resp.status(401).send('unauthorized');
                return
            })
    }
}

// authenticateRoute should be used whenever a route is considered protected
export function authenticateRoute(): any {
    switch (Config.auth_strategy) {
        // basic assumes we are sending the username/password each request. In this
        // case we don't rely on the session for any login/user information
        case 'basic': {
            return passport.authenticate('basic', {session: true});
        }

        case 'token': {
            return passport.authenticate('jwt', {session: false})
        }

        default: {
            return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
                req.user = SuperUser();
                next()};
        }
    }
}

// allows us to set sane defaults on listing functions, and stops us from having to check the existence of the
// query params. TODO: This could lead to unexpected behavior, perhaps find a better way to accomplish this.
export function offsetLimitReplacer(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // @ts-ignore
        if(isNaN(+req.query.offset))  req.query.offset = "0";
        // @ts-ignore
        if(isNaN(+req.query.limit))  req.query.limit = "10000";
        next()};

}
