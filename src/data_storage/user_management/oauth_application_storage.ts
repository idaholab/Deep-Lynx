import Result from "../../result"
import PostgresStorage from "../postgresStorage";
import {Query, QueryConfig} from "pg";
import PostgresAdapter from "../adapters/postgres/postgres";
import {userT, UserT} from "../../types/user_management/userT";
import {oauthApplicationT, OauthApplicationT} from "../../types/user_management/oauth_applicationT";
import uuid from "uuid";
import bcrypt from "bcrypt";
const UIDGenerator = require('uid-generator');
const uidgen = new UIDGenerator();

/*
* TypeStorage encompasses all logic dealing with the manipulation of the Metatype
* class in a data storage layer. In this case, the storage class requires a graph
* storage interface.
*/
export default class OAuthApplicationStorage extends PostgresStorage{
    public static tableName = "users";

    private static instance: OAuthApplicationStorage;

    public static get Instance(): OAuthApplicationStorage {
        if(!OAuthApplicationStorage.instance) {
            OAuthApplicationStorage.instance = new OAuthApplicationStorage()
        }

        return OAuthApplicationStorage.instance
    }

    public async Create(userID:string, input:any | OauthApplicationT, preQueries?:QueryConfig[], postQueries?:QueryConfig[]): Promise<Result<OauthApplicationT>> {
        const id = Buffer.from(uuid.v4())
        const secret = Buffer.from(uuid.v4())

        const hashedSecret = await bcrypt.hash(secret.toString('base64'), 10)
        // onValidateSuccess is a callback that happens after the input has been
        // validated and confirmed to be of the Container(s) type
        const onValidateSuccess = ( resolve: (r:any) => void): (oa: OauthApplicationT)=> void => {
            return async (o: OauthApplicationT) => {
                const queries: QueryConfig[] = [];

                if(preQueries) queries.push(...preQueries)

                o.id = super.generateUUID()
                o.owner_id = userID
                o.created_by = userID
                o.modified_by = userID
                o.client_id = id.toString('base64')
                o.client_secret = hashedSecret
                o.client_secret_raw = secret.toString('base64')


                queries.push(OAuthApplicationStorage.createStatement(o))

                if (postQueries) queries.push(...postQueries)

                super.runAsTransaction(...queries)
                    .then((r) => {
                        if(r.isError) {
                            resolve(r)
                            return
                        }

                        resolve(Result.Success(oauthApplicationT.encode(o)))
                    })
            }
        };

        return super.decodeAndValidate<OauthApplicationT>(oauthApplicationT, onValidateSuccess, input)
    }

    public Retrieve(id: string): Promise<Result<OauthApplicationT>> {
        return super.retrieve<OauthApplicationT>(OAuthApplicationStorage.retrieveStatement(id))
    }

    public List(): Promise<Result<OauthApplicationT[]>> {
        return super.rows<OauthApplicationT>(OAuthApplicationStorage.listStatement())
    }

    public ListForUser(userID: string): Promise<Result<OauthApplicationT[]>> {
        return super.rows<OauthApplicationT>(OAuthApplicationStorage.listForUserStatement(userID))
    }

    // Update partially updates the OAuth Application. This function will allow you to
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
                text: `UPDATE oauth_applications SET ${updateStatement.join(",")} WHERE id = '${id}'`,
                values
            })
                .then(() => {
                    resolve(Result.Success(true))
                })
                .catch(e => resolve(Result.Failure(e)))
        })

    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.run(OAuthApplicationStorage.deleteStatement(id))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(oauth: OauthApplicationT): QueryConfig {
        return {
            text:`INSERT INTO oauth_applications(id,name,description,owner_id,client_id,client_secret,created_by,modified_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
            values: [oauth.id, oauth.name,oauth.description,oauth.owner_id,oauth.client_id,oauth.client_secret, oauth.created_by, oauth.modified_by]
        }
    }

    private static retrieveStatement(applicationID:string): QueryConfig {
        return {
            text:`SELECT * FROM oauth_applications WHERE id = $1`,
            values: [applicationID]
        }
    }


    private static deleteStatement(userID: string): QueryConfig {
        return {
            text:`DELETE FROM oauth_applications WHERE id = $1`,
            values: [userID]
        }
    }

    private static listStatement(): QueryConfig {
        return {
            text: `SELECT * FROM oauth_applications`,
        }
    }

    private static listForUserStatement(ownerID: string): QueryConfig {
        return {
            text: `SELECT * FROM oauth_applications WHERE owner_id = $1`,
            values: [ownerID]
        }
    }
}
