import Filter from "../filter";
import TypeMappingStorage from "./type_mapping_storage";
import Result from "../../result";
import {TypeMappingT} from "../../types/import/typeMappingT";

export default class TypeMappingFilter extends Filter {
    constructor() {
        super(TypeMappingStorage.tableName);
    }

    id(operator: string, value: any) {
        super.query("data_type_mappings.id", operator, value)
        return this
    }

    containerID(operator: string, value: any) {
        super.query("data_type_mappings.container_id", operator, value)
        return this
    }

    all(limit?: number, offset?:number): Promise<Result<TypeMappingT[]>> {
        return super.findAll<TypeMappingT>(limit, offset)
    }
}
