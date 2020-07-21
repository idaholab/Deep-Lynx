import * as t from 'io-ts'
import {recordMetaT} from "./recordMetaT";


const containerRequired = t.type({
    name: t.string,
    description: t.string,
});

const containerOptional= t.partial({
    id: t.string,
    archived: t.boolean,
});

export const containerT = t.exact(t.intersection([containerRequired, containerOptional, recordMetaT]));
export const containersT = t.array(containerT);

export type ContainerT = t.TypeOf<typeof containerT>
export type ContainersT = t.TypeOf<typeof containersT>
