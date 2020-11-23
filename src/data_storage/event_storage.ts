import {EventT, EventsT} from "../types/events/eventT";
import {EventTypeT} from "../types/events/eventTypeT";
import {RegisteredEventT, RegisteredEventsT, registeredEventsT} from "../types/events/registered_eventT";
import Result from "../result"
import PostgresStorage from "./postgresStorage";
import {QueryConfig} from "pg";
import * as t from "io-ts";
import PostgresAdapter from "./adapters/postgres/postgres";

/*
* EventStorage interacts with registered events in the database to
* handle events registered by other applications
*/
export default class EventStorage extends PostgresStorage{
    public static tableName = "registered_events";

    private static instance: EventStorage;

    public static get Instance(): EventStorage {
        if(!EventStorage.instance) {
          EventStorage.instance = new EventStorage()
        }

        return EventStorage.instance
    }

    public async Create(containerID: string, userID:string, input:any | RegisteredEventsT): Promise<Result<RegisteredEventsT>> {
        const onValidateSuccess = ( resolve: (r:any) => void): (c: RegisteredEventsT)=> void => {
            return async (re:RegisteredEventsT) => {
                const queries: QueryConfig[] = [];

                for(const i in re) {
                    re[i].id = super.generateUUID();
                    re[i].created_by = userID;
                    re[i].modified_by = userID;

                    queries.push(EventStorage.createStatement(re[i]))
                }

                super.runAsTransaction(...queries)
                    .then((r) => {
                        if(r.isError) {
                            resolve(r);
                            return
                        }

                        resolve(Result.Success(re))
                    })
            }
        };

        // allows us to accept an array of input if needed
        const payload = (t.array(t.unknown).is(input)) ? input : [input];

        return super.decodeAndValidate<RegisteredEventsT>(registeredEventsT, onValidateSuccess, payload)
    }


    public Retrieve(id: string): Promise<Result<RegisteredEventT>> {
        return super.retrieve<RegisteredEventT>(EventStorage.retrieveStatement(id))
    }

   public List(offset: number, limit:number): Promise<Result<RegisteredEventT[]>> {
        return super.rows<RegisteredEventT>(EventStorage.listStatement(offset, limit))
   }

    public async Update(id: string, userID:string, updatedField: {[key:string]: any}): Promise<Result<boolean>> {
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
                text: `UPDATE registered_events SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(EventStorage.deleteStatement(id))
    }

    public Archive(id: string, userID: string): Promise<Result<boolean>> {
        return super.run(EventStorage.archiveStatement(id, userID))
    }

    private static createStatement(registeredEvent: RegisteredEventT): QueryConfig {
        return {
            text:`INSERT INTO registered_events(id, app_name, app_url, data_source_id, container_id, event_type, created_by, modified_by) VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
            values: [registeredEvent.id, registeredEvent.app_name, registeredEvent.app_url, registeredEvent.data_source_id, registeredEvent.container_id,
              registeredEvent.type, registeredEvent.created_by, registeredEvent.modified_by]
        }
    }

    private static retrieveStatement(metatypeID:string): QueryConfig {
        return {
            text:`SELECT * FROM registered_events WHERE id = $1 AND NOT ARCHIVED`,
            values: [metatypeID]
        }
    }

    private static archiveStatement(id: string, userID: string): QueryConfig {
        return {
            text:`UPDATE registered_events SET archived = true, modified_by = $2 WHERE id = $1`,
            values: [id, userID]
        }
    }

    private static unArchiveStatement(id: string, userID: string): QueryConfig {
      return {
          text:`UPDATE registered_events SET archived = false, modified_by = $2 WHERE id = $1`,
          values: [id, userID]
      }
    }

    private static deleteStatement(id: string): QueryConfig {
        return {
            text:`DELETE FROM registered_events WHERE id = $1`,
            values: [id]
        }
    }

    private static listStatement(offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM registered_events WHERE NOT archived OFFSET $2 LIMIT $3`,
            values: [offset, limit]
        }
    }

    private static datasourceSearchStatement(dataSourceID: string, eventType: EventTypeT): QueryConfig {
        return {
            text: `SELECT * FROM registered_events WHERE data_source_id = $1 AND event_type = $2 AND NOT archived'`,
            values: [dataSourceID, eventType],
        }
    }

    private static containerSearchStatement(containerID: string, eventType: EventTypeT): QueryConfig {
      return {
          text: `SELECT * FROM registered_events WHERE container_id = $1 AND event_type = $2 AND NOT archived'`,
          values: [containerID, eventType],
      }
  }

}
