import RepositoryInterface, {QueryOptions, Repository} from "../../repository";
import DataSourceRecord, {DataSource} from "../../../../data_warehouse/import/data_source";
import DataSourceMapper from "../../../mappers/data_warehouse/import/data_source_mapper";
import HttpDataSourceImpl from "../../../../data_warehouse/import/http_data_source_impl";
import StandardDataSourceImpl from "../../../../data_warehouse/import/standard_data_source_impl";
import Result from "../../../../common_classes/result";
import {User} from "../../../../access_management/user";
import {PoolClient} from "pg";

export default class DataSourceRepository extends Repository implements RepositoryInterface<DataSource> {
    #mapper = DataSourceMapper.Instance
    #factory = new DataSourceFactory()

    delete(t: DataSource): Promise<Result<boolean>> {
        if(!t.DataSourceRecord || t.DataSourceRecord.id) return Promise.resolve(Result.Failure(`cannot delete data source: no data source record or record lacking id`))

        return this.#mapper.PermanentlyDelete(t.DataSourceRecord.id!)
    }

    async findByID(id: string): Promise<Result<DataSource>> {
        const dataSourceRecord = await this.#mapper.Retrieve(id)
        if(dataSourceRecord.isError) return Promise.resolve(Result.Pass(dataSourceRecord))

        const dataSource = this.#factory.fromDataSourceRecord(dataSourceRecord.value)
        if(!dataSource) return Promise.resolve(Result.Failure(`unable to create data source from data source record`))

        return Promise.resolve(Result.Success(dataSource))
    }

    async save(t: DataSource, user: User): Promise<Result<boolean>> {
        if(!t.DataSourceRecord) return Promise.resolve(Result.Failure(`DataSource must have a data source record instantiated`))

        const errors = await t.DataSourceRecord.validationErrors()
        if(errors) return Promise.resolve(Result.Failure(`attached data source record does not pass validation ${errors.join(",")}`))

        const toSave = await t.ToSave()
        let savedRecord: DataSourceRecord

        if(toSave.id) {
            const updated = await this.#mapper.Update(user.id!, toSave)
            if(updated.isError) return Promise.resolve(Result.Pass(updated))

            savedRecord = updated.value
        } else {
            const created = await this.#mapper.Create(user.id!, toSave)
            if(created.isError) return Promise.resolve(Result.Pass(created))

            savedRecord = created.value
        }

        const newDataSource = this.#factory.fromDataSourceRecord(savedRecord)
        if(!newDataSource) return Promise.resolve(Result.Failure(`unable to instantiate new data source from saved data source record`))

        Object.assign(t, newDataSource)

        return Promise.resolve(Result.Success(true))
    }

    async setInactive(t: DataSource, user: User): Promise<Result<boolean>> {
        if(t.DataSourceRecord && t.DataSourceRecord.id) {
            return this.#mapper.SetInactive(t.DataSourceRecord.id, user.id!)
        }

        else return Promise.resolve(Result.Failure(`data source's record must be instantiated and have an id`))
    }

    // when we set the source active we must remember to start the Process loop
    async setActive(t: DataSource, user: User): Promise<Result<boolean>> {
        if(t.DataSourceRecord && t.DataSourceRecord.id) {
            const set = await this.#mapper.SetActive(t.DataSourceRecord.id, user.id!)
            if(set.isError) return Promise.resolve(Result.Pass(set))

            t.Process()
            return Promise.resolve(Result.Success(true))
        }

        else return Promise.resolve(Result.Failure(`data source's record must be instantiated and have an id`))
    }

    constructor() {
        super(DataSourceMapper.tableName);
    }

    // filter specific functions
    id(operator: string, value: any) {
        super.query("id", operator, value)
        return this
    }

    containerID(operator: string, value: any) {
        super.query("container_id", operator, value)
        return this
    }

    active() {
        super.query("active", "eq", true)
        return this
    }

    inactive() {
        super.query("active", "eq", false)
        return this
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<(DataSource | undefined)[]>> {
        const results = await super.findAll<DataSourceRecord>(options, {transaction, resultClass: DataSourceRecord})
        if (results.isError) return Promise.resolve(Result.Pass(results))

        return Promise.resolve(Result.Success(results.value.map(record => this.#factory.fromDataSourceRecord(record))))
    }
}

// as part of the data source repository we also include the Data Source factory, used
// to take data source records and generate data source interfaces from them.
export class DataSourceFactory {
    fromDataSourceRecord(sourceRecord: DataSourceRecord): StandardDataSourceImpl | HttpDataSourceImpl | undefined {
        switch(sourceRecord.adapter_type) {
            case "http": {
                return new HttpDataSourceImpl(sourceRecord)
            }

            case "standard": {
                return new StandardDataSourceImpl(sourceRecord)
            }

            default: {
                return undefined
            }
        }
    }
}
