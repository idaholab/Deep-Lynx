import * as t from 'io-ts'
import {DateFromISOString} from "io-ts-types/lib/DateFromISOString"

export const edgeRequired = t.type({
    relationship_pair_id: t.string,
    properties: t.unknown,
});

export const edgeOptional = t.partial({
    id: t.string,
    container_id: t.string,
    original_data_id: t.string, // we should always retain inserted data's original ID, for both back reference and bulk connection operations
    composite_original_id: t.string,
    import_data_id: t.string, // references a data record in imports
    data_staging_id: t.number, // references a data record in data_staging, which comes from when a user imports data
    data_source_id: t.string, // whenever possible you should include this property, this allows better separation and searching by source
    type_mapping_transformation_id:t.string,
    graph_id: t.string,
    archived: t.boolean,
    origin_node_id: t.string,
    destination_node_id: t.string,
    origin_node_original_id: t.string,
    destination_node_original_id: t.string,
    created_at: t.union([DateFromISOString, t.string]),
    modified_at: t.union([DateFromISOString, t.string]),
    deleted_at: t.union([DateFromISOString, t.string]),
});

export const edgeT = t.exact(t.intersection([edgeRequired, edgeOptional]));
export const edgesT = t.array(edgeT);

export type EdgesT = t.TypeOf<typeof edgesT>
export type EdgeT = t.TypeOf<typeof edgeT>
