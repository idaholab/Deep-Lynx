import Filter from "../filter";
import NodeStorage from "./node_storage";
import {NodeT} from "../../types/graph/nodeT";
import Result from "../../result";

export default class NodeFilter extends Filter {
    constructor() {
        super(NodeStorage.tableName);
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

    all(limit?: number, offset?:number): Promise<Result<NodeT[]>> {
       return super.findAll<NodeT>(limit, offset);
    }
}
