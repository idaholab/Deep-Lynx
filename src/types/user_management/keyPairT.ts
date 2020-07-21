import * as t from 'io-ts'

export const keyPairRequired = t.type({
    key: t.string,
    secret: t.string,
    user_id: t.string,
})
export const keyPairOptional = t.partial({
    secret_raw: t.string
})

export const keyPairT = t.exact(t.intersection([keyPairRequired, keyPairOptional]))
export type KeyPairT = t.TypeOf<typeof keyPairT>;
