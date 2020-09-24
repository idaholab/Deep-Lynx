import MetatypeRelationshipPairStorage from "./metatype_relationship_pair_storage";
import Filter from "./filter";
import Result from "../result";
import {MetatypeRelationshipPairT} from "../types/metatype_relationship_pairT";

export default class MetatypeRelationshipPairFilter extends Filter {
    constructor() {
        super(MetatypeRelationshipPairStorage.tablename);
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

    origin_metatype_id(operator: string, value: any) {
        super.query("origin_metatype_id", operator, value)
        return this
    }

    destination_metatype_id(operator: string, value: any) {
        super.query("destination_metatype_id", operator, value)
        return this
    }

    relationship_id(operator: string, value: any) {
        super.query("relationship_id", operator, value)
        return this
    }

    relationship_type(operator: string, value: any) {
        super.query("relationship_type", operator, value)
        return this
    }

    all(limit?: number, offset?:number): Promise<Result<MetatypeRelationshipPairT[]>> {
        return super.findAll<MetatypeRelationshipPairT>(limit, offset)
    }
}
