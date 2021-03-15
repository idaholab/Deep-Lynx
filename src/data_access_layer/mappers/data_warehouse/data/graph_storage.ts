import Result from "../../../../result"
import Mapper from "../../mapper";
import {QueryConfig, QueryResult} from "pg";
import PostgresAdapter from "../../db_adapters/postgres/postgres";
import {ActiveGraphT, GraphT} from "../../../../types/graph/graphT";

/*
* TypeStorage encompasses all logic dealing with the manipulation of the Metatype
* class in a data storage layer.
*/
export default class GraphStorage extends Mapper{
    public static tableName = "graphs";
    public static activeContainerGraphTableName = "active_graphs";

    private static instance: GraphStorage;

    public static get Instance(): GraphStorage {
        if(!GraphStorage.instance) {
            GraphStorage.instance = new GraphStorage()
        }

        return GraphStorage.instance
    }

    public async InsertNodesAndEdges(queries: QueryConfig[]): Promise<Result<boolean>> {
        return super.runAsTransaction(...queries)
    }

    public async Create(containerID: string, author: string): Promise<Result<GraphT>> {
        const graph: GraphT = {
            id: super.generateUUID(),
            container_id: containerID,
            created_by: author,
            modified_by: author
        };

        return new Promise(resolve => {
           PostgresAdapter.Instance.Pool.query(GraphStorage.createStatement(graph))
               .then((res) => {
                   // we don't need the result of the query
                  resolve(Result.Success(graph))
               })
               .catch((e:Error) => resolve(Result.Failure(e.message)))
        })
    }

    public async SetActiveForContainer(containerID: string, graphID: string): Promise<Result<boolean>> {
        return new Promise(resolve => {
            PostgresAdapter.Instance.Pool.query(GraphStorage.setActiveForContainerStatement(containerID, graphID))
            .then((res) => {
                resolve(Result.Success(true))
            })
                .catch((e:Error) => resolve(Result.Failure(e.message)))
        })
    }


    public Retrieve(id: string): Promise<Result<GraphT>> {
        return super.retrieve<GraphT>(GraphStorage.retrieveStatement(id))
    }

   public ActiveForContainer(containerID: string): Promise<Result<ActiveGraphT>> {
        return super.retrieve<ActiveGraphT>(GraphStorage.activeForContainerStatement(containerID))
   }

   public List(containerID: string, offset: number, limit:number): Promise<Result<GraphT[]>> {
        return super.rows<GraphT>(GraphStorage.listStatement(containerID, offset, limit))
    }

   // the only thing you can update on a graph is its container
    public async Update(id: string, containerID:string): Promise<Result<boolean>> {
        const toUpdate = await this.Retrieve(id);

        if(toUpdate.isError) {
            return new Promise(resolve => resolve(Result.Failure(toUpdate.error!.error)))
        }

        return new Promise(resolve => {
            PostgresAdapter.Instance.Pool.query({
                text: `UPDATE graphs SET container_id = $1 WHERE id = '${id}'`,
                values: [containerID]
            })
                .then(() => {
                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(GraphStorage.deleteStatement(id))
    }

    public Archive(id: string): Promise<Result<boolean>> {
        return super.run(GraphStorage.archiveStatement(id))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(graph: GraphT): QueryConfig {
        return {
            text:`INSERT INTO graphs(id,container_id, created_by, modified_by) VALUES($1, $2, $3,$4)`,
            values: [graph.id,graph.container_id, graph.created_by, graph.modified_by]
        }
    }

    private static retrieveStatement(graphID:string): QueryConfig {
        return {
            text:`SELECT * FROM graphs WHERE id = $1`,
            values: [graphID]
        }
    }

    private static activeForContainerStatement(containerID:string): QueryConfig {
        return {
            text:`SELECT graph_id FROM active_graphs WHERE container_id = $1`,
            values: [containerID]
        }
    }

    private static setActiveForContainerStatement(containerID: string, graphID:string): QueryConfig {
       return {
            text: `INSERT INTO active_graphs (container_id, graph_id) VALUES ($1, $2)
ON CONFLICT (container_id, graph_id) DO UPDATE
  SET container_id = $1,
      graph_id = $2;`,
           values: [containerID, graphID]
       }
    }

    private static archiveStatement(graphID: string): QueryConfig {
        return {
            text:`UPDATE graphs SET archived = true  WHERE id = $1`,
            values: [graphID]
        }
    }

    private static deleteStatement(graphID: string): QueryConfig {
        return {
            text:`DELETE FROM graphs WHERE id = $1`,
            values: [graphID]
        }
    }

    private static listStatement(containerID:string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM graphs WHERE container_id = $1 AND NOT archived OFFSET $2 LIMIT $3`,
            values: [containerID, offset, limit]
        }
    }
}
