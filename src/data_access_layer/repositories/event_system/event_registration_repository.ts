import RepositoryInterface, {QueryOptions, Repository} from "../repository";
import EventRegistration from "../../../event_system/event_registration";
import EventRegistrationMapper from "../../mappers/event_system/event_registration_mapper";
import Result from "../../../result";
import {plainToClass} from "class-transformer";
import {User} from "../../../access_management/user";

export default class EventRegistrationRepository extends Repository implements RepositoryInterface<EventRegistration> {
    #mapper: EventRegistrationMapper = EventRegistrationMapper.Instance
    delete(e: EventRegistration): Promise<Result<boolean>> {
        if(e.id){
           return this.#mapper.PermanentlyDelete(e.id)
        }

        return Promise.resolve(Result.Failure(`event registration has no ide`))
    }

    findByID(id: string): Promise<Result<EventRegistration>> {
        return this.#mapper.Retrieve(id)
    }

    async save(user: User, e: EventRegistration): Promise<Result<boolean>> {
        const errors = await e.validationErrors()
        if(errors) {
            return Promise.resolve(Result.Failure(`event registration does not pass validation ${errors.join(",")}`))
        }

        if(e.id) {
            const updated = await this.#mapper.Update(user.id!, e)
            if(updated.isError) return Promise.resolve(Result.Pass(updated))

            Object.assign(e, updated.value)
        } else {
            const created = await this.#mapper.Create(user.id!, e)
            if(created.isError) return Promise.resolve(Result.Pass(created))

            Object.assign(e, created.value)
        }
        return Promise.resolve(Result.Success(true))
    }

    setActive(user:User, e: EventRegistration): Promise<Result<boolean>> {
        return this.#mapper.SetActive(e.id!, user.id!)
    }

    setInactive(user:User, e: EventRegistration): Promise<Result<boolean>> {
        return this.#mapper.SetInActive(e.id!, user.id!)
    }

    constructor() {
        super(EventRegistrationMapper.tableName);
    }

    containerID(operator: string, value: any) {
        super.query("container_id", operator, value)
        return this
    }

    dataSourceID(operator: string, value: any) {
        super.query("data_source_id", operator, value)
        return this
    }

    eventType(operator: string, value: any) {
        super.query("event_type", operator, value)
        return this
    }

    count(): Promise<Result<number>> {
        return super.count()
    }

    async list(options?: QueryOptions): Promise<Result<EventRegistration[]>> {
        const results = await super.findAll<object>(options)
        if(results.isError) return Promise.resolve(Result.Pass(results))

        return Promise.resolve(Result.Success(plainToClass(EventRegistration, results.value)))
    }
}
