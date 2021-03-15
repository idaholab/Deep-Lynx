import Filter from "../../filter";
import TypeMappingStorage from "./type_mapping_storage";
import Result from "../../../../result";
import {TypeMappingT} from "../../../../types/import/typeMappingT";

export default class TypeMappingFilter extends Filter {
    constructor() {
        super(TypeMappingStorage.tableName);

        // in order to search based on the name of resulting metatype/metatype relationships
        // we must create a series of joins
        this._rawQuery = [
            'SELECT DISTINCT ON (data_type_mappings.id) data_type_mappings.*, metatypes.name as resulting_metatype_name, metatype_relationships.name as resulting_metatype_relationship_name FROM data_type_mappings',
            'LEFT JOIN data_type_mapping_transformations ON data_type_mappings.id = data_type_mapping_transformations.type_mapping_id',
            'LEFT JOIN metatypes ON data_type_mapping_transformations.metatype_id = metatypes.id',
            'LEFT JOIN metatype_relationship_pairs on data_type_mapping_transformations.metatype_relationship_pair_id = metatype_relationship_pairs.id',
            'LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id '
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

    dataSourceID(operator: string, value: any) {
        super.query("data_type_mappings.data_source_id", operator, value)
        return this
    }

    resultingMetatypeName(operator: string, value: any) {
        super.query("metatypes.name", operator, value)
        return this
    }

    resultingMetatypeRelationshipName(operator: string, value: any) {
        super.query("metatype_relationships.name", operator, value)
        return this
    }

    all(limit?: number, offset?:number): Promise<Result<TypeMappingT[]>> {
        const results = super.findAll<TypeMappingT>(limit, offset)

        // reset the query
        this._rawQuery = [
            'SELECT DISTINCT ON (data_type_mappings.id) data_type_mappings.*, metatypes.name as resulting_metatype_name, metatype_relationships.name as resulting_metatype_relationship_name FROM data_type_mappings',
            'LEFT JOIN data_type_mapping_transformations ON data_type_mappings.id = data_type_mapping_transformations.type_mapping_id',
            'LEFT JOIN metatypes ON data_type_mapping_transformations.metatype_id = metatypes.id',
            'LEFT JOIN metatype_relationship_pairs on data_type_mapping_transformations.metatype_relationship_pair_id = metatype_relationship_pairs.id',
            'LEFT JOIN metatype_relationships ON metatype_relationship_pairs.relationship_id = metatype_relationships.id '
        ]

        return new Promise(resolve => resolve(results))
    }
}
