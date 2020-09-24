import Filter from "../filter";
import TypeMappingStorage from "./type_mapping_storage";
import Result from "../../result";
import {TypeMappingT} from "../../types/import/typeMappingT";

export default class TypeMappingFilter extends Filter {
    constructor() {
        // have to call super, but we immediately redo it
        super(TypeMappingStorage.tableName);

        // in order to select the metatype_name we must redo the initial query to accept
        // a LEFT JOIN
        this._rawQuery = [
            `SELECT data_type_mappings.*, metatypes.name as metatype_name, metatype_relationship_pairs.name AS metatype_relationship_pair_name FROM ${TypeMappingStorage.tableName}`,
            `LEFT JOIN metatypes ON data_type_mappings.metatype_id = metatypes.id`,
            `LEFT JOIN metatype_relationship_pairs ON data_type_mappings.metatype_relationship_pair_id = metatype_relationship_pairs.id`
        ]
    }

    id(operator: string, value: any) {
        super.query("data_type_mappings.id", operator, value)
        return this
    }

    containerID(operator: string, value: any) {
        super.query("data_type_mappings.container_id", operator, value)
        return this
    }

    metatype_id(operator: string, value: any) {
        super.query("data_type_mappings.metatype_id", operator, value)
        return this
    }

    all(limit?: number, offset?:number): Promise<Result<TypeMappingT[]>> {
        return super.findAll<TypeMappingT>(limit, offset)
    }
}
