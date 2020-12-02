import Result from "../../result"
import PostgresStorage from "../postgresStorage";
import {QueryConfig} from "pg";
import {exportT, ExportT} from "../../types/export/exportT";
import PostgresAdapter from "../adapters/postgres/postgres";
import {QueueProcessor} from "../../services/event_system/events";
import {EventT} from "../../types/events/eventT";

/*
* ExportStorage encompasses all logic dealing with the manipulation of the Export
* class in a data storage layer.
*/
export default class ExportStorage extends PostgresStorage{
    public static tableName = "exports";

    private static instance: ExportStorage;

    public static get Instance(): ExportStorage {
        if(!ExportStorage.instance) {
            ExportStorage.instance = new ExportStorage()
        }

        return ExportStorage.instance
    }

    // Create accepts a single object
    public async Create(containerID:string, userID:string, input:any | ExportT): Promise<Result<ExportT>> {
        // onValidateSuccess is a callback that happens after the input has been
        // validated and confirmed to be of the Container(s) type
        const onValidateSuccess = ( resolve: (r:any) => void): (c: ExportT)=> void => {
            return async (es:ExportT) => {
                es.id = super.generateUUID();
                es.status = "created";
                es.container_id = containerID;
                es.created_by = userID;
                es.modified_by = userID;


                super.runAsTransaction(ExportStorage.createStatement(es))
                    .then((r) => {
                        if(r.isError) {
                            resolve(r);
                            return
                        }

                        resolve(Result.Success(exportT.encode(es)))
                    })
            }
        };

        return super.decodeAndValidate<ExportT>(exportT, onValidateSuccess, input)
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
                text: `UPDATE exports SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    public Retrieve(id: string): Promise<Result<ExportT>> {
        return super.retrieve<ExportT>(ExportStorage.retrieveStatement(id))
    }

    public List(containerID: string ): Promise<Result<ExportT[]>> {
        return super.rows<ExportT>(ExportStorage.listStatement(containerID))
    }

    public ListByStatus(status: "created" | "processing" | "paused" | "completed" | "failed" ): Promise<Result<ExportT[]>> {
        return super.rows<ExportT>(ExportStorage.listByStatusStatement(status))
    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(ExportStorage.deleteStatement(id))
    }

    public SetProcessing(id: string): Promise<Result<boolean>> {
        return super.run(ExportStorage.setProcessingStatement(id))
    }

    public async SetCompleted(id: string): Promise<Result<boolean>> {
        const completeExport = await this.Retrieve(id)
        QueueProcessor.Instance.emit([{
            source_id: completeExport.value.container_id,
            source_type: "container",
            type: "data_exported"
        } as EventT])
        return super.run(ExportStorage.setCompletedStatement(id))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(exp: ExportT): QueryConfig {
        return {
            text:`INSERT INTO exports(id,container_id,adapter,status,config,created_by, modified_by) VALUES($1, $2, $3, $4, $5, $6, $7)`,
            values: [exp.id, exp.container_id, exp.adapter, exp.status, exp.config, exp.created_by,exp.modified_by]
        }
    }

    private static retrieveStatement(exportID:string): QueryConfig {
        return {
            text:`SELECT * FROM exports WHERE id = $1`,
            values: [exportID]
        }
    }

    private static deleteStatement(exportID: string): QueryConfig {
        return {
            text:`DELETE FROM exports WHERE id = $1`,
            values: [exportID]
        }
    }

    private static listStatement(containerID:string): QueryConfig {
        return {
            text: `SELECT * FROM exports WHERE container_id = $1`,
            values: [containerID]
        }
    }

    private static setProcessingStatement(id:string): QueryConfig {
        return {
            text: `UPDATE exports SET status = 'processing' WHERE id = $1`,
            values: [id]
        }
    }

    private static setCompletedStatement(id:string): QueryConfig {
        return {
            text: `UPDATE exports SET status = 'completed' WHERE id = $1`,
            values: [id]
        }
    }

    private static listByStatusStatement(status: string): QueryConfig {
        return {
            text: `SELECT * FROM exports WHERE status = $1`,
            values: [status]
        }
    }
}
