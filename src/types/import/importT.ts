import * as t from 'io-ts'
import {DateFromISOString} from "io-ts-types/lib/DateFromISOString";
import {recordMetaT} from "../recordMetaT";

const importLogRequired = t.type({
    id:t.string,
    data_source_id:t.string,
    started_at:DateFromISOString,
    stopped_at:DateFromISOString,
    data_json: t.unknown,
    data_csv: t.unknown,
    errors: t.array(t.string)
});

const importLogOptional = t.type({
    reference: t.string
})

export const importT = t.intersection([importLogRequired, importLogOptional, recordMetaT]);

export type ImportT = t.TypeOf<typeof importT>
