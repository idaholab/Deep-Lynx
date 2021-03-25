import Result from "../../../common_classes/result"
import Mapper from "../mapper";
import {PoolClient, QueryConfig} from "pg";
import {ContainerUserInvite} from "../../../access_management/user";

const resultClass = ContainerUserInvite
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
        const r = await super.run(this.createStatement(input), {transaction, resultClass})
        if(r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public async InvitesByUser(userID: string, containerID: string): Promise<Result<ContainerUserInvite[]>> {
        return super.rows(this.listForUserStatement(userID, containerID), {resultClass})
    }

    public async InvitesForEmail(email: string): Promise<Result<ContainerUserInvite[]>> {
        return super.rows(this.listForEmailStatement(email), {resultClass})
    }

    public async RetrieveByTokenAndEmail(token: string, email: string): Promise<Result<ContainerUserInvite>> {
        return super.retrieve(this.retrieveByTokenAndEmailStatement(token, email), {resultClass})
    }

    public MarkAccepted(token: string, email: string): Promise<Result<boolean>> {
        return super.runAsTransaction(this.markAcceptedStatement(token, email))
    }

    public PermanentlyDelete(id: number): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id))
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
