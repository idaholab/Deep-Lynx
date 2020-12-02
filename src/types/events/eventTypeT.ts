import * as t from 'io-ts'

export const eventTypeT = t.type({
    type: t.keyof({
      'data_imported': null,
      'data_ingested': null,
      'type_mapping_created': null,
      'type_mapping_modified': null,
      'file_created': null,
      'file_modified': null,
      'data_source_created': null,
      'data_source_modified': null,
      'data_exported': null,
    })
});

export type EventTypeT = t.TypeOf<typeof eventTypeT>