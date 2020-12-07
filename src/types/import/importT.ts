import * as t from 'io-ts'
import {DateFromISOString} from "io-ts-types/lib/DateFromISOString";
import {recordMetaT} from "../recordMetaT";

const importRequired = t.type({
    id:t.string,
    data_source_id:t.string,
    modified_at: t.union([DateFromISOString, t.string]),
    data_json: t.unknown,
    data_csv: t.unknown,
    status_message: t.string,
    status: t.keyof({
        "ready": null,
        "processing": null,
        "error": null,
        "stopped": null,
        "completed": null
    })
});

const importOptional = t.partial({
    reference: t.string,

    // composite properties
    total_records: t.number,
    records_inserted: t.number
})

export const importT = t.intersection([importRequired, importOptional, recordMetaT]);

export type ImportT = t.TypeOf<typeof importT>
