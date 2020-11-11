import {Request} from "express"
import {OAuthAuthorizationRequestT, oauthAuthorizationRequestT} from "../../types/user_management/oauth";
import uuid from "uuid"
import {pipe} from "fp-ts/pipeable";
import {fold} from "fp-ts/lib/Either";
import {onDecodeError} from "../../utilities";
import Cache from "../cache/cache"

export class OAuth {
    // AuthorizationRequest will make and store a request in cache for 10 minutes. It will
    // return a token which then must be used to exchange for the final access token
    async MakeAuthorizationRequest(userID: string, payload: any | OAuthAuthorizationRequestT): Promise<string> {
       return new Promise(resolve => {
           const onSuccess = (res: (r:any) => void): (r: OAuthAuthorizationRequestT) => void => {
               return async (request: OAuthAuthorizationRequestT) => {
                   const token = Buffer.from(uuid.v4()).toString('base64')
                   request.user_id = userID

                   Cache.set(token, request, 60 * 10)

                   res(token)
               }
           }

           pipe(oauthAuthorizationRequestT.decode(payload), fold(onDecodeError(resolve), onSuccess(resolve)))
       })
    }

    AuthorizationCodeExchange(): string {
        return "token"
    }

    FromRequest(req: Request): OAuthAuthorizationRequestT | undefined {
        const r: {[key: string]: any} = {}

        // pull from query
        if(req.query.response_type) r.response_type = req.query.response_type as "code"
        if(req.query.client_id) r.client_id = req.query.client_id as string
        if(req.query.redirect_uri) r.redirect_uri = req.query.redirect_uri as string
        if(req.query.state) r.state = req.query.state as string
        if(req.query.scope) r.scope = req.query.scope as "all"
        if(req.query.code_challenge) r.code_challenge = req.query.code_challenge as string
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
}


