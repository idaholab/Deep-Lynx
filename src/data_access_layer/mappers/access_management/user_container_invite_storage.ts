import Result from "../../../result"
import Mapper from "../mapper";
import {QueryConfig} from "pg";
import {userContainerInviteT, UserContainerInviteT} from "../../../types/user_management/userContainerInviteT";

const UIDGenerator = require('uid-generator');
const uidgen = new UIDGenerator();

/*
* TypeStorage encompasses all logic dealing with the manipulation of the Metatype
* class in a data storage layer. In this case, the storage class requires a graph
* storage interface.
*/
export default class UserContainerInviteStorage extends Mapper{
    public static tableName = "user_container_invites";

    private static instance: UserContainerInviteStorage;

    public static get Instance(): UserContainerInviteStorage {
        if(!UserContainerInviteStorage.instance) {
            UserContainerInviteStorage.instance = new UserContainerInviteStorage()
        }

        return UserContainerInviteStorage.instance
    }

    public async Create(userID:string, containerID:string, input:any | UserContainerInviteT , preQueries?:QueryConfig[], postQueries?:QueryConfig[]): Promise<Result<UserContainerInviteT>> {
        // onValidateSuccess is a callback that happens after the input has been
        // validated and confirmed to be of the Container(s) type
        const onValidateSuccess = ( resolve: (r:any) => void): (u: UserContainerInviteT)=> void => {
            return async (u: UserContainerInviteT) => {
                const queries: QueryConfig[] = [];

                if(preQueries) queries.push(...preQueries);

                u.origin_user = userID
                u.container_id = containerID
                u.token = await uidgen.generate()

                queries.push(UserContainerInviteStorage.createStatement(u));

                if (postQueries) queries.push(...postQueries);

                super.runAsTransaction(...queries)
                    .then((r) => {
                        if(r.isError) {
                            resolve(r);
                            return
                        }

                        resolve(Result.Success(userContainerInviteT.encode(u)))
                    })
            }
        };

        return super.decodeAndValidate<UserContainerInviteT>(userContainerInviteT, onValidateSuccess, input)
    }

    public InvitesByUser(userID: string, containerID: string): Promise<Result<UserContainerInviteT[]>> {
        return super.rows<UserContainerInviteT>(UserContainerInviteStorage.listForUserStatement(userID, containerID))
    }

    public InvitesForEmail(email: string): Promise<Result<UserContainerInviteT[]>> {
        return super.rows<UserContainerInviteT>(UserContainerInviteStorage.listForEmailStatement(email))
    }

    public RetrieveByTokenAndEmail(token: string, email: string): Promise<Result<UserContainerInviteT>> {
        return super.retrieve<UserContainerInviteT>(UserContainerInviteStorage.retrieveByTokenAndEmailStatement(token, email))
    }

    public MarkAccepted(token: string, email: string): Promise<Result<boolean>> {
        return super.runAsTransaction(UserContainerInviteStorage.markAcceptedStatement(token, email))
    }

    public PermanentlyDelete(id: number): Promise<Result<boolean>> {
        return super.run(UserContainerInviteStorage.deleteStatement(id))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(user: UserContainerInviteT): QueryConfig {
        return {
            text:`INSERT INTO user_container_invites(origin_user, email, token, container_id) VALUES($1, $2, $3, $4)`,
            values: [user.origin_user, user.email, user.token, user.container_id]
        }
    }


    private static deleteStatement(id: number): QueryConfig {
        return {
            text:`DELETE FROM user_container_invites WHERE id = $1`,
            values: [id]
        }
    }

    private static listForUserStatement(userID: string, containerID: string): QueryConfig {
        return {
            text: `SELECT * FROM user_container_invites WHERE origin_user = $1 AND container_id = $2 AND NOT accepted`,
            values: [userID, containerID]
        }
    }

    private static listForEmailStatement(email: string): QueryConfig {
        return {
            text: `SELECT user_container_invites.*, containers.name as container_name FROM user_container_invites LEFT JOIN containers ON containers.id = user_container_invites.container_id  WHERE email = $1 AND NOT accepted`,
            values: [email]
        }
    }

    private static retrieveByTokenAndEmailStatement(token: string, email: string): QueryConfig {
        return {
            text: `SELECT * FROM user_container_invites WHERE token = $1 AND email = $2`,
            values: [token, email]
        }
    }

    private static markAcceptedStatement(token: string, email: string): QueryConfig {
        return {
            text: `UPDATE user_container_invites SET accepted = true WHERE token = $1 and email = $2`,
            values: [token, email]
        }
    }
}
