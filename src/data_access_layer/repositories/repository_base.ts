import {UserT} from "../../types/user_management/userT";
import Result from "../../result";

export default interface Repository<T> {
    findByID(id: string): Promise<Result<T>>
    save(user: UserT, t:T): Promise<Result<T>>
    delete(t:T): Promise<Result<boolean>>
}
