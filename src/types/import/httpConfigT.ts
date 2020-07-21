import * as t from 'io-ts'

const httpConfigRequired = t.type({
   endpoint: t.string,
   data_type: t.keyof({
      "json": null,
      "csv": null
   }),
   auth_method: t.keyof({
      "none": null,
      "basic": null,
      "token": null
   })
});

const httpConfigOptional = t.partial({
   poll_interval: t.number,
   token: t.string,
   username: t.string,
   password: t.string
});

export const httpConfigT = t.exact(t.intersection([httpConfigRequired, httpConfigOptional]));

export type HttpConfigT = t.TypeOf<typeof httpConfigT>
