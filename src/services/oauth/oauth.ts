import {Request} from "express"
import {
    OAuthAuthorizationRequestT,
    oauthAuthorizationRequestT,
    OAuthTokenExchangeT
} from "../../types/user_management/oauth";
import uuid from "uuid"
import {pipe} from "fp-ts/pipeable";
import {fold} from "fp-ts/lib/Either";
import {onDecodeError} from "../../utilities";
import Cache from "../cache/cache"
import Result from "../../result";
import UserStorage from "../../data_mappers/user_management/user_storage";
import OAuthApplicationStorage from "../../data_mappers/user_management/oauth_application_storage";

const crypto = require('crypto');
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import Config from "../../config";
import Logger from "../../logger"
import base64url from "base64url";
import {RetrieveResourcePermissions} from "../../user_management/users";

export class OAuth {
    // AuthorizationRequest will make and store a request in cache for 10 minutes. It will
    // return a token which then must be used to exchange for the final access token
    async MakeAuthorizationRequest(userID: string, payload: any | OAuthAuthorizationRequestT): Promise<Result<string>> {
       return new Promise(resolve => {
           const onSuccess = (res: (r:any) => void): (r: OAuthAuthorizationRequestT) => void => {
               return async (request: OAuthAuthorizationRequestT) => {
                   const token = Buffer.from(uuid.v4()).toString('base64')
                   request.user_id = userID

                   Cache.set(token, request, 60 * 10)
                       .then(set => {
                           if(!set) Logger.error(`unable to store oauth token in cache ${set}`)
                       })

                   res(Result.Success(token))
               }
           }

           pipe(oauthAuthorizationRequestT.decode(payload), fold(onDecodeError(resolve), onSuccess(resolve)))
       })
    }

    // exchanges a token for a JWT to act on behalf of the user
    async AuthorizationCodeExchange(exchangeReq: OAuthTokenExchangeT): Promise<Result<string>> {
        const originalReq = await Cache.get<OAuthAuthorizationRequestT>(exchangeReq.code)
        if(!originalReq) return new Promise(resolve => resolve(Result.Failure('unable to retrieve original request from cache')))

        const user = await UserStorage.Instance.Retrieve(originalReq.user_id!)
        if(user.isError) return new Promise(resolve => resolve(Result.Pass(user)))

        // quick verification between requests
        if(originalReq.redirect_uri !== exchangeReq.redirect_uri) return new Promise(resolve => resolve(Result.Failure('non-matching redirect uri')))
        if(originalReq.client_id !== exchangeReq.client_id) return new Promise(resolve => resolve(Result.Failure('non-matching client ids')))

        // if PKCE flow, verify the code
        if(exchangeReq.code_verifier) {
            if(originalReq.code_challenge_method === "S256") {
                const hash = base64url(crypto.createHash('sha256').update(exchangeReq.code_verifier).digest());

                if(hash !== decodeURIComponent(originalReq.code_challenge!)) return new Promise(resolve => resolve(Result.Failure('PKCE code challenge does not match')))

            } else {
                // for whatever reason we have to run the decode URI component twice on the original req, don't ask
                // why - just don't remove it or you'll break it
                if(exchangeReq.code_verifier !== decodeURIComponent(decodeURIComponent(originalReq.code_challenge!))) return new Promise(resolve => resolve(Result.Failure('PKCE code challenge does not match')))
            }
        } else { // if we're not doing PKCE there must be a client secret present
            const application = await OAuthApplicationStorage.Instance.Retrieve(exchangeReq.client_id)
            if(application.isError) return new Promise(resolve => resolve(Result.Pass(application)))

            const valid = await bcrypt.compare(exchangeReq.client_secret, application.value.client_secret!)

            if(!valid) return new Promise(resolve => resolve(Result.Failure('invalid client')))
        }

        // with all verification done generate and return a valid JWT after assigning user permissions
        const permissions = await RetrieveResourcePermissions(user.value.id!)
        user.value.permissions = permissions

        const token = jwt.sign(user.value, Config.encryption_key_secret, {expiresIn: '720m'})

        return new Promise(resolve => resolve(Result.Success(token)))
    }

    AuthorizationFromRequest(req: Request): OAuthAuthorizationRequestT | undefined {
        const r: {[key: string]: any} = {}

        // pull from query
        if(req.query.response_type) r.response_type = req.query.response_type as "code"
        if(req.query.client_id) r.client_id = req.query.client_id as string
        if(req.query.redirect_uri) r.redirect_uri = req.query.redirect_uri as string
        if(req.query.state) r.state = req.query.state as string
        if(req.query.scope) r.scope = req.query.scope as "all"
        if(req.query.code_challenge) {
            // we need to maintain the raw, unparsed query param
            // @ts-ignore
            const queryParams = req._parsedUrl.query
            queryParams.split('&').map((param: string) => {
                if(param.includes('code_challenge') && !param.includes('code_challenge_method')){
                    const codeChallenge = param.split("=")
                    r.code_challenge = codeChallenge[1]
                }
            })
        }
        if(req.query.code_challenge_method) r.code_challenge_method = req.query.code_challenge_method as "plain" | "S256"

        // pull from form
        if(req.body.response_type) r.response_type = req.body.response_type as "code"
        if(req.body.client_id) r.client_id = req.body.client_id as string
        if(req.body.redirect_uri) r.redirect_uri = req.body.redirect_uri as string
        if(req.body.state) r.state = req.body.state as string
        if(req.body.scope) r.scope = req.body.scope as "all"
        if(req.body.code_challenge) r.code_challenge = req.body.code_challenge as string
        if(req.body.code_challenge_method) r.code_challenge_method = req.body.code_challenge_method as "plain" | "S256"

        return (Object.keys(r).length > 0) ? r as OAuthAuthorizationRequestT : undefined
    }


    AuthorizationFromToken(token: string): Promise<OAuthAuthorizationRequestT | undefined> {
        return Cache.get<OAuthAuthorizationRequestT>(token)
    }
}
