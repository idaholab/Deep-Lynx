import Filter from "../filter";
import Result from "../../result";
import EdgeStorage from "./edge_storage";
import {EdgeT} from "../../types/graph/edgeT";

export default class EdgeFilter extends Filter {
    constructor() {
        super(EdgeStorage.tableName);

        // we must include the joins for the relationship and relationship pair table
        // in order to be able to filter by relationship name
        this._rawQuery = []
        this._rawQuery.push(`SELECT edges.* FROM ${EdgeStorage.tableName}`)
        this._rawQuery.push(`LEFT JOIN metatype_relationship_pairs ON edges.relationship_pair_id = metatype_relationship_pairs.id`)
        this._rawQuery.push(`LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id`)
    }

    containerID(operator: string, value: any) {
        super.query("edges.container_id", operator, value)
        return this
    }

    relationshipPairID(operator: string, value: any) {
        super.query("edges.relationship_pair_id", operator, value)
        return this
    }

    relationshipName(operator: string, value: any) {
        super.query("metatype_relationships.name", operator, value)
        return this
    }

    originalDataID(operator: string, value: any) {
        super.query("edges.original_data_id", operator, value)
        return this
    }

    archived(operator: string, value: any) {
        super.query("edges.archived", operator, value)
        return this
    }

    dataSourceID(operator: string, value: any) {
        super.query("edges.data_source_id", operator, value)
        return this
    }

    property(key: string, operator: string, value: any) {
        super.queryJsonb(key, "edges.properties", operator, value)
        return this
    }

    origin_node_id(operator: string, value: any) {
        super.query("edges.origin_node_id", operator, value)
        return this
    }

    destination_node_id(operator: string, value: any) {
        super.query("edges.destination_node_id", operator, value)
        return this
    }

    origin_node_original_id(operator: string, value: any) {
        super.query("edges.origin_node_original_id", operator, value)
        return this
    }

    destination_node_original_id(operator: string, value: any) {
        super.query("edges.destination_node_original_id", operator, value)
        return this
    }

    importDataID(operator: string, value: any) {
        super.query("edges.import_data_id", operator, value)
        return this
    }

    async all(limit?: number, offset?:number): Promise<Result<EdgeT[]>> {
        const results = await super.findAll<EdgeT>(limit, offset);

        // reset the query
        this._rawQuery = []
        this._rawQuery.push(`SELECT edges.* FROM ${EdgeStorage.tableName}`)
        this._rawQuery.push(`LEFT JOIN metatype_relationship_pairs ON edges.relationship_pair_id = metatype_relationship_pairs.id`)
        this._rawQuery.push(`LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id`)

        return new Promise(resolve => resolve(results))
    }
}
