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

    public async Create(containerID:string, dataSourceID:string, shapeHash: string): Promise<Result<TypeMappingT>> {
        const t = {
            id: super.generateUUID(),
            container_id: containerID,
            data_source_id: dataSourceID,
            shape_hash: shapeHash,
            active: false
        }


        const r = await super.runAsTransaction(TypeMappingStorage.createStatement(t as TypeMappingT))
        if(r.isError) {
            return new Promise(resolve => resolve(Result.Pass(r)))
        }

        return new Promise(resolve => resolve(Result.Success(t as TypeMappingT)))
    }

    public Retrieve(id: string): Promise<Result<TypeMappingT>> {
        return super.retrieve<TypeMappingT>(TypeMappingStorage.retrieveStatement(id))
    }

    public List(containerID: string, offset: number, limit: number): Promise<Result<TypeMappingT[]>> {
        return super.rows<TypeMappingT>(TypeMappingStorage.listStatement(containerID, offset, limit))
    }

    public ListByDataSource(dataSourceID: string, offset: number, limit: number): Promise<Result<TypeMappingT[]>> {
        return super.rows<TypeMappingT>(TypeMappingStorage.listByDataSourceStatement(dataSourceID, offset, limit))
    }

    public SetActive(id: string): Promise<Result<boolean>> {
        return super.runAsTransaction(TypeMappingStorage.setActiveStatement(id))
    }

    public SetInActive(id: string): Promise<Result<boolean>> {
        return super.runAsTransaction(TypeMappingStorage.setInactiveStatement(id))
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
            text:`INSERT INTO data_type_mappings(id,container_id,data_source_id,shape_hash,active) VALUES($1,$2,$3,$4,$5)`,
            values: [imp.id,imp.container_id,imp.data_source_id,imp.shape_hash,imp.active]
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

    private static setActiveStatement(typeMappingID: string): QueryConfig {
        return {
            text: `UPDATE data_type_mappings SET active = true, modified_at = NOW() WHERE id = $1`,
            values: [typeMappingID]
        }
    }

    private static setInactiveStatement(typeMappingID: string): QueryConfig {
        return {
            text: `UPDATE data_type_mappings SET active = false, modified_at = NOW() WHERE id = $1`,
            values: [typeMappingID]
        }
    }
}
