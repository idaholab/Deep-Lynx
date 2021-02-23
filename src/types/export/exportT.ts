import * as t from 'io-ts'
import {recordMetaT} from "../recordMetaT";

export const exportRequired = t.type({
    adapter: t.keyof({
        "gremlin": null
    }),
    config: t.unknown
});

export const exportOptional = t.partial({
    container_id: t.string,
    destination_type: t.string,
    status: t.keyof({
        "created": null,
        "processing": null,
        "paused": null,
        "completed": null,
        "failed": null
    }),
    status_message: t.string,
    id: t.string,
});

export const exportT = t.exact(t.intersection([exportRequired, exportOptional, recordMetaT]));

export type ExportT = t.TypeOf<typeof exportT>
