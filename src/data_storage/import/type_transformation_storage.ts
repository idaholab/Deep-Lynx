import Result from "../../result"
import PostgresStorage from "../postgresStorage";
import {QueryConfig} from "pg";
import PostgresAdapter from "../adapters/postgres/postgres";
import {dataSourceT, DataSourceT} from "../../types/import/dataSourceT";
import {typeTransformationT, TypeTransformationT} from "../../types/import/typeMappingT";

/*
* TypeTransformationStorage encompasses all logic dealing with the manipulation of the Import Adapter
* class in a data storage layer.
*/
export default class TypeTransformationStorage extends PostgresStorage{
    public static tableName = "data_type_mapping_transformations";

    private static instance: TypeTransformationStorage;

    public static get Instance(): TypeTransformationStorage {
        if(!TypeTransformationStorage.instance) {
            TypeTransformationStorage.instance = new TypeTransformationStorage()
        }

        return TypeTransformationStorage.instance
    }

    // Create accepts a single object
    public async Create(typeMappingID:string, userID:string, input:any | TypeTransformationT): Promise<Result<TypeTransformationT>> {
        // onValidateSuccess is a callback that happens after the input has been
        // validated and confirmed to be of the Container(s) type
        const onValidateSuccess = ( resolve: (r:any) => void): (t: TypeTransformationT)=> void => {
            return async (tt:TypeTransformationT) => {
                tt.id = super.generateUUID();
                tt.type_mapping_id = typeMappingID
                tt.created_by = userID;
                tt.modified_by = userID;


                super.runAsTransaction(TypeTransformationStorage.createStatement(tt))
                    .then((r) => {
                        if(r.isError) {
                            resolve(r);
                            return
                        }

                        resolve(Result.Success(typeTransformationT.encode(tt)))
                    })
            }
        };

        return super.decodeAndValidate<TypeTransformationT>(typeTransformationT, onValidateSuccess, input)
    }

    public async Update(transformationID:string, userID:string, input:any | TypeTransformationT): Promise<Result<TypeTransformationT>> {
        // onValidateSuccess is a callback that happens after the input has been
        // validated and confirmed to be of the Container(s) type
        const onValidateSuccess = ( resolve: (r:any) => void): (t: TypeTransformationT)=> void => {
            return async (tt:TypeTransformationT) => {
                tt.modified_by = userID;

                if(tt.metatype_id === "") tt.metatype_id = undefined
                if(tt.metatype_relationship_pair_id === "") tt.metatype_relationship_pair_id = undefined


                super.runAsTransaction(TypeTransformationStorage.updateStatement(transformationID, tt))
                    .then((r) => {
                        if(r.isError) {
                            resolve(r);
                            return
                        }

                        resolve(Result.Success(typeTransformationT.encode(tt)))
                    })
            }
        };

        return super.decodeAndValidate<TypeTransformationT>(typeTransformationT, onValidateSuccess, input)
    }

    public Retrieve(id: string): Promise<Result<TypeTransformationT>> {
        return super.retrieve<TypeTransformationT>(TypeTransformationStorage.retrieveStatement(id))
    }

    public ListForTypeMapping(typeMappingID: string): Promise<Result<TypeTransformationT[]>> {
        return super.rows<TypeTransformationT>(TypeTransformationStorage.listByMapping(typeMappingID))
    }


    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(TypeTransformationStorage.deleteStatement(id))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(tt: TypeTransformationT): QueryConfig {
        return {
            text:`INSERT INTO data_type_mapping_transformations(id,keys,type_mapping_id,conditions,metatype_id, metatype_relationship_pair_id,origin_id_key,destination_id_key,unique_identifier_key,created_by,modified_by,root_array) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
            values: [tt.id,JSON.stringify(tt.keys),tt.type_mapping_id,JSON.stringify(tt.conditions),tt.metatype_id,tt.metatype_relationship_pair_id,tt.origin_id_key,tt.destination_id_key,tt.unique_identifier_key,tt.created_by,tt.modified_by,tt.root_array]
        }
    }

    private static updateStatement(id: string, tt: TypeTransformationT): QueryConfig {
        return {
            text:`UPDATE data_type_mapping_transformations SET keys = $1, conditions = $2,metatype_id = $3, metatype_relationship_pair_id = $4, origin_id_key = $5, destination_id_key = $6, unique_identifier_key = $7, modified_by = $8, root_array = $9 WHERE id = $10  `,
            values: [JSON.stringify(tt.keys),JSON.stringify(tt.conditions),tt.metatype_id,tt.metatype_relationship_pair_id,tt.origin_id_key,tt.destination_id_key,tt.unique_identifier_key,tt.modified_by,tt.root_array, id]
        }
    }

    private static retrieveStatement(transformationID:string): QueryConfig {
        return {
            text:`SELECT data_type_mapping_transformations.*,
                         metatypes.name as metatype_name,
                         metatype_relationship_pairs.name as metatype_relationship_pair_name
                  FROM data_type_mapping_transformations
                  LEFT JOIN metatypes ON data_type_mapping_transformations.metatype_id = metatypes.id
                  LEFT JOIN metatype_relationship_pairs ON data_type_mapping_transformations.metatype_relationship_pair_id = metatype_relationship_pairs.id
                  WHERE data_type_mapping_transformations.id = $1`,
            values: [transformationID]
        }
    }

    private static deleteStatement(exportID: string): QueryConfig {
        return {
            text:`DELETE FROM data_type_mapping_transformations WHERE id = $1`,
            values: [exportID]
        }
    }

    private static listByMapping(typeMappingID: string): QueryConfig {
        return {
            text: `SELECT data_type_mapping_transformations.*,
                          metatypes.name as metatype_name,
                          metatype_relationship_pairs.name as metatype_relationship_pair_name
                    FROM data_type_mapping_transformations
                    LEFT JOIN metatypes ON data_type_mapping_transformations.metatype_id = metatypes.id
                    LEFT JOIN metatype_relationship_pairs ON data_type_mapping_transformations.metatype_relationship_pair_id = metatype_relationship_pairs.id
                    WHERE type_mapping_id = $1`,
            values: [typeMappingID]
        }
    }
}
