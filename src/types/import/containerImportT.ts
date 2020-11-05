import * as t from 'io-ts'

const containerImportRequired = t.type({
    name: t.string,
});

const containerImportOptional = t.partial({
    description: t.string,
    path: t.string,
});

export const containerImportT = t.exact(t.intersection([containerImportRequired, containerImportOptional]));

export type ContainerImportT = t.TypeOf<typeof containerImportT>
