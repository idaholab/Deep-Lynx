import * as t from 'io-ts'

export const assignRolePayloadT = t.type({
    user_id: t.string,
    container_id: t.string,
    role_name: t.keyof({
        editor: null,
        user: null,
        admin: null})
});

export type AssignRolePayloadT = t.TypeOf<typeof assignRolePayloadT>
