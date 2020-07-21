import * as t from 'io-ts'

export const manualConfigT = t.exact(t.type({
   data_type: t.keyof({
      "json": null,
      "csv": null
   }),
}));

export type ManualConfigT = t.TypeOf<typeof manualConfigT>
