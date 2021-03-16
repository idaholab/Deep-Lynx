import Result from "../../../result"
import Mapper from "../mapper";
import {PoolClient, QueryConfig} from "pg";
import {ContainerUserInvite} from "../../../access_management/user";
import {plainToClass} from "class-transformer";

/*
* TypeStorage encompasses all logic dealing with the manipulation of the Metatype
* class in a data storage layer. In this case, the storage class requires a graph
* storage interface.
*/
export default class ContainerUserInviteMapper extends Mapper{
    public static tableName = "user_container_invites";

    private static instance: ContainerUserInviteMapper;

    public static get Instance(): ContainerUserInviteMapper {
        if(!ContainerUserInviteMapper.instance) {
            ContainerUserInviteMapper.instance = new ContainerUserInviteMapper()
        }

        return ContainerUserInviteMapper.instance
    }

    public async Create(input: ContainerUserInvite, transaction?: PoolClient): Promise<Result<ContainerUserInvite>> {
        const r = await super.runRaw(this.createStatement(input), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r));

        const resultInvites = plainToClass(ContainerUserInvite, r.value)

        return Promise.resolve(Result.Success(resultInvites[0]))
    }

    public async InvitesByUser(userID: string, containerID: string): Promise<Result<ContainerUserInvite[]>> {
        const results = await super.rowsRaw(this.listForUserStatement(userID, containerID))
        if(results.isError) return Promise.resolve(Result.Pass(results))

        return Promise.resolve(Result.Success(plainToClass(ContainerUserInvite, results.value)))
    }

    public async InvitesForEmail(email: string): Promise<Result<ContainerUserInvite[]>> {
        const results = await super.rowsRaw(this.listForEmailStatement(email))
        if(results.isError) return Promise.resolve(Result.Pass(results))

        return Promise.resolve(Result.Success(plainToClass(ContainerUserInvite, results.value)))
    }

    public async RetrieveByTokenAndEmail(token: string, email: string): Promise<Result<ContainerUserInvite>> {
        const results = await super.rowsRaw(this.retrieveByTokenAndEmailStatement(token, email))
        if(results.isError) return Promise.resolve(Result.Pass(results))

        const invites = plainToClass(ContainerUserInvite, results.value)

        return Promise.resolve(Result.Success(invites[0]))
    }

    public MarkAccepted(token: string, email: string): Promise<Result<boolean>> {
        return super.runAsTransaction(this.markAcceptedStatement(token, email))
    }

    public PermanentlyDelete(id: number): Promise<Result<boolean>> {
        return super.run(this.deleteStatement(id))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(invite: ContainerUserInvite): QueryConfig {
        return {
            text:`INSERT INTO user_container_invites(origin_user, email, token, container_id, issued) VALUES($1, $2, $3, $4, NOW()) RETURNING *`,
            values: [invite.origin_user, invite.email, invite.token, invite.container!.id!]
        }
    }


    private deleteStatement(id: number): QueryConfig {
        return {
            text:`DELETE FROM user_container_invites WHERE id = $1`,
            values: [id]
        }
    }

    private listForUserStatement(userID: string, containerID: string): QueryConfig {
        return {
            text: `SELECT * FROM user_container_invites WHERE origin_user = $1 AND container_id = $2 AND NOT accepted`,
            values: [userID, containerID]
        }
    }

    private listForEmailStatement(email: string): QueryConfig {
        return {
            text: `SELECT user_container_invites.*, containers.name as container_name FROM user_container_invites LEFT JOIN containers ON containers.id = user_container_invites.container_id  WHERE email = $1 AND NOT accepted`,
            values: [email]
        }
    }

    private retrieveByTokenAndEmailStatement(token: string, email: string): QueryConfig {
        return {
            text: `SELECT * FROM user_container_invites WHERE token = $1 AND email = $2`,
            values: [token, email]
        }
    }

    private markAcceptedStatement(token: string, email: string): QueryConfig {
        return {
            text: `UPDATE user_container_invites SET accepted = true WHERE token = $1 and email = $2`,
            values: [token, email]
        }
    }
}
