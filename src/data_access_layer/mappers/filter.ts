// Filter is the base class for data storage object filters. Filter will allow
// you to build a class for an individual data type so that you can write complex
// queries.
import Result from "../../result";
import PostgresStorage from "./postgresStorage";

export default abstract class Filter {
    private readonly _tableName: string
    public _rawQuery: string[] = []
    public _values: any[] = []


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

    or() {
        this._rawQuery.push("OR")
        return this
    }

    queryJsonb(key: string, fieldName: string, operator:string, value: any) {
        this._rawQuery.push(`${fieldName}`)

        // the key can be a dot.notation nested set of keys
        const keys = key.split(".")
        const finalKey = keys.pop()

        for(const i in keys) {
            keys[i] = `'${keys[i]}'`
        }

        if(keys.length > 0) {
            this._rawQuery.push(`-> ${keys.join("->")}`)
        }

        switch(operator) {
            case "eq": {
                this._values.push(value)
                this._rawQuery.push(`->> '${finalKey}' = $${this._values.length}`);
                break;
            }
            case "neq" : {
                this._values.push(value)
                this._rawQuery.push(`->> '${finalKey}' <> $${this._values.length}`);
                break;
            }
            case "like": {
                this._values.push(value)
                this._rawQuery.push(`->> '${finalKey}' LIKE $${this._values.length}`);
                break;
            }
            case "in": {
                let values: any[] = []
                if (!Array.isArray(value)) {
                    values = `${value}`.split(",") // support comma separated lists
                } else {
                    values = value
                }

                const output: string[] = []

                values.forEach(v => {
                    output.push(`'${v}'`)
                })

                this._rawQuery.push(`->> ${finalKey} IN (${output.join(',')})`)
                break;

            }
        }

        return this;
    }

    query(fieldName: string, operator: string, value: any) {
        switch(operator) {
            case "eq": {
                this._values.push(value)
                this._rawQuery.push(`${fieldName} = $${this._values.length}`);
                break;
            }
            case "neq" :{
                this._values.push(value)
                this._rawQuery.push(`${fieldName} <> $${this._values.length}`);
                break;
            }
            case "like":{
                this._values.push(value)
                this._rawQuery.push(`${fieldName} LIKE $${this._values.length}`);
                break;
            }
            case "in":{
                let values: any[] = []
                if(!Array.isArray(value)) {
                    values =`${value}`.split(",") // support comma separated lists
                } else {
                    values = value
                }

                const output: string[] = []

                values.forEach(v => {
                    output.push(`'${v}'`)
                })

                this._rawQuery.push(`${fieldName} IN (${output.join(',')})`)
                break;
            }
        }

        return this
    }

    findAll<T>(limit?: number, offset?: number, sortBy?: string, sortDesc?: boolean): Promise<Result<T[]>> {
        const storage = new PostgresStorage()

        if(sortBy) {
            if(sortDesc) {
                this._rawQuery.push(`ORDER BY "${sortBy}" DESC`)
            } else {
                this._rawQuery.push(`ORDER BY "${sortBy}" ASC`)
            }
        }

        if(offset) {
            this._values.push(offset)
            this._rawQuery.push(`OFFSET $${this._values.length}`)
        }

        if(limit) {
            this._values.push(limit)
            this._rawQuery.push(`LIMIT $${this._values.length}`)
        }

        const query = {
            text: this._rawQuery.join(" "),
            values: this._values
        }

        // reset the filter
        this._rawQuery = [`SELECT * FROM ${this._tableName}`]
        this._values = []

        return storage.rows<T>(query)
    }

    count(): Promise<Result<number>> {
        const storage = new PostgresStorage()

        // modify the original query to be count
        this._rawQuery[0] = `SELECT COUNT(*) FROM ${this._tableName}`

        const query = {
            text: this._rawQuery.join(" "),
            values: this._values
        }

        // reset the filter
        this._rawQuery = [`SELECT * FROM ${this._tableName}`]
        this._values = []

        return storage.count(query)
    }
}
