import Result from "../../../result"
import PostgresStorage from "../postgresStorage";
import {QueryConfig} from "pg";
import PostgresAdapter from "../adapters/postgres/postgres";
import {dataSourceT, DataSourceT} from "../../../types/import/dataSourceT";
import {QueueProcessor} from "../../../services/event_system/events";
import {EventT} from "../../../types/events/eventT";

/*
* ImportAdapterStorage encompasses all logic dealing with the manipulation of the Import Adapter
* class in a data storage layer.
*/
export default class DataSourceStorage extends PostgresStorage{
    public static tableName = "data_sources";

    private static instance: DataSourceStorage;

    public static get Instance(): DataSourceStorage {
        if(!DataSourceStorage.instance) {
            DataSourceStorage.instance = new DataSourceStorage()
        }

        return DataSourceStorage.instance
    }

    // Create accepts a single object
    public async Create(containerID:string, userID:string, input:any | DataSourceT): Promise<Result<DataSourceT>> {
        // onValidateSuccess is a callback that happens after the input has been
        // validated and confirmed to be of the Container(s) type
        const onValidateSuccess = ( resolve: (r:any) => void): (imp: DataSourceT)=> void => {
            return async (ia:DataSourceT) => {
                ia.id = super.generateUUID();
                ia.container_id = containerID;
                ia.created_by = userID;
                ia.modified_by = userID;


                super.runAsTransaction(DataSourceStorage.createStatement(ia))
                    .then((r) => {
                        if(r.isError) {
                            resolve(r);
                            return
                        }

                        QueueProcessor.Instance.emit([{
                            source_id: containerID,
                            source_type: "container",
                            type: "data_source_created",
                            data: ia.id!
                        } as EventT])

                        resolve(Result.Success(dataSourceT.encode(ia)))
                    })
            }
        };

        return super.decodeAndValidate<DataSourceT>(dataSourceT, onValidateSuccess, input)
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
                text: `UPDATE data_sources SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    QueueProcessor.Instance.emit([{
                        source_id: toUpdate.value.container_id!,
                        source_type: "container",
                        type: "data_source_modified",
                        data: id
                    } as EventT])

                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    public Retrieve(id: string): Promise<Result<DataSourceT>> {
        return super.retrieve<DataSourceT>(DataSourceStorage.retrieveStatement(id))
    }

    public ListForContainer(containerID: string ): Promise<Result<DataSourceT[]>> {
        return super.rows<DataSourceT>(DataSourceStorage.listStatement(containerID))
    }

    public ListActive(): Promise<Result<DataSourceT[]>> {
        return super.rows<DataSourceT>(DataSourceStorage.listActive())
    }

    public List(): Promise<Result<DataSourceT[]>> {
        return super.rows<DataSourceT>(DataSourceStorage.list())
    }

    public async IsActive(dataSourceID: string): Promise<Result<boolean>> {
        const count = await super.count(DataSourceStorage.isActive(dataSourceID))

        return new Promise(resolve => {
            if(count.isError) resolve(Result.Pass(count))

            if(count.value <= 0) resolve(Result.Success(false))

            resolve(Result.Success(true))
        })
    }

    // LastActiveSince was created so that the processing loop was sure to pick up
    // and start activated or modified data sources
    public ListActiveSince(date: Date): Promise<Result<DataSourceT[]>> {
        return super.rows<DataSourceT>(DataSourceStorage.listActiveSince(date))
    }

    public ListSince(date: Date): Promise<Result<DataSourceT[]>> {
        return super.rows<DataSourceT>(DataSourceStorage.listSince(date))
    }

    public SetActive(id: string): Promise<Result<boolean>> {
        return super.runAsTransaction(DataSourceStorage.setActiveStatement(id))
    }

    public SetInactive(id: string): Promise<Result<boolean>> {
        return super.runAsTransaction(DataSourceStorage.setInactiveStatement(id))
    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(DataSourceStorage.deleteStatement(id))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(imp: DataSourceT): QueryConfig {
        return {
            text:`INSERT INTO data_sources(id,container_id ,adapter_type,config,active,name,created_by, modified_by) VALUES($1, $2, $3, $4, $5, $6, $7,$8)`,
            values: [imp.id, imp.container_id, imp.adapter_type,imp.config,imp.active,imp.name, imp.created_by,imp.modified_by]
        }
    }

    private static retrieveStatement(exportID:string): QueryConfig {
        return {
            text:`SELECT * FROM data_sources WHERE id = $1`,
            values: [exportID]
        }
    }

    private static deleteStatement(exportID: string): QueryConfig {
        return {
            text:`DELETE FROM data_sources WHERE id = $1`,
            values: [exportID]
        }
    }

    private static setActiveStatement(dataSourceID: string): QueryConfig {
        return {
            text: `UPDATE data_sources SET active = true, modified_at = NOW() WHERE id = $1`,
            values: [dataSourceID]
        }
    }

    private static setInactiveStatement(dataSourceID: string): QueryConfig {
        return {
            text: `UPDATE data_sources SET active = false, modified_at = NOW() WHERE id = $1`,
            values: [dataSourceID]
        }
    }

    private static listStatement(containerID:string): QueryConfig {
        return {
            text: `SELECT * FROM data_sources WHERE container_id = $1`,
            values: [containerID]
        }
    }

    private static listActive(): QueryConfig {
        return {
            text: `SELECT * FROM data_sources WHERE active = TRUE`,
        }
    }

    private static list(): QueryConfig {
        return {
            text: `SELECT * FROM data_sources`,
        }
    }

    private static isActive(dataSourceID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM data_sources WHERE active = TRUE AND id = $1`,
            values: [dataSourceID]
        }
    }

    private static listActiveSince(date: Date): QueryConfig {
        return {
            text: `SELECT * FROM data_sources WHERE active = TRUE AND date_part('epoch', modified_at) >= $1 `,
            values: [(date.getTime() / 1000)]
        }
    }

    private static listSince(date: Date): QueryConfig {
        return {
            text: `SELECT * FROM data_sources WHERE date_part('epoch', modified_at) >= $1 `,
            values: [(date.getTime() / 1000)]
        }
    }
}
