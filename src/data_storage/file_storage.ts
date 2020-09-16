import {FileT, fileT} from "../types/fileT"
import Result from "../result"
import PostgresStorage from "./postgresStorage";
import { QueryConfig} from "pg";
import PostgresAdapter from "./adapters/postgres/postgres";

/*
* FileStore encompasses all logic dealing with the manipulation of the
* FileT class in a data storage layer.
*/
export default class FileStorage extends PostgresStorage{
    public static tableName = "files";

    private static instance: FileStorage;

    public static get Instance(): FileStorage {
        if(!FileStorage.instance) {
            FileStorage.instance = new FileStorage()
        }

        return FileStorage.instance
    }

    // Create accepts a single object, or array of objects. The function will validate
    // if those objects are a valid type and will return a detailed error message
    // if not.
    public async Create(userID:string, containerID:string, dataSourceID:string, input:any | FileT, preQueries?:QueryConfig[], postQueries?:QueryConfig[]): Promise<Result<FileT>> {
        // onValidateSuccess is a callback that happens after the input has been
        // validated and confirmed to be of the Container(s) type
           const onValidateSuccess = ( resolve: (r:any) => void): (c: FileT)=> void => {
               return async (cs:FileT) => {
                   const queries: QueryConfig[] = [];

                   if(preQueries) queries.push(...preQueries);

                   cs.id = super.generateUUID();
                   cs.container_id = containerID
                   cs.data_source_id = dataSourceID
                   cs.created_by = userID;
                   cs.modified_by = userID;

                   queries.push(...FileStorage.createStatement(cs))

                   if (postQueries) queries.push(...postQueries);

                   super.runAsTransaction(...queries)
                       .then((r) => {
                          if(r.isError) {
                              resolve(r);
                              return
                          }

                          resolve(Result.Success(fileT.encode(cs)))
                       })
               }
           };


           return super.decodeAndValidate<FileT>(fileT, onValidateSuccess, input)
    }

    public async Retrieve(id:string): Promise<Result<FileT>>{
        return super.retrieve<FileT>(FileStorage.retrieveStatement(id))
    }

    public async DomainRetrieve(id:string, containerID: string): Promise<Result<FileT>>{
        return super.retrieve<FileT>(FileStorage.domainRetrieveStatement(id, containerID))
    }

    // Update partially updates the File. This function will allow you to
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
                text: `UPDATE files SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    public async ListFromIDS(ids: string[]): Promise<Result<FileT[]>> {
        return super.rows<FileT>(FileStorage.listFromIDsStatement(ids))
    }

    public async List(containerID: string, offset: number, limit: number): Promise<Result<FileT[]>> {
        return super.rows<FileT>(FileStorage.listStatement(containerID, offset, limit))
    }

    public async PermanentlyDelete(containerID: string): Promise<Result<boolean>> {
        return super.run(FileStorage.deleteStatement(containerID))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(file: FileT): QueryConfig[] {
        return [{
           text:`INSERT INTO files(id,container_id,file_name,file_size,adapter_file_path,adapter,metadata,data_source_id,created_by,modified_by) VALUES($1, $2, $3, $4,$5,$6,$7,$8,$9,$10)`,
           values: [file.id,file.container_id,file.file_name,file.file_size,file.adapter_file_path,file.adapter,JSON.stringify(file.metadata),file.data_source_id,file.created_by,file.modified_by]
            }
          ]
    }

    private static deleteStatement(containerID: string): QueryConfig {
        return {
            text:`DELETE FROM files WHERE id = $1`,
            values: [containerID]
        }
    }

    private static retrieveStatement(id:string): QueryConfig {
        return {
            text:`SELECT * FROM files WHERE id = $1`,
            values: [id]
        }
    }

    private static domainRetrieveStatement(id:string, containerID: string): QueryConfig {
        return {
            text:`SELECT * FROM files WHERE id = $1 AND container_id = $2`,
            values: [id, containerID]
        }
    }

    private static listFromIDsStatement(ids: string[]): QueryConfig {
        // have to add the quotations in order for postgres to treat the uuid correctly
        ids.map(id => `'${id}'`)

        return {
           text: `SELECT * FROM files WHERE id IN($1)`,
           values: ids
       }
    }

    private static listStatement(containerID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT * FROM files WHERE container_id = $1 OFFSET $2 LIMIT $3`,
            values: [containerID, offset, limit]
        }
    }
}
