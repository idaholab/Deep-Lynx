import Result from "../../../result"
import PostgresStorage from "../postgresStorage";
import {QueryConfig} from "pg";
import PostgresAdapter from "../adapters/postgres/postgres";
import {userT, UserT} from "../../../types/user_management/userT";
import {KeyPairT} from "../../../types/user_management/keyPairT";
import uuid from "uuid";
import bcrypt from "bcrypt"

/*
* TypeStorage encompasses all logic dealing with the manipulation of the KeyPair
* class in a data storage layer. This also contains functions for validating
* the key pair.
*/
export default class KeyPairStorage extends PostgresStorage{
    public static tableName = "users";

    private static instance: KeyPairStorage;

    public static get Instance(): KeyPairStorage {
        if(!KeyPairStorage.instance) {
            KeyPairStorage.instance = new KeyPairStorage()
        }

        return KeyPairStorage.instance
    }

    // Create's return value will also contain the unhashed key's secret. This is by design as the end user
    // will need that secret in order validate against the hashed secret. The unhashed secret is stored nowhere in the
    // application
    public async Create(userID:string): Promise<Result<KeyPairT>> {
        const key = Buffer.from(uuid.v4())
        const secret = Buffer.from(uuid.v4())

        const hashedSecret = await bcrypt.hash(secret.toString('base64'), 10)


        const kp: KeyPairT = {
           user_id: userID,
           key: key.toString('base64'),
           secret_raw: secret.toString('base64'),
           secret: hashedSecret
        }

        const success = await super.run(KeyPairStorage.createStatement(kp))
        if(success.isError) {
            return new Promise(resolve => resolve(Result.Pass(success)))
        }

        return new Promise(resolve => resolve(Result.Success(kp)))
    }

    public async ValidateKeyPair(key: string, secretRaw: string): Promise<boolean> {
        const kp = await this.Retrieve(key)
        if(kp.isError || !kp.value.key) return new Promise(resolve => resolve(false))

        const valid = await bcrypt.compare(secretRaw, kp.value.secret)

        return new Promise(resolve => resolve(valid))
    }

    public Retrieve(id: string): Promise<Result<KeyPairT>> {
        return super.retrieve<KeyPairT>(KeyPairStorage.retrieveStatement(id))
    }

    public async UserForKeyPair(key: string): Promise<Result<UserT>> {
       return super.retrieve<UserT>(KeyPairStorage.userForKeyStatement(key))
    }

    public async KeysForUser(userID: string): Promise<Result<KeyPairT[]>> {
        return super.rows<KeyPairT>(KeyPairStorage.keysForUserStatement(userID))
    }

    public PermanentlyDelete(userID: string ,id: string): Promise<Result<boolean>> {
        return super.run(KeyPairStorage.deleteStatement(userID, id))
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private static createStatement(kp: KeyPairT): QueryConfig {
        return {
            text:`INSERT INTO keypairs("key", secret, user_id) VALUES($1, $2, $3)`,
            values: [kp.key, kp.secret,kp.user_id]
        }
    }

    private static retrieveStatement(key:string): QueryConfig {
        return {
            text:`SELECT * FROM keypairs WHERE key = $1`,
            values: [key]
        }
    }

    private static userForKeyStatement(key: string): QueryConfig {
        return {
            text: `SELECT * FROM keypairs LEFT JOIN users on users.id = keypairs.user_id  WHERE key = $1`,
            values: [key]
        }
    }

    private static keysForUserStatement(userID: string): QueryConfig {
        return {
            text: `SELECT key, user_id FROM keypairs WHERE user_id = $1`,
            values: [userID]
        }
    }

    private static deleteStatement(userID:string, key: string): QueryConfig {
        return {
            text:`DELETE FROM keypairs WHERE key = $1 AND user_id = $2`,
            values: [key, userID]
        }
    }
}
