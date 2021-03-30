import Container from "../../../../data_warehouse/ontology/container";
import Result from "../../../../common_classes/result"
import Mapper from "../../mapper";
import {PoolClient, QueryConfig} from "pg";
import uuid from "uuid";

const format = require('pg-format')
const resultClass = Container

/*
* ContainerMapper encompasses all logic dealing with the manipulation of the
* Container class in a data storage layer.
*/
export default class ContainerMapper extends Mapper{
    public static tableName = "containers";

    private static instance: ContainerMapper;

    public static get Instance(): ContainerMapper {
        if(!ContainerMapper.instance) {
            ContainerMapper.instance = new ContainerMapper()
        }

        return ContainerMapper.instance
    }

    public async Create(userID:string, c: Container, transaction?: PoolClient): Promise<Result<Container>> {
        const r = await super.run(this.createStatement(userID, c), {transaction, resultClass})
        if(r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public async BulkCreate(userID:string, c: Container[] | Container, transaction?: PoolClient): Promise<Result<Container[]>> {
        if(!Array.isArray(c)) c = [c]

        return super.run(this.createStatement(userID, ...c), {transaction, resultClass})
    }

    public async Retrieve(id:string): Promise<Result<Container>>{
       return super.retrieve(this.retrieveStatement(id), {resultClass: Container})
    }

    public async Update(userID: string, c: Container, transaction?: PoolClient): Promise<Result<Container>> {
        const r = await super.run(this.fullUpdateStatement(userID, c), {transaction, resultClass})
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public async BulkUpdate(userID: string, c: Container[], transaction?: PoolClient): Promise<Result<Container[]>> {
        return super.run(this.fullUpdateStatement(userID, ...c), {transaction, resultClass})
    }

    public async List(): Promise<Result<Container[]>> {
        return super.rows(this.listStatement(), {resultClass: Container})
    }

    public async ListFromIDs(ids: string[]): Promise<Result<Container[]>> {
        return super.rows(this.listFromIDsStatement(ids), {resultClass})
    }

    public async Archive(containerID: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.archiveStatement(containerID, userID))
    }

    public async Delete(containerID: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(containerID))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...containers: Container[]): string {
        const text = `INSERT INTO containers(id,name,description, created_by, modified_by) VALUES %L RETURNING *`
        const values = containers.map(container => [uuid.v4(), container.name, container.description, userID, userID])

        return format(text, values)
    }

    private fullUpdateStatement(userID: string, ...containers: Container[]): string {
        const text = `UPDATE containers AS c SET
                        name = u.name,
                        description = u.description,
                        modified_by = u.modified_by,
                        modified_at = NOW()
                      FROM(VALUES %L) AS u(id, name, description, modified_by)
                      WHERE u.id::uuid = c.id RETURNING c.*`
        const values = containers.map(container => [container.id, container.name, container.description, userID])

        return format(text, values)
    }

    private archiveStatement(containerID: string, userID: string): QueryConfig {
        return {
            text:`UPDATE containers SET archived = true, modified_by = $2  WHERE id = $1`,
            values: [containerID, userID]
        }
    }

    private deleteStatement(containerID: string): QueryConfig {
        return {
            text:`DELETE FROM containers WHERE id = $1`,
            values: [containerID]
        }
    }

    private retrieveStatement(id:string): QueryConfig {
        return {
            text:`SELECT c.*, active_graphs.graph_id as active_graph_id
                    FROM containers c
                    LEFT JOIN active_graphs ON active_graphs.container_id = c.id
                    WHERE c.id = $1 AND NOT c.archived`,
            values: [id]
        }
    }

    private listStatement(): QueryConfig {
        return {
            text: `SELECT c.*, active_graphs.graph_id as active_graph_id
                    FROM containers c
                    LEFT JOIN active_graphs ON active_graphs.container_id = c.id
                    WHERE NOT c.archived`,
        }
    }

    private listFromIDsStatement(ids: string[]): string {
            const text = `SELECT c.*, active_graphs.graph_id as active_graph_id
                    FROM containers c
                    LEFT JOIN active_graphs ON active_graphs.container_id = c.id
                    WHERE c.id IN(%L)`
            const values = ids

            return format(text, values)
    }
}
