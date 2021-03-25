import RepositoryInterface, {QueryOptions, Repository} from "../../repository";
import ExportRecord, {Exporter} from "../../../../data_warehouse/export/export";
import {GremlinImpl} from "../../../../data_warehouse/export/gremlin_export_impl";
import ExportMapper from "../../../mappers/data_warehouse/export/export_mapper";
import {SuperUser, User} from "../../../../access_management/user";
import Result from "../../../../result";
import {PoolClient} from "pg";

export default class ExporterRepository extends Repository implements RepositoryInterface<Exporter> {
    #mapper = ExportMapper.Instance

    async delete(t: Exporter, user?: User): Promise<Result<boolean>> {
        if(!t.ExportRecord) return Promise.resolve(Result.Failure(`cannot delete export: no export record present`))
        if(!user) user = SuperUser

        const stopped = await t.Stop(user)
        if(stopped.isError) return Promise.resolve(Result.Failure(`unable to delete export, cannot stop export process ${stopped.error}`))

        return this.#mapper.PermanentlyDelete(t.ExportRecord!.id!)
    }

    async findByID(id: string): Promise<Result<Exporter>> {
        const exportRecord = await this.#mapper.Retrieve(id)
        if(exportRecord.isError) return Promise.resolve(Result.Pass(exportRecord))

        const exporterFactory = new ExporterFactory()
        const exporter = exporterFactory.fromExport(exportRecord.value)

        if(!exporter) return Promise.resolve(Result.Failure(`unable to create exporter from export record`))

        return Promise.resolve(Result.Success(exporter))
    }

    async save(t: Exporter, user: User): Promise<Result<boolean>> {
        const exporterFactory = new ExporterFactory()
        if(!t.ExportRecord) return Promise.resolve(Result.Failure(`Exporter must have export record instantiated`))

        const errors = await t.ExportRecord.validationErrors()
        if(errors) return Promise.resolve(Result.Failure(`attached export record does not pass validation ${errors.join(",")}`))

        // the exporter might need to perform encryption before saving in the database
        // this method allows us to not modify the underlying exporter, but still save
        // a proper record
        const toSave = await t.ToSave()
        let savedRecord: ExportRecord

        if(toSave.id) {
            const updated = await this.#mapper.Update(user.id!, toSave)
            if(updated.isError) return Promise.resolve(Result.Pass(updated))

            savedRecord = updated.value
        } else {
            const created = await this.#mapper.Create(user.id!, toSave)
            if(created.isError) return Promise.resolve(Result.Pass(created))

            savedRecord = created.value
        }

        const newExporter = exporterFactory.fromExport(savedRecord)
        if(!newExporter) return Promise.resolve(Result.Failure(`unable to instantiate new exporter from saved export record`))

        Object.assign(t, newExporter)

        return Promise.resolve(Result.Success(true))
    }

    constructor() {
        super(ExportMapper.tableName);
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

    status(operator: string, value: "created" | "processing" | "paused" | "completed" | "failed") {
        super.query("status", operator, value)
        return this
    }

    count(): Promise<Result<number>> {
        return super.count()
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<(Exporter | undefined)[]>> {
        const factory = new ExporterFactory()

        const results = await super.findAll<ExportRecord>(options, {transaction, resultClass: ExportRecord})
        if (results.isError) return Promise.resolve(Result.Pass(results))

        return Promise.resolve(Result.Success(results.value.map(record => factory.fromExport(record))))
    }
}

// as part of the export repository we also include the Exporter factory, used
// to take export records and generate exporter interfaces from them.
export class ExporterFactory {
    fromExport(exportRecord: ExportRecord): Exporter | undefined {
        switch(exportRecord.adapter) {
            case "gremlin": {
                return new GremlinImpl(exportRecord)
            }
            default: {
                return undefined
            }
        }
    }
}
