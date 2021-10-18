import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { plainToClass } from "class-transformer";
import { Application, NextFunction, Request, Response } from "express";
import Result from "../../../common_classes/result";
import { RSARequest, RSAResponse, RSAStatusRequest, RSAStatusResponse } from "../../../domain_objects/access_management/rsa";
import { authInContainer } from "../../middleware";
import Config from "../../../services/config";

export default class RSARoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/rsa/initialize', ...middleware, authInContainer('read', 'data'), this.init)

        app.post('/rsa/verify', ...middleware, authInContainer('read', 'data'), this.verify)

        app.post('/rsa/status', ...middleware, authInContainer('read', 'data'), this.status)

        app.post('/rsa/cancel', ...middleware, authInContainer('read', 'data'), this.cancel)
    }

    /*
    init is used to begin (and optionally complete) an RSA authentication.
    Either a user's ID may be provided and the SecurID provided in a later verify() request,
    or else the user may provide both the user ID (subjectName) and securID at once to init()
    to complete the authentication request
    */
    private static init(req: Request, res: Response, next: NextFunction) {
        if (req.headers['content-type']?.includes('application/json')) {
            // return error if no subjectName
            if (!req.body.subjectName) {
                res.status(400).json('Please provide a subjectName');
                next();
            }

            // initialize default payload
            const payload = new RSARequest({
                clientID: Config.rsa_client_id,
                subjectName: req.body.subjectName,
                securID: (req.body.securID ? req.body.securID : null),
                methodId: 'SECURID'
            })

            const axiosConfig: AxiosRequestConfig = {
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'client-key': Config.rsa_client_key
                }
            };

            axios.post(`${Config.rsa_url}/mfa/v1_1/authn/initialize`, payload, axiosConfig)
                .then((response: AxiosResponse) => {
                    const responsePayload = plainToClass(RSAResponse, response.data as object);
                    Result.Success(responsePayload).asResponse(res)
                })
                .catch((e: string) => {
                    res.status(500).json(e);
                })
                .finally(() => next());
        } else {
            res.status(404).json('Unsupported content type');
            next();
        }
    }

    // verify provides RSA with the user's SecurID to complete authentication
    private static verify(req: Request, res: Response, next: NextFunction) {
        if (req.headers['content-type']?.includes('application/json')) {
            // return error if no securID
            if (!req.body.securID || !req.body.authnAttemptId || !req.body.inResponseTo) {
                res.status(400).json('Please provide a securID, authnAttemptId, and inResponseTo');
                next();
            }

            // initialize default payload
            const payload = new RSARequest({
                clientID: Config.rsa_client_id,
                subjectName: req.body.subjectName,
                securID: req.body.securID,
                authnAttemptId: req.body.authnAttemptId,
                inResponseTo: req.body.inResponseTo,
                methodId: 'SECURID'
            })

            const axiosConfig: AxiosRequestConfig = {
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'client-key': Config.rsa_client_key
                }
            };

            axios.post(`${Config.rsa_url}/mfa/v1_1/authn/verify`, payload, axiosConfig)
                .then((response: AxiosResponse) => {
                    const responsePayload = plainToClass(RSAResponse, response.data as object);
                    Result.Success(responsePayload).asResponse(res)
                })
                .catch((e: string) => {
                    res.status(500).json(e);
                })
                .finally(() => next());
        } else {
            res.status(404).json('Unsupported content type');
            next();
        }
    }

    // status returns the status of an RSA authentication attempt
    private static status(req: Request, res: Response, next: NextFunction) {
        if (req.headers['content-type']?.includes('application/json')) {
            const axiosConfig: AxiosRequestConfig = {
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'client-key': Config.rsa_client_key
                }
            };

            const payload = plainToClass(RSAStatusRequest, req.body as object);

            axios.post(`${Config.rsa_url}/mfa/v1_1/authn/status`, payload, axiosConfig)
                .then((response: AxiosResponse) => {
                    const responsePayload = plainToClass(RSAStatusResponse, response.data as object);
                    Result.Success(responsePayload).asResponse(res)
                })
                .catch((e: string) => {
                    res.status(500).json(e);
                })
                .finally(() => next());
        } else {
            res.status(404).json('Unsupported content type');
            next();
        }
    }

    // cancel cancels an RSA authentication attempt
    private static cancel(req: Request, res: Response, next: NextFunction) {
        if (req.headers['content-type']?.includes('application/json')) {
            const axiosConfig: AxiosRequestConfig = {
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'client-key': Config.rsa_client_key
                }
            };

            const payload = plainToClass(RSAStatusRequest, req.body as object);

            axios.post(`${Config.rsa_url}/mfa/v1_1/authn/cancel`, payload, axiosConfig)
                .then((response: AxiosResponse) => {
                    const responsePayload = plainToClass(RSAResponse, response.data as object);
                    Result.Success(responsePayload).asResponse(res)
                })
                .catch((e: string) => {
                    res.status(500).json(e);
                })
                .finally(() => next());
        } else {
            res.status(404).json('Unsupported content type');
            next();
        }
    }
}