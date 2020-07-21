import * as t from 'io-ts'

export const recordMetaT = t.partial({
    created_at: t.string,
    modified_at: t.string,
    created_by: t.string,
    modified_by: t.string
});

export type RecordMetaT = t.TypeOf<typeof recordMetaT>
