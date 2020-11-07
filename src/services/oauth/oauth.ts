import {OAuthAuthorizationRequestT, oauthAuthorizationRequestT} from "../../types/user_management/oauth";
import uuid from "uuid"
import {pipe} from "fp-ts/pipeable";
import {fold} from "fp-ts/lib/Either";
import {onDecodeError} from "../../utilities";
import Cache from "../cache/cache"

export class OAuth {
    // AuthorizationRequest will make and store a request in cache for 10 minutes. It will
    // return a token which then must be used to exchange for the final access token
    async AuthorizationRequest(userID: string, payload: any | OAuthAuthorizationRequestT): Promise<string> {
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
}
