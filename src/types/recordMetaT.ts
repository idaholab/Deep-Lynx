import * as t from 'io-ts'
import {DateFromISOString} from "io-ts-types/lib/DateFromISOString"

export const recordMetaT = t.partial({
    created_at: t.union([DateFromISOString, t.string]),
    modified_at: t.union([DateFromISOString, t.string]),
    created_by: t.string,
    modified_by: t.string
});

export type RecordMetaT = t.TypeOf<typeof recordMetaT>
