import * as t from 'io-ts'

const permission = t.string;

const session = t.type({
    user_id: t.string,
    permissions: t.array(permission)
});

export type SessionT = t.TypeOf<typeof session>
