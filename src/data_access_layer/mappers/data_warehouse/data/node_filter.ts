import Filter from "../../filter";
import NodeStorage from "./node_storage";
import {NodeT} from "../../../../types/graph/nodeT";
import Result from "../../../../result";

export default class NodeFilter extends Filter {
    constructor() {
        super(NodeStorage.tableName);
    }

    id(operator: string, value: any) {
        super.query("id", operator, value)
        return this
    }

    containerID(operator: string, value: any) {
        super.query("container_id", operator, value)
        return this
    }

    metatypeID(operator: string, value: any) {
        super.query("metatype_id", operator, value)
        return this
    }

    metatypeName(operator: string, value: any) {
        super.query("metatype_name", operator, value)
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

    importDataID(operator: string, value: any) {
        super.query("import_data_id", operator, value)
        return this
    }

    property(key: string, operator: string, value: any) {
        super.queryJsonb(key, "properties", operator, value)
        return this
    }

    all(limit?: number, offset?:number): Promise<Result<NodeT[]>> {
       return super.findAll<NodeT>(limit, offset);
    }
}
