import Filter from "./filter";
import MetatypeStorage from "./metatype_storage";
import Result from "../result";
import {MetatypeT} from "../types/metatypeT";

export default class MetatypeFilter extends Filter {
   constructor() {
       super(MetatypeStorage.tableName);
   }

    id(operator: string, value: any) {
        super.query("id", operator, value)
        return this
    }

    containerID(operator: string, value: any) {
        super.query("container_id", operator, value)
        return this
    }

    name(operator: string, value: any) {
        super.query("name", operator, value)
        return this
    }

    description(operator: string, value: any) {
        super.query("description", operator, value)
        return this
    }

    archived(operator: string, value: any) {
        super.query("archived", operator, value)
        return this
    }

    all(limit?: number, offset?:number): Promise<Result<MetatypeT[]>> {
        return super.findAll<MetatypeT>(limit, offset)
    }
}
