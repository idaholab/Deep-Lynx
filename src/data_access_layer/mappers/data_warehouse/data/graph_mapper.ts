import Result from "../../../../common_classes/result"
import Mapper from "../../mapper";
import {PoolClient, QueryConfig} from "pg";
import uuid from "uuid";
import Graph, {ActiveGraph} from "../../../../data_warehouse/data/graph";

const format = require('pg-format')
const resultClass = Graph

/*
    GraphMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class GraphMapper extends Mapper {
    public static tableName = "graphs";
    public static activeContainerGraphTableName = "active_graphs";

    private static instance: GraphMapper;

    public static get Instance(): GraphMapper {
        if (!GraphMapper.instance) {
            GraphMapper.instance = new GraphMapper()
        }

        return GraphMapper.instance
    }

    public async Create(containerID: string, userID: string, transaction?: PoolClient): Promise<Result<Graph>> {
        const r = await super.run(this.createStatement(containerID, userID), {transaction, resultClass})
        if (r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public async SetActiveForContainer(containerID: string, graphID: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.setActiveForContainerStatement(containerID, graphID), {transaction})
    }

    public async Retrieve(id: string): Promise<Result<Graph>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass})
    }

    public async ActiveForContainer(containerID: string): Promise<Result<ActiveGraph>> {
        return super.retrieve(this.activeForContainerStatement(containerID), {resultClass: ActiveGraph})
    }

    public async List(containerID: string, offset: number, limit: number): Promise<Result<Graph[]>> {
        return super.rows(this.listStatement(containerID, offset, limit), {resultClass})
    }

    // the only thing you can update on a graph is its container, so we lock it down
    public async Update(graphID: string, containerID: string, userID: string, transaction?: PoolClient): Promise<Result<Graph>> {
        const r = await super.run(this.updateStatement(userID, containerID, graphID), {transaction, resultClass})
        if (r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id))
    }

    public Archive(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.archiveStatement(id))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(containerID: string, userID: string): string {
        const text = `INSERT INTO graphs(id, container_id, created_by, modified_by)
                      VALUES (%L) RETURNING *`
        const values = [uuid.v4(), containerID, userID, userID]

        return format(text, values)
    }

    private updateStatement(userID: string, containerID: string, graphID: string): QueryConfig {
        return {
            text: `UPDATE graphs
                   SET modified_by  = $1,
                       modified_at  = NOW(),
                       container_id = $2
                   WHERE id = $3 RETURNING *`,
            values: [userID, containerID, graphID]
        }
    }

    private retrieveStatement(graphID: string): QueryConfig {
        return {
            text: `SELECT *
                   FROM graphs
                   WHERE id = $1`,
            values: [graphID]
        }
    }

    private activeForContainerStatement(containerID: string): QueryConfig {
        return {
            text: `SELECT graph_id
                   FROM active_graphs
                   WHERE container_id = $1`,
            values: [containerID]
        }
    }

    private setActiveForContainerStatement(containerID: string, graphID: string): QueryConfig {
        return {
            text: `INSERT INTO active_graphs (container_id, graph_id)
                   VALUES ($1, $2) ON CONFLICT (container_id, graph_id) DO
            UPDATE
                SET container_id = $1,
                graph_id = $2;`,
            values: [containerID, graphID]
        }
    }

    private archiveStatement(graphID: string): QueryConfig {
        return {
            text: `UPDATE graphs
                   SET archived = true
                   WHERE id = $1`,
            values: [graphID]
        }
    }

    private deleteStatement(graphID: string): QueryConfig {
        return {
            text: `DELETE
                   FROM graphs
                   WHERE id = $1`,
            values: [graphID]
        }
    }

    private listStatement(containerID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT *
                   FROM graphs
                   WHERE container_id = $1
                     AND NOT archived
                   OFFSET $2 LIMIT $3`,
            values: [containerID, offset, limit]
        }
    }
}
