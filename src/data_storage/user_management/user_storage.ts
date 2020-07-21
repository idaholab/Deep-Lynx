import Result from "../../result"
import PostgresStorage from "../postgresStorage";
import {QueryConfig} from "pg";
import PostgresAdapter from "../adapters/postgres/postgres";
import {userT, UserT} from "../../types/user_management/userT";

/*
* TypeStorage encompasses all logic dealing with the manipulation of the Metatype
* class in a data storage layer. In this case, the storage class requires a graph
* storage interface.
*/
export default class UserStorage extends PostgresStorage{
    public static tableName = "users";

    private static instance: UserStorage;

    public static get Instance(): UserStorage {
        if(!UserStorage.instance) {
            UserStorage.instance = new UserStorage()
        }

        return UserStorage.instance
    }

    public async Create(userID:string, input:any | UserT , preQueries?:QueryConfig[], postQueries?:QueryConfig[]): Promise<Result<UserT>> {
        // onValidateSuccess is a callback that happens after the input has been
        // validated and confirmed to be of the Container(s) type
        const onValidateSuccess = ( resolve: (r:any) => void): (u: UserT)=> void => {
            return async (u: UserT) => {
                const queries: QueryConfig[] = [];

                if(preQueries) queries.push(...preQueries);

                u.id = super.generateUUID();
                u.active = true;
                u.created_by = userID;
                u.modified_by = userID;

                if(!u.admin) u.admin = false;

                queries.push(UserStorage.createStatement(u));

                if (postQueries) queries.push(...postQueries);

                super.runAsTransaction(...queries)
                    .then((r) => {
                        if(r.isError) {
                            resolve(r);
                            return
                        }

                        resolve(Result.Success(userT.encode(u)))
                    })
            }
        };

        return super.decodeAndValidate<UserT>(userT, onValidateSuccess, input)
    }

    public Retrieve(id: string): Promise<Result<UserT>> {
        return super.retrieve<UserT>(UserStorage.retrieveStatement(id))
    }

    public RetrieveByEmail(email: string): Promise<Result<UserT>> {
        return super.retrieve<UserT>(UserStorage.retrieveByEmailStatement(email))
    }

    public RetrieveByIdentityProviderID(id: string): Promise<Result<UserT>> {
        return super.retrieve<UserT>(UserStorage.retrieveByIdentityProviderStatement(id))
    }

    public List(offset: number, limit:number): Promise<Result<UserT[]>> {
        return super.rows<UserT>(UserStorage.listStatement(offset, limit))
    }

    // Update partially updates the User. This function will allow you to
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
                text: `UPDATE users SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(UserStorage.deleteStatement(id))
    }

    public Archive(id: string): Promise<Result<boolean>> {
        return super.run(UserStorage.archiveStatement(id))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(user: UserT): QueryConfig {
        return {
            text:`INSERT INTO users(id,identity_provider_id,identity_provider,display_name,email,active,admin,password,created_by,modified_by) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            values: [user.id, user.identity_provider_id, user.identity_provider, user.display_name, user.email, user.active,user.admin, user.password, user.created_by,user.modified_by]
        }
    }

    private static retrieveStatement(userID:string): QueryConfig {
        return {
            text:`SELECT * FROM users WHERE id = $1`,
            values: [userID]
        }
    }

    private static retrieveByEmailStatement(email:string): QueryConfig {
        return {
            text:`SELECT * FROM users WHERE email = $1 LIMIT 1`,
            values: [email]
        }
    }

    private static retrieveByIdentityProviderStatement(identityProviderID:string): QueryConfig {
        return {
            text:`SELECT * FROM users WHERE identity_provider_id = $1`,
            values: [identityProviderID]
        }
    }

    private static archiveStatement(userID: string): QueryConfig {
        return {
            text:`UPDATE users SET active = false WHERE id = $1`,
            values: [userID]
        }
    }

    private static deleteStatement(userID: string): QueryConfig {
        return {
            text:`DELETE FROM users WHERE id = $1`,
            values: [userID]
        }
    }

    private static listStatement(offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM users OFFSET $1 LIMIT $2`,
            values: [offset, limit]
        }
    }
}
