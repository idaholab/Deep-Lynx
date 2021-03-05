import Filter from "./filter";
import FileStorage from "./file_storage";
import {FileT} from "../../types/fileT";
import Result from "../../result";

export default class FileFilter extends Filter {
    constructor() {
        super(FileStorage.tableName);
    }

    id(operator: string, value: any) {
        super.query("id", operator, value)
        return this
    }

    containerID(operator: string, value: any) {
        super.query("container_id", operator, value)
        return this
    }

    dataSourceID(operator: string, value: any) {
        super.query("data_source_id", operator, value)
        return this
    }

    adapter(operator: string, value: any) {
        super.query("adapter", operator, value)
        return this
    }

    file_name(operator: string, value: any) {
        super.query("file_name", operator, value)
        return this
    }

    all(limit?: number, offset?:number): Promise<Result<FileT[]>> {
        return super.findAll<FileT>(limit, offset)
    }
}
