// this is an extremely simple repository as keys should normally be added and
// saved in the context of a User. There are a few operations however, that don't
// really fit in that repository so they live here
import KeyPairMapper from "../../mappers/access_management/keypair_mapper";
import bcrypt from "bcrypt"

export default class KeyPairRepository {
    #mapper = KeyPairMapper.Instance
    async validateKeyPair(key: string, secretRaw: string): Promise<boolean> {
        const retrieved = await this.#mapper.Retrieve(key)
        if(retrieved.isError) return Promise.resolve(false)

        return bcrypt.compare(secretRaw, retrieved.value.secret!)
    }
}
