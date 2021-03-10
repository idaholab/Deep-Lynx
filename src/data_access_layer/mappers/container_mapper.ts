import Container from "../../data_warehouse/ontology/container";
import Result from "../../result"
import PostgresStorage from "./postgresStorage";
import {PoolClient, QueryConfig} from "pg";
import uuid from "uuid";
import GraphStorage from "./graph/graph_storage";
import Logger from "../../logger";
import {plainToClass} from "class-transformer";
const format = require('pg-format')

/*
* ContainerMapper encompasses all logic dealing with the manipulation of the
* Container class in a data storage layer. Create and update functions return
* classes as we have no surefire way of associating what return rows belong to
* what original classes, and it would be dangerous to make assumptions
*/
export default class ContainerMapper extends PostgresStorage{
    public static tableName = "containers";

    private static instance: ContainerMapper;

    public static get Instance(): ContainerMapper {
        if(!ContainerMapper.instance) {
            ContainerMapper.instance = new ContainerMapper()
        }

        return ContainerMapper.instance
    }

    public async Create(userID:string, c: Container, transaction?: PoolClient): Promise<Result<Container>> {
        const r = await super.runRaw(this.createStatement(c, userID), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r));

        const resultContainers = plainToClass(Container, r.value)

        return Promise.resolve(Result.Success(resultContainers[0]))
    }

    public async BulkCreate(userID:string, c: Container[] | Container, transaction?: PoolClient): Promise<Result<Container[]>> {
        if(!Array.isArray(c)) c = [c]

        const r = await super.runRaw(this.bulkCreateStatement(c, userID), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r));

        const resultContainers = plainToClass(Container, r.value)

        return Promise.resolve(Result.Success(resultContainers))
    }

    public async Retrieve(id:string): Promise<Result<Container>>{
        const result = await super.retrieveRaw(this.retrieveStatement(id))

        if(result.isError) return Promise.resolve(Result.Pass(result))
        return Promise.resolve(Result.Success(plainToClass(Container, result.value)))
    }

    public async Update(userID: string, c: Container, transaction?: PoolClient): Promise<Result<Container>> {
        const r = await super.runRaw(this.fullUpdateStatement(c, userID), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r));

        const resultContainers = plainToClass(Container, r.value)

        return Promise.resolve(Result.Success(resultContainers[0]))
    }


    public async BulkUpdate(userID: string, c: Container[], transaction?: PoolClient): Promise<Result<Container[]>> {
        const r = await super.runRaw(this.fullBulkUpdateStatement(c, userID), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(plainToClass(Container, r.value)))
    }

    public async List(): Promise<Result<Container[]>> {
        const results = await super.rowsRaw(this.listStatement())

        if(results.isError) return new Promise(resolve => resolve(Result.Pass(results)))

        return new Promise(resolve => resolve(Result.Success(plainToClass(Container, results.value))))
    }

    public async ListFromIDs(ids: string[]): Promise<Result<Container[]>> {
        const results = await super.rowsRaw(this.listFromIDsStatement(ids))

        if(results.isError) return new Promise(resolve => resolve(Result.Pass(results)))

        return new Promise(resolve => resolve(Result.Success(plainToClass(Container, results.value))))
    }

    public async Archive(containerID: string, userID: string): Promise<Result<boolean>> {
        return super.run(this.archiveStatement(containerID, userID))
    }

    public async Delete(containerID: string): Promise<Result<boolean>> {
        return super.run(this.deleteStatement(containerID))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(container: Container, userID: string): QueryConfig {
        return {
            text:`INSERT INTO containers(id,name,description, created_by, modified_by) VALUES($1, $2, $3, $4,$5) RETURNING *`,
            values: [uuid.v4(), container.name, container.description, userID, userID]
        }
    }

    private bulkCreateStatement(containers: Container[], userID: string): string {
        const text = `INSERT INTO containers(id,name,description, created_by, modified_by) VALUES %L RETURNING *`
        const values = containers.map(container => [uuid.v4(), container.name, container.description, userID, userID])

        return format(text, values)
    }

    private fullUpdateStatement(container: Container, userID: string): QueryConfig {
        return {
            text:`UPDATE containers SET name = $1, description = $2, modified_by = $3, modified_at = NOW() WHERE id = $4 RETURNING *`,
            values: [container.name, container.description, userID, container.id]
        }
    }

    private fullBulkUpdateStatement(containers: Container[], userID: string): QueryConfig {
        const text = `UPDATE containers AS c SET
                        name = u.name,
                        description = u.description,
                        modified_by = u.modified_by,
                        modified_at = NOW()
                      FROM(VALUES %L) AS u(id, name, description, modified_by)
                      WHERE u.id::uuid = c.id RETURNING *`
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
            text:`SELECT * FROM containers WHERE id = $1 AND NOT ARCHIVED`,
            values: [id]
        }
    }

    private listStatement(): QueryConfig {
        return {
            text: `SELECT * FROM containers WHERE NOT archived`,
        }
    }

    private listFromIDsStatement(ids: string[]): QueryConfig {
        // have to add the quotations in order for postgres to treat the uuid correctly
        ids.map(id => `'${id}'`)

        return {
            text: `SELECT * FROM containers WHERE id IN($1)`,
            values: ids
        }
    }
}
