import * as t from 'io-ts'

export const eventTypeT = t.type({
    type: t.keyof({
      'data imported': null,
      'data ingested': null,
      'type mapping created': null,
      'type mapping modified': null,
      'file created': null,
      'file modified': null,
      'data source created': null,
      'data source modified': null,
      'data exported': null,
    })
});

export type EventTypeT = t.TypeOf<typeof eventTypeT>