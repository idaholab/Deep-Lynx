import Result from '../../../common_classes/result';
import Mapper from '../mapper';
import {PoolClient, QueryConfig} from 'pg';
import {KeyPair, User} from '../../../domain_objects/access_management/user';

const format = require('pg-format');

/*
    KeyPairMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class KeyPairMapper extends Mapper {
    public resultClass = KeyPair;
    public static tableName = 'users';

    private static instance: KeyPairMapper;

    public static get Instance(): KeyPairMapper {
        if (!KeyPairMapper.instance) {
            KeyPairMapper.instance = new KeyPairMapper();
        }

        return KeyPairMapper.instance;
    }

    // Create's return value will also contain the un-hashed key's secret. This is by design as the end user
    // will need that secret in order validate against the hashed secret. The un-hashed secret is stored nowhere in the
    // application
    public async Create(key: KeyPair, transaction?: PoolClient): Promise<Result<KeyPair>> {
        const r = await super.run(this.createStatement(key), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));
        r.value[0].secret_raw = key.secret_raw;

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(keys: KeyPair[], transaction?: PoolClient): Promise<Result<KeyPair[]>> {
        const r = await super.run(this.createStatement(...keys), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        r.value.forEach((key, i) => (key.secret_raw = keys[i].secret_raw));

        return Promise.resolve(Result.Success(r.value));
    }

    public async BulkDelete(keys: KeyPair[], transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.bulkDeleteStatement(keys), {
            transaction,
        });
    }

    public async Retrieve(id: string): Promise<Result<KeyPair>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass: this.resultClass});
    }

    public async UserForKeyPair(key: string): Promise<Result<User>> {
        return super.retrieve(this.userForKeyStatement(key), {
            resultClass: User,
        });
    }

    public async KeysForUser(userID: string, note?: string): Promise<Result<KeyPair[]>> {
        if (note) {
            return super.rows(this.keysForUserByNoteStatement(userID, note), {resultClass: this.resultClass});
        } else {
            return super.rows(this.keysForUserStatement(userID), {resultClass: this.resultClass});
        }
    }

    public DeleteForUser(key: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteForUserStatement(key, userID));
    }

    public Delete(key: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(key));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(...keys: KeyPair[]): string {
        const text = `INSERT INTO keypairs("key", secret, user_id, note) VALUES %L RETURNING *`;
        const values = keys.map((key) => [key.key, key.secret, key.user_id, key.note]);

        return format(text, values);
    }

    private bulkDeleteStatement(keys: KeyPair[]): string {
        const text = `DELETE FROM keypairs WHERE key IN(%L)`;
        const values = keys.filter((k) => k.key).map((k) => k.key);

        return format(text, values);
    }

    private retrieveStatement(key: string): QueryConfig {
        return {
            text: `SELECT * FROM keypairs WHERE key = $1`,
            values: [key],
        };
    }

    private userForKeyStatement(key: string): QueryConfig {
        return {
            text: `SELECT * FROM keypairs LEFT JOIN users on users.id = keypairs.user_id  WHERE key = $1`,
            values: [key],
        };
    }

    private keysForUserStatement(userID: string): QueryConfig {
        return {
            text: `SELECT key, user_id, note FROM keypairs WHERE user_id = $1`,
            values: [userID],
        };
    }

    private keysForUserByNoteStatement(userID: string, note: string): QueryConfig {
        return {
            text: `SELECT key, user_id, note FROM keypairs WHERE user_id = $1 AND note = $2`,
            values: [userID, note]
        }
    }

    private deleteStatement(key: string): QueryConfig {
        return {
            text: `DELETE FROM keypairs WHERE key = $1`,
            values: [key],
        };
    }

    private deleteForUserStatement(key: string, userID: string): QueryConfig {
        return {
            text: `DELETE FROM keypairs WHERE key = $1 AND user_id = $2`,
            values: [key, userID],
        };
    }
}
