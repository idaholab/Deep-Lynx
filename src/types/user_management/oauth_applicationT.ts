import * as t from 'io-ts'
import {recordMetaT} from "../recordMetaT";

const oauthApplicationRequired = t.type({
   name: t.string,
   description: t.string,
})

const oauthApplicationOptional = t.partial({
   id: t.string,
   owner_id: t.string, // user ID
   client_id: t.string,
   client_secret: t.string,
   client_secret_raw: t.string // for the initial secret return
})

export const oauthApplicationT = t.exact(t.intersection([oauthApplicationRequired, oauthApplicationOptional, recordMetaT]))
export type OauthApplicationT = t.TypeOf<typeof oauthApplicationT>
