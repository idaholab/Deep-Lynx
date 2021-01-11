import * as t from 'io-ts'
import {DateFromISOString} from "io-ts-types/lib/DateFromISOString"

export const nodeRequired = t.type({
    metatype_id: t.string,
    properties: t.unknown
});

export const nodeOptional = t.partial({
    id: t.string,
    container_id: t.string,
    metatype_name: t.string,
    original_data_id: t.string, // we should always retain inserted data's original ID, for both back reference and bulk connection operations
    composite_original_id: t.string,
    import_data_id: t.string, // references a data record in imports
    data_staging_id: t.number, // references a data record in data_staging, which comes from when a user imports data
    data_source_id: t.string, // whenever possible you should include this property, this allows better separation and searching by source
    type_mapping_transformation_id:t.string,
    graph_id: t.string,
    archived: t.boolean,
    created_at: t.union([DateFromISOString, t.string]),
    modified_at: t.union([DateFromISOString, t.string]),
    deleted_at: t.union([DateFromISOString, t.string]),
});

export const nodeT = t.exact(t.intersection([nodeRequired, nodeOptional]));
export const nodesT = t.array(nodeT);

export type NodesT = t.TypeOf<typeof nodesT>
export type NodeT = t.TypeOf<typeof nodeT>
