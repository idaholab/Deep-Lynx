import Mapper from "../../mapper";
import Result from "../../../../common_classes/result";
import {PoolClient, QueryConfig} from "pg";
import uuid from "uuid";
import {QueueProcessor} from "../../../../event_system/processor";
import Event from "../../../../event_system/event";
import Import from "../../../../data_warehouse/import/import";


const format = require('pg-format')
const resultClass = Import

/*
    ImportMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class ImportMapper extends Mapper {
    public static tableName = "imports"
    private static instance: ImportMapper;

    public static get Instance(): ImportMapper {
        if(!ImportMapper.instance) {
            ImportMapper.instance = new ImportMapper()
        }

        return ImportMapper.instance
    }

    public async CreateImport(userID:string, importRecord: Import): Promise<Result<Import>> {
        const r = await super.run(this.createStatement(userID, importRecord), {resultClass})
        if(r.isError) return Promise.resolve(Result.Pass(r))

        return Promise.resolve(Result.Success(r.value[0]))
    }

    public Retrieve(id: string): Promise<Result<Import>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass})
    }

    // client is not optional here as the lock only applies if your call is in the
    // context of a transaction
    public RetrieveAndLock(id: string, transaction: PoolClient, wait?: boolean): Promise<Result<Import>> {
        return super.retrieve(this.retrieveLockStatement(id, wait), {transaction, resultClass})
    }

    // client is not optional here as the lock only applies if your call is in the
    // context of a transaction
    public RetrieveLastAndLock(dataSourceID: string, transaction: PoolClient): Promise<Result<Import>> {
        return super.retrieve(this.retrieveLastAndLockStatement(dataSourceID), {transaction, resultClass})
    }

    public RetrieveLast(dataSourceID: string): Promise<Result<Import>> {
        return super.retrieve(this.retrieveLastStatement(dataSourceID), {resultClass})
    }

    public async SetStatus(importID: string, status: "ready" | "processing" | "error" | "stopped" | "completed", message?: string, transaction?: PoolClient): Promise<Result<boolean>> {
        if (status === "completed" || status === "stopped" || status === "error") {
            const completeImport = await this.Retrieve(importID)
            QueueProcessor.Instance.emit(new Event({
                sourceID: completeImport.value.data_source_id!,
                sourceType: "data_source",
                type: "data_ingested",
                data: {
                    import_id: importID,
                    status
                }
            }))
        }
        return super.runStatement(this.setStatusStatement(importID, status, message), {transaction})
    }


    public async ListIncompleteWithUninsertedData(dataSourceID: string) : Promise<Result<Import[]>> {
        return super.rows(this.listIncompleteWithUninsertedDataStatement(dataSourceID), {resultClass})
    }

    public async Count(): Promise<Result<number>> {
        return super.count(this.countStatement())
    }

    public async PermanentlyDelete(importID: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(importID))
    }

    // can only allow deletes on unprocessed imports
    private deleteStatement(importID: string): QueryConfig {
        return {
            text:`DELETE FROM imports WHERE id = $1 AND status <> 'processed'`,
            values: [importID]
        }
    }

    private createStatement(userID: string, ...imports: Import[]): string {
        const text = `INSERT INTO imports(
            id,
            data_source_id,
            reference,
            created_by,
            modified_by) VALUES %L RETURNING *`
        const values = imports.map(i => [
            uuid.v4(),
            i.data_source_id,
            i.reference,
            userID,userID])

        return format(text, values)
    }

    private retrieveStatement(logID: string): QueryConfig {
        return {
            text: `SELECT * FROM imports WHERE id = $1`,
            values: [logID]
        }
    }

    private retrieveLockStatement(logID: string, wait?: boolean): QueryConfig {
        if(wait) {
            return {
                text: `SELECT * FROM imports WHERE id = $1 FOR UPDATE`,
                values: [logID]
            }
        }

        return {
            text: `SELECT * FROM imports WHERE id = $1 FOR UPDATE NOWAIT`,
            values: [logID]
        }
    }

    private retrieveLastStatement(logID: string): QueryConfig {
        return {
            text: `SELECT * FROM imports WHERE data_source_id = $1 ORDER BY modified_at DESC NULLS LAST LIMIT 1`,
            values: [logID]
        }
    }

    private retrieveLastAndLockStatement(logID: string): QueryConfig {
        return {
            text: `SELECT * FROM imports WHERE data_source_id = $1 ORDER BY modified_at DESC NULLS LAST LIMIT 1 FOR UPDATE NOWAIT `,
            values: [logID]
        }
    }

    private setStatusStatement(id:string, status: "ready" | "processing" | "error" | "stopped" | "completed", message?: string): QueryConfig {
        return {
            text: `UPDATE imports SET status = $2, status_message = $3, modified_at = NOW() WHERE id = $1`,
            values: [id, status, message]
        }
    }

    private listIncompleteWithUninsertedDataStatement(dataSourceID: string): QueryConfig {
        return {
            text: `SELECT imports.*,
                          SUM(CASE WHEN data_staging.inserted_at <> NULL AND data_staging.import_id = imports.id THEN 1 ELSE 0 END) AS records_inserted,
                          SUM(CASE WHEN data_staging.import_id = imports.id THEN 1 ELSE 0 END) as total_records
                   FROM imports
                   LEFT JOIN data_staging ON data_staging.import_id = imports.id
                   WHERE imports.status <> 'completed'
                     AND imports.data_source_id = $1
                     AND EXISTS (SELECT * FROM data_staging WHERE data_staging.import_id = imports.id AND data_staging.inserted_at IS NULL)
                     AND EXISTS(SELECT * FROM data_staging WHERE data_staging.import_id = imports.id)
                   GROUP BY imports.id`,
            values: [dataSourceID]
        }
    }

    private countStatement(): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM imports`
        }
    }
}
