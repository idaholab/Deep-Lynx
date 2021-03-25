import Result from "../../../../common_classes/result"
import Mapper from "../../mapper";
import {PoolClient, QueryConfig} from "pg";
import TypeTransformation from "../../../../data_warehouse/etl/type_transformation";
import uuid from "uuid";


const format = require('pg-format')
const resultClass = TypeTransformation

/*
* TypeTransformationMapper encompasses all logic dealing with the manipulation of the Import Adapter
* class in a data storage layer.
*/
export default class TypeTransformationMapper extends Mapper{
    public static tableName = "data_type_mapping_transformations";

    private static instance: TypeTransformationMapper;

    public static get Instance(): TypeTransformationMapper {
        if(!TypeTransformationMapper.instance) {
            TypeTransformationMapper.instance = new TypeTransformationMapper()
        }

        return TypeTransformationMapper.instance
    }

    public async Create(userID: string, t: TypeTransformation, transaction?: PoolClient): Promise<Result<TypeTransformation>> {
        const r = await super.run(this.createStatement(userID, t), {transaction, resultClass})
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public async BulkCreate(userID: string, t: TypeTransformation[], transaction?: PoolClient): Promise<Result<TypeTransformation[]>> {
        return super.run(this.createStatement(userID, ...t), {transaction, resultClass})
    }

    public async Update(userID: string, t: TypeTransformation, transaction?: PoolClient): Promise<Result<TypeTransformation>> {
        const r = await super.run(this.fullUpdateStatement(userID, t), {transaction, resultClass})
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public async BulkUpdate(userID: string, t: TypeTransformation[], transaction?: PoolClient): Promise<Result<TypeTransformation[]>> {
        return super.run(this.fullUpdateStatement(userID, ...t), {transaction, resultClass})
    }

    public async Retrieve(id: string): Promise<Result<TypeTransformation>> {
       return super.retrieve<TypeTransformation>(this.retrieveStatement(id), {resultClass})
    }

    public async ListForTypeMapping(typeMappingID: string): Promise<Result<TypeTransformation[]>> {
        return super.rows<TypeTransformation>(this.listByMapping(typeMappingID), {resultClass})
    }

    public async BulkDelete(transformations: TypeTransformation[], transaction?: PoolClient) : Promise<Result<boolean>> {
        return super.runStatement(this.bulkDeleteStatement(transformations), {transaction})
    }

    public async PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...t: TypeTransformation[]): string{
        const text = `WITH ins as(INSERT INTO data_type_mapping_transformations(
            id,
            keys,
            type_mapping_id,
            conditions,
            metatype_id,
            metatype_relationship_pair_id,
            origin_id_key,
            destination_id_key,
            unique_identifier_key,
            root_array,
            created_by,
            modified_by) VALUES %L RETURNING *)

        SELECT ins.*,
               mapping.container_id AS container_id,
               mapping.data_source_id as data_source_id,
               mapping.shape_hash as shape_hash,
               metatypes.name as metatype_name,
               metatype_relationship_pairs.name as metatype_relationship_pair_name
        FROM ins
            LEFT JOIN data_type_mappings as mapping ON ins.type_mapping_id = mapping.id
                 LEFT JOIN metatypes ON ins.metatype_id = metatypes.id
                 LEFT JOIN metatype_relationship_pairs ON ins.metatype_relationship_pair_id = metatype_relationship_pairs.id
        `
        const values = t.map(tt => [
            uuid.v4(),
            JSON.stringify(tt.keys),
            tt.type_mapping_id,
            JSON.stringify(tt.conditions),
            (tt.metatype_id === "") ? undefined : tt.metatype_id,
            (tt.metatype_relationship_pair_id === "") ? undefined : tt.metatype_relationship_pair_id,
            tt.origin_id_key,
            tt.destination_id_key,
            tt.unique_identifier_key,
            tt.root_array,
            userID, userID])

        return format(text, values)
    }

    private fullUpdateStatement(userID: string, ...t: TypeTransformation[]): string{
        const text = `WITH ins as(UPDATE data_type_mapping_transformations as t SET
            keys = u.keys::jsonb,
            type_mapping_id = u.type_mapping_id::uuid,
            conditions = u.conditions::jsonb,
            metatype_id = u.metatype_id::uuid,
            metatype_relationship_pair_id = u.metatype_relationship_pair_id::uuid,
            origin_id_key = u.origin_id_key,
            destination_id_key = u.destination_id_key,
            unique_identifier_key = u.unique_identifier_key,
            root_array = u.root_array,
            modified_by = u.modified_by
            modified_at = NOW()
            FROM (VALUES %L) as u(
                            id,
                            keys,
                            type_mapping_id,
                            conditions,
                            metatype_id,
                            metatype_relationship_pair_id,
                            origin_id_key,
                            destination_id_key,
                            unique_identifier_key,
                            root_array,
                            modified_by
                          ) WHERE u.id::uuid = t.id RETURNING t.*)

        SELECT ins.*,
               mapping.container_id AS container_id,
               mapping.data_source_id as data_source_id,
               mapping.shape_hash as shape_hash,
               metatypes.name as metatype_name,
               metatype_relationship_pairs.name as metatype_relationship_pair_name
        FROM
                 LEFT JOIN data_type_mappings as mapping ON ins.type_mapping_id = mapping.id
                 LEFT JOIN metatypes ON ins.metatype_id = metatypes.id
                 LEFT JOIN metatype_relationship_pairs ON ins.metatype_relationship_pair_id = metatype_relationship_pairs.id`
        const values = t.map(tt => [
            tt.id,
            JSON.stringify(tt.keys),
            tt.type_mapping_id,
            JSON.stringify(tt.conditions),
            (tt.metatype_id === "") ? undefined : tt.metatype_id,
            (tt.metatype_relationship_pair_id === "") ? undefined : tt.metatype_relationship_pair_id,
            tt.origin_id_key,
            tt.destination_id_key,
            tt.unique_identifier_key,
            tt.root_array,
            userID, userID])

        return format(text, values)
    }
    private retrieveStatement(transformationID:string): QueryConfig {
        return {
            text:`SELECT data_type_mapping_transformations.*,
                         metatypes.name as metatype_name,
                         metatype_relationship_pairs.name as metatype_relationship_pair_name,
                         mapping.container_id AS container_id,
                         mapping.shape_hash as shape_hash,
                         mapping.data_source_id as data_source_id
                  FROM data_type_mapping_transformations
                           LEFT JOIN data_type_mappings as mapping ON data_type_mapping_transformations.type_mapping_id = mapping.id
                           LEFT JOIN metatypes ON data_type_mapping_transformations.metatype_id = metatypes.id
                           LEFT JOIN metatype_relationship_pairs ON data_type_mapping_transformations.metatype_relationship_pair_id = metatype_relationship_pairs.id
                  WHERE data_type_mapping_transformations.id = $1`,
            values: [transformationID]
        }
    }

    private deleteStatement(exportID: string): QueryConfig {
        return {
            text:`DELETE FROM data_type_mapping_transformations WHERE id = $1`,
            values: [exportID]
        }
    }

    private bulkDeleteStatement(transformations: TypeTransformation[]): string {
        const text = `DELETE FROM data_type_mapping_transformations WHERE id IN(%L)`
        const values = transformations.filter(t => t.id).map(t => t.id as string)

        return format(text, values)
    }

    private listByMapping(typeMappingID: string): QueryConfig {
        return {
            text: `SELECT data_type_mapping_transformations.*,
                          metatypes.name as metatype_name,
                          metatype_relationship_pairs.name as metatype_relationship_pair_name,
                          mapping.container_id AS container_id,
                          mapping.shape_hash as shape_hash,
                          mapping.data_source_id as data_source_id
                   FROM data_type_mapping_transformations
                            LEFT JOIN data_type_mappings as mapping ON data_type_mapping_transformations.type_mapping_id = mapping.id
                            LEFT JOIN metatypes ON data_type_mapping_transformations.metatype_id = metatypes.id
                            LEFT JOIN metatype_relationship_pairs ON data_type_mapping_transformations.metatype_relationship_pair_id = metatype_relationship_pairs.id
                   WHERE type_mapping_id = $1`,
            values: [typeMappingID]
        }
    }
}
