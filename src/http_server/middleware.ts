/* eslint-disable @typescript-eslint/ban-ts-comment */
import express from 'express';
import Authorization from '../domain_objects/access_management/authorization/authorization';
import Config from '../services/config';
import passport from 'passport';
import ContainerRepository from '../data_access_layer/repositories/data_warehouse/ontology/container_respository';
import MetatypeRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import MetatypeRelationshipRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_repository';
import MetatypeRelationshipPairRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_pair_repository';
import MetatypeKeyRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_key_repository';
import MetatypeRelationshipKeyRepository from '../data_access_layer/repositories/data_warehouse/ontology/metatype_relationship_key_repository';
import {plainToClass} from 'class-transformer';
import {SuperUser, User} from '../domain_objects/access_management/user';
import UserRepository from '../data_access_layer/repositories/access_management/user_repository';
import OAuthRepository from '../data_access_layer/repositories/access_management/oauth_repository';
import NodeRepository from '../data_access_layer/repositories/data_warehouse/data/node_repository';
import EdgeRepository from '../data_access_layer/repositories/data_warehouse/data/edge_repository';
import TypeMappingRepository from '../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import TypeTransformationRepository from '../data_access_layer/repositories/data_warehouse/etl/type_transformation_repository';
import ExporterRepository from '../data_access_layer/repositories/data_warehouse/export/export_repository';
import ImportRepository from '../data_access_layer/repositories/data_warehouse/import/import_repository';
import DataStagingRepository from '../data_access_layer/repositories/data_warehouse/import/data_staging_repository';
import DataSourceRepository from '../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import FileRepository from '../data_access_layer/repositories/data_warehouse/data/file_repository';
import TaskRepository from '../data_access_layer/repositories/task_runner/task_repository';
import EventActionRepository from '../data_access_layer/repositories/event_system/event_action_repository';
import EventActionStatusRepository from '../data_access_layer/repositories/event_system/event_action_status_repository';
import OntologyVersionRepository from '../data_access_layer/repositories/data_warehouse/ontology/versioning/ontology_version_repository';

// authRequest is used to manage user authorization against resources, optional param for declaring domain
export function authRequest(action: 'read' | 'write', resource: string, domainParam?: string) {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        let domain: string | undefined;
        // pass auth if user is an admin
        if (req.currentUser && req.currentUser.admin) {
            next();
            return;
        }

        // set the domain(container) from the provided parameterID
        if (domainParam) domain = req.params[domainParam];

        Authorization.AuthUser(req.user, action, resource, domain)
            .then((result) => {
                if (result) {
                    next();
                    return;
                }

                resp.status(400).send('unauthorized');
                return;
            })
            .catch(() => {
                resp.status(400).send('unauthorized');
                return;
            });
    };
}

// authUser is used to manage user authorization against themselves, id refers to the user ID
export function authUser() {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        if (req.currentUser && req.params.id === req.currentUser.id) next();
        else {
            resp.status(401).send('unauthorized');
        }
    };
}

// authDomain assumes the request parameter 'containerID' refers to the current domain of the user
export function authInContainer(action: 'read' | 'write', resource: string) {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // pass auth if user is an admin
        if (req.currentUser && req.currentUser.admin) {
            next();
            return;
        }

        Authorization.AuthUser(req.currentUser, action, resource, req.params.containerID)
            .then((result) => {
                if (result) {
                    next();
                    return;
                }

                resp.status(401).send('unauthorized');
                return;
            })
            .catch(() => {
                resp.status(401).send('unauthorized');
                return;
            });
    };
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
            return passport.authenticate('jwt', {session: false});
        }

        default: {
            return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
                req.currentUser = SuperUser;
                next();
            };
        }
    }
}

// allows us to set sane defaults on listing functions, and stops us from having to check the existence of the
// query params. TODO: This could lead to unexpected behavior, perhaps find a better way to accomplish this.
export function offsetLimitReplacer(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // @ts-ignore
        if (isNaN(+req.query.offset)) req.query.offset = '0';
        // @ts-ignore
        if (isNaN(+req.query.limit)) req.query.limit = '10000';
        next();
    };
}

