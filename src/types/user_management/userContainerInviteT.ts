import * as t from 'io-ts'
import {DateFromISOString} from "io-ts-types";

const userContainerInviteRequired = t.type({
    email: t.string,
})

export const userContainerInviteOptional = t.partial({
    id: t.number,
    origin_user: t.string,
    token: t.string,
    container_id: t.string,
    issued: t.union([DateFromISOString, t.string])
})

export const userContainerInviteT = t.exact(t.intersection([userContainerInviteRequired, userContainerInviteOptional]))
export type UserContainerInviteT = t.TypeOf<typeof userContainerInviteT>
