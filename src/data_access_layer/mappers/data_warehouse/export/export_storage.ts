import Result from "../../../../result"
import Mapper from "../../mapper";
import {QueryConfig} from "pg";
import {exportT, ExportT} from "../../../../types/export/exportT";
import PostgresAdapter from "../../db_adapters/postgres/postgres";
import {QueueProcessor} from "../../../../event_system/processor";
import Event from "../../../../event_system/event";

/*
* ExportStorage encompasses all logic dealing with the manipulation of the Export
* class in a data storage layer.
*/
export default class ExportStorage extends Mapper{
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
            if(k === `created_at` || k === `created_by` || k === 'modified_at' || k === 'modified_by') {
                return
            }

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

    public List(containerID: string, offset?: number, limit?: number, sortBy?: string, sortDesc?: boolean): Promise<Result<ExportT[]>> {
        if(limit === -1 || !limit) {
            return super.rows<ExportT>(ExportStorage.listAllStatement(containerID))
        }

        return super.rows<ExportT>(ExportStorage.listStatement(containerID, offset, limit, sortBy, sortDesc))
    }

    public Count(containerID: string): Promise<Result<number>> {
        return super.count(ExportStorage.countStatement(containerID))
    }

    public ListByStatus(status: "created" | "processing" | "paused" | "completed" | "failed" ): Promise<Result<ExportT[]>> {
        return super.rows<ExportT>(ExportStorage.listByStatusStatement(status))
    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(ExportStorage.deleteStatement(id))
    }

    public async SetStatus(id: string, status: "created" | "processing" | "paused" | "completed" | "failed", message?: string): Promise<Result<boolean>> {
        if(status === "completed") {
            const completeExport = await this.Retrieve(id)
            QueueProcessor.Instance.emit(new Event({
                sourceID: completeExport.value.container_id!,
                sourceType: "container",
                type: "data_exported"
            }))
        }

        return super.run(ExportStorage.setStatusStatement(id, status, message))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(exp: ExportT): QueryConfig {
        return {
            text:`INSERT INTO exports(id,container_id,adapter,status,config,destination_type, created_by, modified_by) VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
            values: [exp.id, exp.container_id, exp.adapter, exp.status, exp.config, exp.destination_type, exp.created_by,exp.modified_by]
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

    private static listAllStatement(containerID:string): QueryConfig {
        return {
            text: `SELECT * FROM exports WHERE container_id = $1`,
            values: [containerID]
        }
    }

    private static countStatement(containerID:string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM exports WHERE container_id = $1`,
            values: [containerID]
        }
    }

    private static listStatement(containerID:string, offset?: number, limit?: number, sortBy?: string, sortDesc?: boolean): QueryConfig {
        if(sortDesc) {
            return {
                text: `SELECT * FROM exports
                WHERE container_id = $1
                ORDER BY "${sortBy} DESC"
                OFFSET $2 LIMIT $3`,
                values: [containerID, offset, limit]
            }
        } else if (sortBy) {
            return {
                text: `SELECT * FROM exports
                WHERE container_id = $1
                ORDER BY "${sortBy} ASC"
                OFFSET $2 LIMIT $3`,
                values: [containerID, offset, limit]
            }
        } else {
            return {
                text: `SELECT * FROM exports WHERE container_id = $1`,
                values: [containerID]
            }
        }
    }

    private static setStatusStatement(id: string, status: "created" | "processing" | "paused" | "completed" | "failed", message?: string): QueryConfig {
        return {
            text: `UPDATE exports SET status = $1, status_message = $2 WHERE id = $3`,
            values: [status, message, id]
        }
    }

    private static listByStatusStatement(status: string): QueryConfig {
        return {
            text: `SELECT * FROM exports WHERE status = $1`,
            values: [status]
        }
    }
}
