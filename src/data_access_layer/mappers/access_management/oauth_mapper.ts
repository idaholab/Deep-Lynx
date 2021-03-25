import Result from "../../../common_classes/result"
import Mapper from "../mapper";
import {PoolClient, QueryConfig} from "pg";
import uuid from "uuid";
import {OAuthApplication} from "../../../access_management/oauth/oauth";

const format = require('pg-format')
const resultClass = OAuthApplication
/*
* The OAuthMapper actually contains mapping functions for itself and the application
* tracking portions. This is done to be more easily understood and convenient to the user
*/
export default class OAuthMapper extends Mapper{
    public static tableName = "oauth_applications";

    private static instance: OAuthMapper;

    public static get Instance(): OAuthMapper {
        if(!OAuthMapper.instance) {
            OAuthMapper.instance = new OAuthMapper()
        }

        return OAuthMapper.instance
    }

    public async Create(userID:string, app: OAuthApplication, transaction?: PoolClient): Promise<Result<OAuthApplication>> {
       const r = await super.run(this.createStatement(userID, app), {transaction, resultClass})
       if(r.isError) return Promise.resolve(Result.Pass(r))

       r.value[0].client_secret_raw = app.client_secret_raw

       return Promise.resolve(Result.Success(r.value[0]))
    }

    public async Update(userID:string, app: OAuthApplication, transaction?: PoolClient): Promise<Result<OAuthApplication>> {
        const r = await super.run(this.fullUpdateStatement(userID, app), {transaction, resultClass})
        if(r.isError) return Promise.resolve(Result.Pass(r))

        r.value[0].client_secret_raw = app.client_secret_raw

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public async Retrieve(id: string): Promise<Result<OAuthApplication>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass: OAuthApplication})
    }

    public async RetrieveByClientID(clientID: string): Promise<Result<OAuthApplication>> {
        return super.retrieve(this.retrieveByClientIDStatement(clientID), {resultClass})
    }

    public async ListForUser(userID: string): Promise<Result<OAuthApplication[]>> {
        return super.rows(this.listForUserStatement(userID), {resultClass})
    }

    // marks an application approved for user
    public MarkApplicationApproved(applicationID: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.markApplicationApprovedStatement(applicationID, userID))
    }

    // checks to see if application is approved for user
    public async ApplicationIsApproved(applicationID: string, userID: string): Promise<Result<boolean>> {
        const records = await super.count(this.countApplicationApprovalsStatement(applicationID, userID))

        if(records.isError || records.value <= 0) {
            return new Promise(resolve => resolve(Result.Success(false)))
        }

        return new Promise(resolve => resolve(Result.Success(true)))
    }

    public PermanentlyDelete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID:string, ...applications: OAuthApplication[]): string {
            const text = `INSERT INTO oauth_applications(
                               id,
                               name,
                               description,
                               owner_id,
                               client_id,
                               client_secret,
                               created_by,
                               modified_by) VALUES %L RETURNING *`
            const values = applications.map(oauth => [
                uuid.v4(),
                oauth.name,
                oauth.description,
                oauth.owner_id,
                oauth.client_id,
                (oauth.client_secret) ? oauth.client_secret : oauth.client_secret_raw,
                userID, userID])

            return format(text, values)
    }

    // we never reassign client_id and secret after initial creation
    private fullUpdateStatement(userID:string, ...applications: OAuthApplication[]): string {
        const text = `UPDATE oauth_applications AS o SET
                               name = u.name,
                               description = u.description,
                               owner_id = u.owner_id::uuid,
                               modified_by = u.modified_by,
                               modified_at = NOW()
                               FROM(VALUES %L) as u(
                               id,
                               name,
                               owner_id,
                               description,
                               modified_by
                               ) WHERE u.id::uuid = o.id RETURNING o.*`
        const values = applications.map(oauth => [
            oauth.id,
            oauth.name,
            oauth.owner_id,
            oauth.description,
            userID])

        return format(text, values)
    }

    private retrieveStatement(applicationID:string): QueryConfig {
        return {
            text:`SELECT * FROM oauth_applications WHERE id = $1`,
            values: [applicationID]
        }
    }

    private retrieveByClientIDStatement(clientID:string): QueryConfig {
        return {
            text:`SELECT * FROM oauth_applications WHERE client_id = $1`,
            values: [clientID]
        }
    }

    private deleteStatement(userID: string): QueryConfig {
        return {
            text:`DELETE FROM oauth_applications WHERE id = $1`,
            values: [userID]
        }
    }

    private listForUserStatement(ownerID: string): QueryConfig {
        return {
            text: `SELECT * FROM oauth_applications WHERE owner_id = $1`,
            values: [ownerID]
        }
    }

    // oauth_application_approvals
    private markApplicationApprovedStatement(applicationID: string, userID: string): QueryConfig {
        return {
            text: `INSERT INTO oauth_application_approvals(oauth_application_id, user_id) VALUES($1, $2)`,
            values: [applicationID, userID]
        }
    }

    private countApplicationApprovalsStatement(applicationID: string, userID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM oauth_application_approvals WHERE oauth_application_id = $1 AND user_id =$2`,
            values: [applicationID, userID]
        }
    }
}
