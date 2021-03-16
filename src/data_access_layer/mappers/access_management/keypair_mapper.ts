import Result from "../../../result"
import Mapper from "../mapper";
import {PoolClient, QueryConfig} from "pg";
import {KeyPair, User} from "../../../access_management/user";
import {plainToClass} from "class-transformer";
const format = require('pg-format')

/*
* TypeStorage encompasses all logic dealing with the manipulation of the KeyPair
* class in a data storage layer. This also contains functions for validating
* the key pair.
*/
export default class KeyPairMapper extends Mapper{
    public static tableName = "users";

    private static instance: KeyPairMapper;

    public static get Instance(): KeyPairMapper {
        if(!KeyPairMapper.instance) {
            KeyPairMapper.instance = new KeyPairMapper()
        }

        return KeyPairMapper.instance
    }

    // Create's return value will also contain the unhashed key's secret. This is by design as the end user
    // will need that secret in order validate against the hashed secret. The unhashed secret is stored nowhere in the
    // application
    public async Create(key: KeyPair, transaction?: PoolClient): Promise<Result<KeyPair>> {
        const r = await super.runRaw(this.createStatement(key), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        const resultKeys = plainToClass(KeyPair, r.value)
        resultKeys[0].secret_raw = key.secret_raw

        return Promise.resolve(Result.Success(resultKeys[0]))
    }

    public async BulkCreate(keys: KeyPair[], transaction?: PoolClient): Promise<Result<KeyPair[]>> {
        const r = await super.runRaw(this.createStatement(...keys), transaction)
        if(r.isError) return Promise.resolve(Result.Pass(r))

        const resultKeys = plainToClass(KeyPair, r.value)
        resultKeys.forEach((key, i) => key.secret_raw = keys[i].secret_raw)

        return Promise.resolve(Result.Success(resultKeys))
    }

    public async BulkDelete(keys: KeyPair[], transaction?: PoolClient): Promise<Result<boolean>> {
        return super.run(this.bulkDeleteStatement(keys), transaction)
    }

    public async Retrieve(id: string): Promise<Result<KeyPair>> {
        const r = await super.retrieveRaw(this.retrieveStatement(id))
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(KeyPair, r.value)))
    }

    public async UserForKeyPair(key: string): Promise<Result<User>> {
        const r = await super.retrieveRaw(this.userForKeyStatement(key))

        return Promise.resolve(Result.Success(plainToClass(User, r.value)))
    }

    public async KeysForUser(userID: string): Promise<Result<KeyPair[]>> {
        const r = await super.rowsRaw(this.keysForUserStatement(userID))
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(plainToClass(KeyPair, r.value)))
    }

    public PermanentlyDelete(userID: string, key : string): Promise<Result<boolean>> {
        return super.run(this.deleteStatement(userID, key))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(...keys: KeyPair[]): string {
        const text = `INSERT INTO keypairs("key", secret, user_id) VALUES %L RETURNING *`
        const values = keys.map(key => [key.key, key.secret, key.user_id])

        return format(text, values)
    }

    private bulkDeleteStatement(keys: KeyPair[]): string {
        const text = `DELETE FROM keypairs WHERE key IN(%L)`
        const values = keys.filter(k => k.key).map(k => k.key)

        return format(text, values)
    }

    private retrieveStatement(key:string): QueryConfig {
        return {
            text:`SELECT * FROM keypairs WHERE key = $1`,
            values: [key]
        }
    }

    private userForKeyStatement(key: string): QueryConfig {
        return {
            text: `SELECT * FROM keypairs LEFT JOIN users on users.id = keypairs.user_id  WHERE key = $1`,
            values: [key]
        }
    }

    private keysForUserStatement(userID: string): QueryConfig {
        return {
            text: `SELECT key, user_id FROM keypairs WHERE user_id = $1`,
            values: [userID]
        }
    }

    private deleteStatement(userID:string, key: string): QueryConfig {
        return {
            text:`DELETE FROM keypairs WHERE key = $1 AND user_id = $2`,
            values: [key, userID]
        }
    }
}
