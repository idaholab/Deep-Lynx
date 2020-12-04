import Result from "../../result"
import PostgresStorage from "../postgresStorage";
import {QueryConfig} from "pg";
import PostgresAdapter from "../adapters/postgres/postgres";
import {dataSourceT, DataSourceT} from "../../types/import/dataSourceT";
import {typeTransformationT, TypeTransformationT} from "../../types/import/typeMappingT";

/*
* ImportAdapterStorage encompasses all logic dealing with the manipulation of the Import Adapter
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

    // Update partially updates the exports. This function will allow you to
    // rewrite foreign keys - this is by design. The storage layer is dumb, whatever
    // uses the storage layer should be what enforces user privileges etc.
    public async Update(id: string, userID: string, updatedField: {[key:string]: any}): Promise<Result<boolean>> {
        const toUpdate = await this.Retrieve(id);

        if(toUpdate.isError) {
            return new Promise(resolve => resolve(Result.Failure(toUpdate.error!.error)))
        }

        const updateStatement:string[] = [];
        const values:string[] = [];
        let i = 1;

        Object.keys(updatedField).map(k => {
            updateStatement.push(`${k} = $${i}`);
            values.push(updatedField[k]);
            i++
        });

        updateStatement.push(`modified_by = $${i}`);
        values.push(userID);

        return new Promise(resolve => {
            PostgresAdapter.Instance.Pool.query({
                text: `UPDATE data_type_mapping_transformations SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

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
            text:`INSERT INTO data_type_mapping_transformations(id,keys,type_mapping_id,conditions,metatype_id, metatype_relationship_pair_id,origin_id_key,destination_id_key,unique_identifier_key,on_conflict,created_by,modified_by,root_array) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            values: [tt.id,JSON.stringify(tt.keys),tt.type_mapping_id,JSON.stringify(tt.conditions),tt.metatype_id,tt.metatype_relationship_pair_id,tt.origin_id_key,tt.destination_id_key,tt.unique_identifier_key,tt.on_conflict,tt.created_by,tt.modified_by,tt.root_array]
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
                  WHERE id = $1`,
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