// containerContext will attempt to fetch a container by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "containerID"
export function containerContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id, don't fail, just pass without action
        if (!req.params.containerID) {
            next();
            return;
        }

        const repo = new ContainerRepository();

        repo.findByID(req.params.containerID)
            .then((result) => {
                if (result.isError) {
                    result.asResponse(resp);
                    return;
                }

                req.container = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// metatypeContext will attempt to fetch a metatype by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "metatypeID"
export function metatypeContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id, don't fail, just pass without action
        if (!req.params.metatypeID) {
            next();
            return;
        }

        const repo = new MetatypeRepository();

        repo.findByID(req.params.metatypeID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.metatype = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// metatypeKeyContext will attempt to fetch a metatype key by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "metatypeKeyID"
export function metatypeKeyContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id, don't fail, just pass without action
        if (!req.params.metatypeKeyID) {
            next();
            return;
        }

        const repo = new MetatypeKeyRepository();

        repo.findByID(req.params.metatypeKeyID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.metatypeKey = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// metatypeRelationshipContext will attempt to fetch a relationship by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "metatypeRelationshipID"
export function metatypeRelationshipContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id, don't fail, just pass without action
        if (!req.params.metatypeRelationshipID) {
            next();
            return;
        }

        const repo = new MetatypeRelationshipRepository();

        repo.findByID(req.params.metatypeRelationshipID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.metatypeRelationship = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// metatypeKeyContext will attempt to fetch a metatype key by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "relationshipKeyID"
export function metatypeRelationshipKeyContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id, don't fail, just pass without action
        if (!req.params.relationshipKeyID) {
            next();
            return;
        }

        const repo = new MetatypeRelationshipKeyRepository();

        repo.findByID(req.params.relationshipKeyID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.metatypeRelationshipKey = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// metatypeRelationshipPairContext will attempt to fetch a pair by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "relationshipPairID"
export function metatypeRelationshipPairContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.params.relationshipPairID) {
            next();
            return;
        }

        const repo = new MetatypeRelationshipPairRepository();

        repo.findByID(req.params.relationshipPairID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.metatypeRelationshipPair = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// userContext will attempt to fetch a user by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "userID"
export function userContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.params.userID) {
            next();
            return;
        }

        const repo = new UserRepository();

        repo.findByID(req.params.userID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.routeUser = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// currentUser will attempt to pull the user object from the request set by
// passport.js and convert it into a full user class for the routes to use as
// needed
export function currentUser(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.user) {
            next();
            return;
        }

        req.currentUser = plainToClass(User, req.user);
        next();
    };
}

// oauthAppContext will attempt to fetch an oauth app by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "oauthAppID"
export function oauthAppContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.params.oauthAppID) {
            next();
            return;
        }

        const repo = new OAuthRepository();

        repo.findByID(req.params.oauthAppID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.oauthApp = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// eventActionContext will attempt to fetch an event action by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "actionID"
export function eventActionContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.params.actionID) {
            next();
            return;
        }

        const repo = new EventActionRepository();

        repo.findByID(req.params.actionID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.eventAction = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// eventActionStatusContext will attempt to fetch an event action status by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "statusID"
export function eventActionStatusContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.params.statusID) {
            next();
            return;
        }

        const repo = new EventActionStatusRepository();

        repo.findByID(req.params.statusID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.eventActionStatus = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// nodeContext will attempt to fetch a node by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "nodeID"
export function nodeContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.params.nodeID) {
            next();
            return;
        }

        const repo = new NodeRepository();

        repo.findByID(req.params.nodeID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.node = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// edgeContext will attempt to fetch a node by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "edgeID"
export function edgeContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.params.edgeID) {
            next();
            return;
        }

        const repo = new EdgeRepository();

        repo.findByID(req.params.edgeID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.edge = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// typeMappingContext will attempt to fetch a type mapping by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "mappingID"
export function typeMappingContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.params.mappingID) {
            next();
            return;
        }

        const repo = new TypeMappingRepository();

        repo.findByID(req.params.mappingID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.typeMapping = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// typeTransformationContext will attempt to fetch a type mapping by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "transformationID"
export function typeTransformationContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.params.transformationID) {
            next();
            return;
        }

        const repo = new TypeTransformationRepository();

        repo.findByID(req.params.transformationID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.typeTransformation = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// exporterContext will attempt to fetch an exporter by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "exportID"
export function exporterContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.params.exportID) {
            next();
            return;
        }

        const repo = new ExporterRepository();

        repo.findByID(req.params.exportID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.exporter = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// importContext will attempt to fetch an import by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "importID"
export function importContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.params.importID) {
            next();
            return;
        }

        const repo = new ImportRepository();

        repo.findByID(req.params.importID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.dataImport = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// dataStaging context will attempt to fetch a data staging record by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "dataID"
export function dataStagingContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.params.dataID) {
            next();
            return;
        }

        const repo = new DataStagingRepository();

        repo.findByID(req.params.dataID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.dataStagingRecord = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// dataSource context will attempt to fetch a data source interface by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "sourceID"
export function dataSourceContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.params.sourceID) {
            next();
            return;
        }

        const repo = new DataSourceRepository();

        repo.findByID(req.params.sourceID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.dataSource = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// file context will attempt to fetch a file by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "fileID"
export function fileContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id , don't fail, just pass without action
        if (!req.params.fileID) {
            next();
            return;
        }

        const repo = new FileRepository();

        repo.findByID(req.params.fileID)
            .then((result) => {
                if (result.isError) {
                    resp.status(result.error?.errorCode!).json(result);
                    return;
                }

                req.file = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// taskContext will attempt to fetch a task by id specified by the
// id query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "taskID"
export function taskContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id, don't fail, just pass without action
        if (!req.params.taskID) {
            next();
            return;
        }

        const repo = new TaskRepository();

        repo.findByID(req.params.taskID)
            .then((result) => {
                if (result.isError) {
                    result.asResponse(resp);
                    return;
                }

                req.task = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}

// ontologyVersionChangelist will attempt to fetch a changelist by id specified by the
// ontologyVersionID query parameter. If one is fetched it will pass it on in request context.
// route must contain the param labeled "changelistID"
export function ontologyVersionContext(): any {
    return (req: express.Request, resp: express.Response, next: express.NextFunction) => {
        // if we don't have an id, don't fail, just pass without action
        if (!req.params.ontologyVersionID) {
            next();
            return;
        }

        const repo = new OntologyVersionRepository();

        repo.findByID(req.params.ontologyVersionID)
            .then((result) => {
                if (result.isError) {
                    result.asResponse(resp);
                    return;
                }

                req.ontologyVersion = result.value;
                next();
            })
            .catch((error) => {
                resp.status(500).json(error);
                return;
            });
    };
}
