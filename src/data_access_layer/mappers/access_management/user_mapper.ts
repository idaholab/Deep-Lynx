import Result from "../../../common_classes/result"
import Mapper from "../mapper";
import {PoolClient, QueryConfig} from "pg";
import {User} from "../../../access_management/user";
import {plainToClass} from "class-transformer";
import uuid from "uuid";

const UIDGenerator = require('uid-generator');
const uidgen = new UIDGenerator();

const format = require('pg-format')
const resultClass = User

/*
* TypeStorage encompasses all logic dealing with the manipulation of the Metatype
* class in a data storage layer. In this case, the storage class requires a graph
* storage interface.
*/
export default class UserMapper extends Mapper{
    public static tableName = "users";

    private static instance: UserMapper;

    public static get Instance(): UserMapper {
        if(!UserMapper.instance) {
            UserMapper.instance = new UserMapper()
        }

        return UserMapper.instance
    }

    public async Create(userID:string, u: User, transaction?: PoolClient): Promise<Result<User>> {
        const r = await super.run(this.createStatement(userID, u), {transaction, resultClass})
        if(r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public async BulkCreate(userID:string, u: User[] | User, transaction?: PoolClient): Promise<Result<User[]>> {
        if(!Array.isArray(u)) u = [u]

        return super.run(this.createStatement(userID, ...u), {transaction, resultClass})
    }

    public async Retrieve(id:string): Promise<Result<User>>{
        return super.retrieve(this.retrieveStatement(id), {resultClass})
    }

    public async Update(userID: string, c: User, transaction?: PoolClient): Promise<Result<User>> {
        const r = await super.run(this.fullUpdateStatement(userID, c), {transaction, resultClass})
        if(r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public async BulkUpdate(userID: string, c: User[], transaction?: PoolClient): Promise<Result<User[]>> {
       return super.run(this.fullUpdateStatement(userID, ...c), {transaction, resultClass})
    }

    public async SetResetToken(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.resetTokenStatement(id, await uidgen.generate()))
    }

    public async ResetPassword(resetToken: string, email: string, newPassword: string): Promise<Result<boolean>> {
        return super.runStatement(this.resetPasswordStatement(resetToken, email, newPassword))
    }

    public async RetrieveByEmail(email: string): Promise<Result<User>> {
        return super.retrieve(this.retrieveByEmailStatement(email), {resultClass})
    }

    public async RetrieveByIdentityProviderID(id: string): Promise<Result<User>> {
        return super.retrieve(this.retrieveByIdentityProviderStatement(id), {resultClass})
    }

    public async List(): Promise<Result<User[]>> {
        return super.rows(this.listStatement(), {resultClass})
    }

    public async ListFromIDs(ids: string[]): Promise<Result<User[]>> {
        return super.rows(this.listFromIDsStatement(ids), {resultClass})
    }

    public ValidateEmail(id: string, validationToken: string): Promise<Result<boolean>> {
        return super.runStatement(this.validateEmailStatement(id, validationToken))
    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id))
    }

    public Archive(userID: string, id: string): Promise<Result<boolean>> {
        return super.runStatement(this.archiveStatement(userID, id))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...users: User[]): QueryConfig {
        const text = `INSERT INTO users(
            id,
            identity_provider_id,
            identity_provider,
            display_name,
            email,
            active,
            admin,
            password,
            created_by,
            modified_by,
            email_validation_token) VALUES %L RETURNING *`
        const values = users.map(user => [
            uuid.v4(),
            user.identity_provider_id,
            user.identity_provider,
            user.display_name,
            user.email,
            user.active,
            user.admin,
            user.password,
            userID, userID,
            user.email_validation_token])

        return format(text, values)
    }

    // we update all values but password - use the reset functionality if you're
    // attempting to set that
    private fullUpdateStatement(userID: string, ...users: User[]): QueryConfig {
        const text = `UPDATE users AS t SET
                        identity_provider_id = u.identity_provider_id,
                        identity_provider = u.identity_provider,
                        display_name = u.display_name,
                        email = u.email,
                        active = u.active::boolean,
                        admin = u.admin::boolean,
                        email_valid = u.email_valid::boolean,
                        email_validation_token = u.email_validation_token,
                        modified_by = u.modified_by,
                        modified_at = NOW()
                    FROM(VALUES %L) AS u(
                                        id,
                                        identity_provider_id,
                                        identity_provider,
                                        display_name,
                                        email,
                                        active,
                                        admin,
                                        email_valid,
                                        email_validation_token,
                                        modified_by)
                    WHERE u.id::uuid = t.id RETURNING t.*`
        const values = users.map(user => [
            user.id,
            user.identity_provider_id,
            user.identity_provider,
            user.display_name,
            user.email,
            user.active,
            user.admin,
            user.email_valid,
            user.email_validation_token,
            userID])

        return format(text, values)
    }

    private retrieveStatement(userID:string): QueryConfig {
        return {
            text:`SELECT * FROM users WHERE id = $1`,
            values: [userID]
        }
    }

    private retrieveByEmailStatement(email:string): QueryConfig {
        return {
            text:`SELECT * FROM users WHERE email = $1 LIMIT 1`,
            values: [email]
        }
    }

    private retrieveByIdentityProviderStatement(identityProviderID:string): QueryConfig {
        return {
            text:`SELECT * FROM users WHERE identity_provider_id = $1`,
            values: [identityProviderID]
        }
    }

    private archiveStatement(userID: string, id: string): QueryConfig {
        return {
            text:`UPDATE users SET active = false, modified_by $2, modified_at = NOW() WHERE id = $1`,
            values: [id, userID]
        }
    }

    private deleteStatement(userID: string): QueryConfig {
        return {
            text:`DELETE FROM users WHERE id = $1`,
            values: [userID]
        }
    }

    private resetTokenStatement(userID: string, token: string): QueryConfig {
        return {
            text: 'UPDATE users SET reset_token = $2, reset_token_issued = NOW() WHERE id = $1',
            values: [userID, token]
        }
    }

    // this will only work if the reset token has been issued less than 4 hours ago
    private resetPasswordStatement(resetToken: string, email: string,  newPassword: string): QueryConfig {
        return {
            text: `UPDATE users SET password = $2, reset_token = '' WHERE reset_token = $1 AND email = $3 AND reset_token_issued > NOW() - INTERVAL '4 hours'`,
            values: [resetToken, newPassword, email]
        }
    }

    private listStatement(): QueryConfig {
        return {
            text: `SELECT * FROM users`,
        }
    }

    private validateEmailStatement(id: string, token: string): QueryConfig {
        return {
            text: `UPDATE users SET email_valid = true WHERE email_validation_token = $1 AND id = $2`,
            values: [token, id]
        }
    }

    private listFromIDsStatement(ids: string[]): QueryConfig {
        ids.map(id => `${id}`)

        return {
            text: `SELECT * FROM users WHERE id IN($1)`,
            values: ids
        }
    }
}
