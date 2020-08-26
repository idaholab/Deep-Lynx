import Filter from "../filter";
import Result from "../../result";
import EdgeStorage from "./edge_storage";
import {EdgeT} from "../../types/graph/edgeT";

export default class EdgeFilter extends Filter {
    constructor() {
        super(EdgeStorage.tableName);
    }

    containerID(operator: string, value: any) {
        super.query("container_id", operator, value)
        return this
    }

    relationshipPairID(operator: string, value: any) {
        super.query("relationship_pair_id", operator, value)
        return this
    }


    originalDataID(operator: string, value: any) {
        super.query("original_data_id", operator, value)
        return this
    }

    archived(operator: string, value: any) {
        super.query("archived", operator, value)
        return this
    }

    dataSourceID(operator: string, value: any) {
        super.query("data_source_id", operator, value)
        return this
    }

    property(key: string, operator: string, value: any) {
        super.queryJsonb(key, "properties", operator, value)
        return this
    }

    origin_node_id(operator: string, value: any) {
        super.query("origin_node_id", operator, value)
        return this
    }

    destination_node_id(operator: string, value: any) {
        super.query("destination_node_id", operator, value)
        return this
    }

    origin_node_original_id(operator: string, value: any) {
        super.query("origin_node_original_id", operator, value)
        return this
    }

    destination_node_original_id(operator: string, value: any) {
        super.query("destination_node_original_id", operator, value)
        return this
    }

    all(limit?: number, offset?:number): Promise<Result<EdgeT[]>> {
        return super.findAll<EdgeT>(limit, offset);
    }
}
