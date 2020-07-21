import * as t from 'io-ts'
import {DateFromISOString} from "io-ts-types/lib/DateFromISOString";

export const dataStagingT = t.type({
    id: t.number,
    data_source_id: t.string,
    import_id: t.string,
    mapping_id: t.string,
    errors: t.array(t.string),
    data: t.unknown,
    inserted_at: DateFromISOString,
    created_at: DateFromISOString
})

export type DataStagingT = t.TypeOf<typeof dataStagingT>
