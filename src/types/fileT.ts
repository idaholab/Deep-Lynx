import * as t from 'io-ts'
import {recordMetaT} from "./recordMetaT";

const fileRequired = t.type({
    file_name: t.string,
    file_size: t.number,
    adapter_file_path: t.string,
    adapter: t.keyof({
        'aws_s3': null,
        'filesystem': null,
        'azure_blob': null
    }),
})

const fileOptional = t.partial({
    id: t.string,
    metadata: t.unknown,
    data_source_id: t.string,
})

export const fileT = t.intersection([fileRequired, fileOptional, recordMetaT])
export const filesT = t.array(fileT)

export type FileT = t.TypeOf<typeof fileT>
export type FilesT = t.TypeOf<typeof filesT>
