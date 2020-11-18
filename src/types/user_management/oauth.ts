import * as t from 'io-ts'

const oauthAuthorizationRequestRequired = t.type({
   response_type: t.keyof({"code": null}),
   client_id: t.string,
   redirect_uri: t.string,
   state: t.string,
   scope: t.keyof({"all": null})
})

const oauthAuthorizationRequestOptional = t.partial({
    user_id: t.string,
    code_challenge: t.string,
    code_challenge_method: t.keyof({
      "plain": null,
      "S256": null
    })
})

const oauthTokenExchangeRequestRequired = t.type({
    grant_type: t.keyof({"authorization_code": null}),
    code: t.string,
    redirect_uri: t.string,
    client_id: t.string
})

const oauthTokenExchangeRequestOptional = t.partial({
   client_secret: t.string,
   code_verifier: t.string
})

export const oauthAuthorizationRequestT = t.exact(t.intersection([oauthAuthorizationRequestRequired, oauthAuthorizationRequestOptional]))
export type OAuthAuthorizationRequestT = t.TypeOf<typeof oauthAuthorizationRequestT>

export const oauthTokenExchangeT = t.exact(t.intersection([oauthTokenExchangeRequestRequired, oauthTokenExchangeRequestOptional]))
export type OAuthTokenExchangeT = t.TypeOf<typeof oauthTokenExchangeT>
