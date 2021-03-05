import MetatypeRelationshipPairStorage from "./metatype_relationship_pair_storage";
import Filter from "./filter";
import Result from "../../result";
import {MetatypeRelationshipPairT} from "../../types/metatype_relationship_pairT";

export default class MetatypeRelationshipPairFilter extends Filter {
    constructor() {
        super(MetatypeRelationshipPairStorage.tableName);
        // in order to select the composite fields we must redo the initial query
        // to accept LEFT JOINs
        this._rawQuery = [
            `SELECT metatype_relationship_pairs.*, origin.name as origin_metatype_name , destination.name AS destination_metatype_name, relationships.name AS relationship_pair_name FROM ${MetatypeRelationshipPairStorage.tableName}`,
            `LEFT JOIN metatypes origin ON metatype_relationship_pairs.origin_metatype_id = origin.id`,
            `LEFT JOIN metatypes destination ON metatype_relationship_pairs.destination_metatype_id = destination.id`,
            `LEFT JOIN metatype_relationships relationships ON metatype_relationship_pairs.relationship_id = relationships.id`,
        ]
    }

    id(operator: string, value: any) {
        super.query("metatype_relationship_pairs.id", operator, value)
        return this
    }

    containerID(operator: string, value: any) {
        super.query("metatype_relationship_pairs.container_id", operator, value)
        return this
    }

    name(operator: string, value: any) {
        super.query("metatype_relationship_pairs.name", operator, value)
        return this
    }

    description(operator: string, value: any) {
        super.query("metatype_relationship_pairs.description", operator, value)
        return this
    }

    // metatypeID will search relationships by both origin and destination
    metatypeID(operator: string, value: any) {
        return this.origin_metatype_id(operator, value).or().destination_metatype_id(operator, value)
    }


    origin_metatype_id(operator: string, value: any) {
        super.query("metatype_relationship_pairs.origin_metatype_id", operator, value)
        return this
    }

    destination_metatype_id(operator: string, value: any) {
        super.query("metatype_relationship_pairs.destination_metatype_id", operator, value)
        return this
    }

    relationship_id(operator: string, value: any) {
        super.query("metatype_relationship_pairs.relationship_id", operator, value)
        return this
    }

    relationship_type(operator: string, value: any) {
        super.query("metatype_relationship_pairs.relationship_type", operator, value)
        return this
    }

    archived(operator: string, value: any) {
        super.query("metatype_relationship_pairs.archived", operator, value)
        return this
    }

    count(): Promise<Result<number>> {
        return super.count()
    }

    async all(limit?: number, offset?: number): Promise<Result<MetatypeRelationshipPairT[]>> {
        const result = await super.findAll<MetatypeRelationshipPairT>(limit, offset)

        // reset the query
        this._rawQuery = [
            `SELECT metatype_relationship_pairs.*, origin.name as origin_metatype_name , destination.name AS destination_metatype_name, relationships.name AS relationship_pair_name FROM ${MetatypeRelationshipPairStorage.tableName}`,
            `LEFT JOIN metatypes origin ON metatype_relationship_pairs.origin_metatype_id = origin.id`,
            `LEFT JOIN metatypes destination ON metatype_relationship_pairs.destination_metatype_id = destination.id`,
            `LEFT JOIN metatype_relationships relationships ON metatype_relationship_pairs.relationship_id = relationships.id`,
        ]

        return new Promise(resolve => resolve(result))
    }
}
