// Filter is the base class for data storage object filters. Filter will allow
// you to build a class for an individual data type so that you can write complex
// queries.
import Result from "../result";
import PostgresStorage from "./postgresStorage";

export default abstract class Filter {
    private readonly _tableName: string
    private _rawQuery: string[] = []
    private _values: any[] = []


    protected constructor(tableName: string) {
        this._tableName = tableName

        this._rawQuery.push(`SELECT * FROM ${this._tableName}`)
    }

    where() {
        this._rawQuery.push("WHERE")
        return this;
    }

    and() {
        this._rawQuery.push("AND")
        return this
    }

    query(fieldName: string, operator: string, value: any) {
        switch(operator) {
            case "eq": {
               this._rawQuery.push(`${fieldName} = $${this._values.length+1}`);
               this._values.push(value)
            }
        }

        return this
    }

    findAll<T>(): Promise<Result<T[]>> {
        const storage = new PostgresStorage()

        const query = {
            text: this._rawQuery.join(" "),
            values: this._values
        }

        // reset the filter
        this._rawQuery = [`SELECT * FROM ${this._tableName}`]
        this._values = []

        return storage.rows<T>(query)
    }

}
