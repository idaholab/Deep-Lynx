import Result from "../../result"
import PostgresStorage from "../postgresStorage";
import {QueryConfig} from "pg";
import PostgresAdapter from "../adapters/postgres/postgres";
import {TypeMappingT, typeMappingT} from "../../types/import/typeMappingT";

/*
* ImportAdapterStorage encompasses all logic dealing with the manipulation of the Import Adapter
* class in a data storage layer.
*/
export default class TypeMappingStorage extends PostgresStorage{
    public static tableName = "data_type_mappings";

    private static instance: TypeMappingStorage;

    public static get Instance(): TypeMappingStorage {
        if(!TypeMappingStorage.instance) {
            TypeMappingStorage.instance = new TypeMappingStorage()
        }

        return TypeMappingStorage.instance
    }

    // Create accepts a single object
    public async Create(containerID:string, dataSourceID:string, userID:string, input:any | TypeMappingT): Promise<Result<TypeMappingT>> {
        // onValidateSuccess is a callback that happens after the input has been
        // validated and confirmed to be of the Container(s) type
        const onValidateSuccess = ( resolve: (r:any) => void): (tm: TypeMappingT)=> void => {
            return async (t:TypeMappingT) => {
                t.id = super.generateUUID();
                t.container_id = containerID;
                t.data_source_id = dataSourceID;
                t.created_by = userID;
                t.modified_by = userID;


                super.runAsTransaction(TypeMappingStorage.createStatement(t))
                    .then((r) => {
                        if(r.isError) {
                            resolve(r);
                            return
                        }

                        resolve(Result.Success(typeMappingT.encode(t)))
                    })
            }
        };

        return super.decodeAndValidate<TypeMappingT>(typeMappingT, onValidateSuccess, input)
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
                text: `UPDATE data_type_mappings SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    public Retrieve(id: string): Promise<Result<TypeMappingT>> {
        return super.retrieve<TypeMappingT>(TypeMappingStorage.retrieveStatement(id))
    }

    // runs a stored procedure which will update data in data staging with type mappings if any match
    public SetAllTypeMappings(): Promise<Result<boolean>> {
        return super.run(TypeMappingStorage.setTypeMappingProcedureStatement())
    }

    public List(containerID: string, offset: number, limit: number): Promise<Result<TypeMappingT[]>> {
        return super.rows<TypeMappingT>(TypeMappingStorage.listStatement(containerID, offset, limit))
    }

    public ListByDataSource(dataSourceID: string, offset: number, limit: number): Promise<Result<TypeMappingT[]>> {
        return super.rows<TypeMappingT>(TypeMappingStorage.listByDataSourceStatement(dataSourceID, offset, limit))
    }


    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(TypeMappingStorage.deleteStatement(id))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(imp: TypeMappingT): QueryConfig {
        return {
            text:`INSERT INTO data_type_mappings(id,container_id,data_source_id,type_key,type_value,unique_identifier_key,metatype_id,metatype_relationship_pair_id,origin_key,destination_key,keys,ignored_keys,example_payload,action_key,action_value,relationship_type_key, relationship_type_value,created_by,modified_by) VALUES($1, $2, $3, $4, $5, $6, $7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
            values: [imp.id, imp.container_id,imp.data_source_id, imp.type_key, imp.type_value,imp.unique_identifier_key,imp.metatype_id,imp.metatype_relationship_pair_id, imp.origin_key, imp.destination_key,JSON.stringify(imp.keys),imp.ignored_keys,imp.example_payload,imp.action_key,imp.action_value,imp.relationship_type_key, imp.relationship_type_value, imp.created_by,imp.modified_by]
        }
    }

    private static retrieveStatement(exportID:string): QueryConfig {
        return {
            text:`SELECT * FROM data_type_mappings WHERE id = $1`,
            values: [exportID]
        }
    }

    private static deleteStatement(exportID: string): QueryConfig {
        return {
            text:`DELETE FROM data_type_mappings WHERE id = $1`,
            values: [exportID]
        }
    }

    private static listStatement(containerID:string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM data_type_mappings WHERE container_id = $1 OFFSET $2 LIMIT $3`,
            values: [containerID, offset, limit]
        }
    }

    private static listByDataSourceStatement(dataSourceID:string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM data_type_mappings WHERE data_source_id = $1 OFFSET $2 LIMIT $3`,
            values: [dataSourceID, offset, limit]
        }
    }

    private static setTypeMappingProcedureStatement(): QueryConfig {
        return {
            text: `SELECT set_type_mapping(data_type_mappings) from data_type_mappings`
        }
    }
}
