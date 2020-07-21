import * as t from 'io-ts'
import {recordMetaT} from "../recordMetaT"

const dataSourceRequired = t.type({
    name: t.string,
    adapter_type: t.keyof({
        "http": null,
        "aveva": null,
        "manual": null
    }),
    active: t.boolean,
    config: t.unknown,
});

const dataSourceOptional = t.partial({
    container_id: t.string,
    id: t.string,
});

export const dataSourceT = t.exact(t.intersection([dataSourceRequired, dataSourceOptional, recordMetaT]));

export type DataSourceT = t.TypeOf<typeof dataSourceT>
