import express from "express";
import uuid from "uuid-random";
import { performance, PerformanceObserver } from "perf_hooks";
import Logger from "../logger"
import Authorization from "../user_management/authorization/authorization";
import Config from "../config";
import passport from "passport";
import {SuperUser, UserT} from "../types/user_management/userT";
import ContainerRepository from "../data_access_layer/repositories/container_respository";
import MetatypeRepository from "../data_access_layer/repositories/metatype_repository";
import MetatypeRelationshipRepository from "../data_access_layer/repositories/metatype_relationship_repository";
import MetatypeRelationshipPairRepository
    from "../data_access_layer/repositories/metatype_relationship_pair_repository";
import MetatypeKeyRepository from "../data_access_layer/repositories/metatype_key_repository";
import MetatypeRelationshipKeyRepository from "../data_access_layer/repositories/metatype_relationship_key_repository";

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

// containerContext will attempt to fetch a container by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "containerID"
export function containerContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id, don't fail, just pass without action
        if(!req.params.containerID) {
            next()
            return
        }

        const repo = new ContainerRepository()

        repo.findByID(req.params.containerID)
            .then(result => {
               if(result.isError) {
                   result.asResponse(resp)
                   return
               }

               req.container = result.value
               next()
            })
            .catch(error => {
                resp.status(500).json(error)
                return
            })
    }
}

// metatypeContext will attempt to fetch a metatype by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "metatypeID"
export function metatypeContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id, don't fail, just pass without action
        if(!req.params.metatypeID) {
            next()
            return
        }

        const repo = new MetatypeRepository()

        repo.findByID(req.params.metatypeID)
            .then(result => {
                if(result.isError) {
                    resp.status(result.error?.errorCode!).json(result)
                    return
                }

                req.metatype = result.value
                next()
            })
            .catch(error => {
                resp.status(500).json(error)
                return
            })
    }
}

// metatypeKeyContext will attempt to fetch a metatype key by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "metatypeKeyID"
export function metatypeKeyContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id, don't fail, just pass without action
        if(!req.params.metatypeKeyID) {
            next()
            return
        }

        const repo = new MetatypeKeyRepository()

        repo.findByID(req.params.metatypeKeyID)
            .then(result => {
                if(result.isError) {
                    resp.status(result.error?.errorCode!).json(result)
                    return
                }

                req.metatypeKey = result.value
                next()
            })
            .catch(error => {
                resp.status(500).json(error)
                return
            })
    }
}

// metatypeRelationshipContext will attempt to fetch a relationship by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "metatypeRelationshipID"
export function metatypeRelationshipContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id, don't fail, just pass without action
        if(!req.params.metatypeRelationshipID) {
            next()
            return
        }

        const repo = new MetatypeRelationshipRepository()

        repo.findByID(req.params.metatypeRelationshipID)
            .then(result => {
                if(result.isError) {
                    resp.status(result.error?.errorCode!).json(result)
                    return
                }

                req.metatypeRelationship = result.value
                next()
            })
            .catch(error => {
                resp.status(500).json(error)
                return
            })
    }
}

// metatypeKeyContext will attempt to fetch a metatype key by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "metatypeRelationshipKeyID"
export function metatypeRelationshipKeyContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id, don't fail, just pass without action
        if(!req.params.metatypeRelationshipKeyID) {
            next()
            return
        }

        const repo = new MetatypeRelationshipKeyRepository()

        repo.findByID(req.params.metatypeRelationshipKeyID)
            .then(result => {
                if(result.isError) {
                    resp.status(result.error?.errorCode!).json(result)
                    return
                }

                req.metatypeRelationshipKey= result.value
                next()
            })
            .catch(error => {
                resp.status(500).json(error)
                return
            })
    }
}

// metatypeRelationshipPairContext will attempt to fetch a pair by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "relationshipPairID"
export function metatypeRelationshipPairContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if(!req.params.relationshipPairID) {
            next()
            return
        }

        const repo = new MetatypeRelationshipPairRepository()

        repo.findByID(req.params.relationshipPairID)
            .then(result => {
                if(result.isError) {
                    resp.status(result.error?.errorCode!).json(result)
                    return
                }

                req.metatypeRelationshipPair = result.value
                next()
            })
            .catch(error => {
                resp.status(500).json(error)
                return
            })
    }
}
