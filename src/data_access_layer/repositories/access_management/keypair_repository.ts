import KeyPairMapper from '../../mappers/access_management/keypair_mapper';
import bcrypt from 'bcryptjs';
import RepositoryInterface from '../repository';
import { KeyPair, User } from '../../../domain_objects/access_management/user';
import Result from '../../../common_classes/result';

/*
 KeyPairRepository is an extremely simple repository as keys should normally be added and
 saved in the context of a User. There are a few operations however, that don't
 really fit in that repository so they live here
*/
export default class KeyPairRepository implements RepositoryInterface<KeyPair> {
    #mapper = KeyPairMapper.Instance;

    // verify that a user provided key/pair matches the one in the database
    async validateKeyPair(key: string, secretRaw: string): Promise<boolean> {
        const retrieved = await this.#mapper.Retrieve(key);
        if (retrieved.isError) return Promise.resolve(false);

        return bcrypt.compare(secretRaw, retrieved.value.secret!);
    }

    delete(k: KeyPair): Promise<Result<boolean>> {
        return this.#mapper.Delete(k.key);
    }

    findByID(key: string): Promise<Result<KeyPair>> {
        return this.#mapper.Retrieve(key);
    }

    async save(t: KeyPair, user: User): Promise<Result<boolean>> {
        // if we have the secret already set, assume we're dealing with a created
        // keypair
        if (t.secret) return Promise.resolve(Result.Success(true));

        const errors = await t.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`keypair does not pass validation ${errors.join(',')}`));

        try {
            const hashedSecret = await bcrypt.hash(t.secret_raw, 10);
            t.secret = hashedSecret;
        } catch (error) {
            return Promise.resolve(Result.Failure(`unable to hash key's secret ${error}`));
        }

        const created = await this.#mapper.Create(t);
        if (created.isError) return Promise.resolve(Result.Pass(created));

        Object.assign(t, created.value);

        return Promise.resolve(Result.Success(true));
    }
}
