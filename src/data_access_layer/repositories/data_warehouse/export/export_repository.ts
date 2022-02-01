import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import ExportRecord from '../../../../domain_objects/data_warehouse/export/export';
import {GremlinImpl} from '../../../../interfaces_and_impl/data_warehouse/export/gremlin_export_impl';
import ExportMapper from '../../../mappers/data_warehouse/export/export_mapper';
import {SuperUser, User} from '../../../../domain_objects/access_management/user';
import Result from '../../../../common_classes/result';
import {PoolClient} from 'pg';
import {Exporter} from '../../../../interfaces_and_impl/data_warehouse/export/exporter';

/*
    ExportRepository contains methods for persisting and retrieving data exports
    to storage as well as managing things like validation and the starting/stopping
    of said data exports. Currently the only export source accepted is a Gremlin
    enabled graph database. Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning. This repository especially
    returns an interface vs. concrete class and exposes more operations than exist
    if you just use the mapper.
 */
export default class ExporterRepository extends Repository implements RepositoryInterface<Exporter> {
    #mapper = ExportMapper.Instance;
    #factory = new ExporterFactory();

    async delete(t: Exporter, user?: User): Promise<Result<boolean>> {
        if (!t.ExportRecord || !t.ExportRecord.id)
            return Promise.resolve(Result.Failure(`cannot delete export: no export record present or export record lacking id`));
        if (!user) user = SuperUser;

        // must stop the export prior to deletion - this allows the exporter to run
        // any needed cleanup prior to deletion.
        const stopped = await t.Stop(user);
        if (stopped.isError) return Promise.resolve(Result.Failure(`unable to delete export, cannot stop export process ${stopped.error}`));

        return this.#mapper.Delete(t.ExportRecord.id);
    }

    async findByID(id: string): Promise<Result<Exporter>> {
        const exportRecord = await this.#mapper.Retrieve(id);
        if (exportRecord.isError) return Promise.resolve(Result.Pass(exportRecord));

        const exporter = this.#factory.fromExport(exportRecord.value);

        if (!exporter) return Promise.resolve(Result.Failure(`unable to create exporter from export record`));

        return Promise.resolve(Result.Success(exporter));
    }

    async save(t: Exporter, user: User): Promise<Result<boolean>> {
        if (!t.ExportRecord) return Promise.resolve(Result.Failure(`Exporter must have export record instantiated`));

        const errors = await t.ExportRecord.validationErrors();
        if (errors) return Promise.resolve(Result.Failure(`attached export record does not pass validation ${errors.join(',')}`));

        // the exporter might need to perform encryption before saving in the database
        // this method allows us to not modify the underlying exporter, but still save
        // a proper record
        const toSave = await t.ToSave();
        let savedRecord: ExportRecord;

        if (toSave.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(toSave.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            const originalToSave = await original.value.ToSave();

            Object.assign(originalToSave, toSave);

            const updated = await this.#mapper.Update(user.id!, originalToSave);
            if (updated.isError) return Promise.resolve(Result.Pass(updated));

            savedRecord = updated.value;
        } else {
            const created = await this.#mapper.Create(user.id!, toSave);
            if (created.isError) return Promise.resolve(Result.Pass(created));

            savedRecord = created.value;
        }

        const newExporter = this.#factory.fromExport(savedRecord);
        if (!newExporter) return Promise.resolve(Result.Failure(`unable to instantiate new exporter from saved export record`));

        Object.assign(t, newExporter);

        return Promise.resolve(Result.Success(true));
    }

    constructor() {
        super(ExportMapper.tableName);
    }

    // filter specific functions
    id(operator: string, value: any) {
        super.query('id', operator, value);
        return this;
    }

    containerID(operator: string, value: any) {
        super.query('container_id', operator, value);
        return this;
    }

    status(operator: string, value: 'created' | 'processing' | 'paused' | 'completed' | 'failed') {
        super.query('status', operator, value);
        return this;
    }

    count(): Promise<Result<number>> {
        return super.count();
    }

    async list(options?: QueryOptions, transaction?: PoolClient): Promise<Result<(Exporter | undefined)[]>> {
        const results = await super.findAll<ExportRecord>(options, {
            transaction,
            resultClass: ExportRecord,
        });
        if (results.isError) return Promise.resolve(Result.Pass(results));

        return Promise.resolve(Result.Success(results.value.map((record) => this.#factory.fromExport(record))));
    }
}

// as part of the export repository we also include the Exporter factory, used
// to take export records and generate exporter interfaces from them. Currently
// only the GremlinImpl is supported
export class ExporterFactory {
    fromExport(exportRecord: ExportRecord): Exporter | undefined {
        switch (exportRecord.adapter) {
            case 'gremlin': {
                return new GremlinImpl(exportRecord);
            }
            default: {
                return undefined;
            }
        }
    }
}
