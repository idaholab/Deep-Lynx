import * as t from 'io-ts'
import {recordMetaT} from "../recordMetaT";
import uuid from "uuid";

export const userRequired = t.type({
    identity_provider: t.keyof({
        saml_adfs: null,
        username_password: null,
    }),
    display_name: t.string,
    email: t.string,
});

export const userOptional = t.partial({
    id: t.string,
    identity_provider_id: t.string,
    password: t.string,
    admin: t.boolean,
    active: t.boolean,
    reset_required: t.boolean,
    reset_token: t.string,
    email_valid: t.boolean,
    email_validation_token: t.string,
    permissions: t.array(t.array(t.string))
});

export const newUserPayloadT = t.type({
    identity_provider: t.keyof({
        username_password: null,
    }),
    display_name: t.string,
    email: t.string,
    password: t.string
})

export const resetPasswordPayload = t.type({
    email: t.string,
    token: t.string,
    new_password: t.string
})

export const userT = t.intersection([userRequired, userOptional, recordMetaT]);
export type UserT = t.TypeOf<typeof userT>
export type NewUserPayloadT = t.TypeOf<typeof newUserPayloadT>
export type ResetPasswordPayloadT = t.TypeOf<typeof resetPasswordPayload>

// SuperUser should be used for methods like Basic Authentication where no user
// is registered but you still need access to functionality behind access control
export function SuperUser(): UserT {
    return {
       id: uuid.v4(),
       identity_provider: "username_password",
       identity_provider_id: "",
       display_name: "Admin",
       email: "",
       active: true,
       admin:true,
    }
}

export function isUserT(user: UserT | any): user is UserT {
    return (user as UserT).admin !== undefined
}
