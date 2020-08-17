import Filter from "../filter";
import NodeStorage from "./node_storage";
import {NodeT} from "../../types/graph/nodeT";
import Result from "../../result";

export default class NodeFilter extends Filter {
    constructor() {
        super(NodeStorage.tableName);
    }

    metatypeID(operator: string, value: any) {
        super.query("metatype_id", operator, value)
        return this
    }

    all(): Promise<Result<NodeT[]>> {
       return super.findAll<NodeT>();
    }
}
