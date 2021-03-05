import Filter from "./filter";
import Result from "../../result";
import MetatypeRelationshipStorage from "./metatype_relationship_storage";
import {MetatypeRelationshipT} from "../../types/metatype_relationshipT";

export default class MetatypeRelationshipFilter extends Filter {
    constructor() {
        super(MetatypeRelationshipStorage.tableName);
    }

    id(operator: string, value: any) {
        super.query("id", operator, value)
        return this
    }

    containerID(operator: string, value: any) {
        super.query("container_id", operator, value)
        return this
    }

    name(operator: string, value: any) {
        super.query("name", operator, value)
        return this
    }

    description(operator: string, value: any) {
        super.query("description", operator, value)
        return this
    }

    archived(operator: string, value: any) {
        super.query("archived", operator, value)
        return this
    }

    count(): Promise<Result<number>> {
        return super.count()
    }

    all(limit?: number, offset?:number, sortBy?: string, sortDesc?: boolean): Promise<Result<MetatypeRelationshipT[]>> {
        return super.findAll<MetatypeRelationshipT>(limit, offset, sortBy, sortDesc)
    }
}
