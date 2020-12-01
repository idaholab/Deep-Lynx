import PostgresStorage from "../postgresStorage";
import Result from "../../result";
import {QueryConfig} from "pg";
import {ImportT} from "../../types/import/importT";
import uuid from "uuid";
import {QueueProcessor} from "../../event_system/events";
import {EventT} from "../../types/events/eventT";

export default class ImportStorage extends PostgresStorage {
    private static instance: ImportStorage;

    public static get Instance(): ImportStorage {
        if(!ImportStorage.instance) {
            ImportStorage.instance = new ImportStorage()
        }

        return ImportStorage.instance
    }


    public async InitiateImport(dataSourceID: string, userID:string, reference: string): Promise<Result<string>> {
        const id = uuid.v4();

        const initiated = await super.runAsTransaction(ImportStorage.initiateImportStatement(id, dataSourceID,userID, reference))
        if(initiated.isError) {return new Promise(resolve => resolve(Result.Pass(initiated)))}

        return new Promise(resolve => resolve(Result.Success(id)))
    }

    public Retrieve(id: string): Promise<Result<ImportT>> {
        return super.retrieve<ImportT>(ImportStorage.retrieveStatement(id))
    }

    public RetrieveLast(dataSourceID: string): Promise<Result<ImportT>> {
        return super.retrieve<ImportT>(ImportStorage.retrieveLastStatement(dataSourceID))
    }

    public async SetStatus(importID: string, status: "ready" | "processing" | "error" | "stopped" | "completed", message?: string): Promise<Result<boolean>> {
        if (status === "completed") {
            const completeImport = await this.Retrieve(importID)
            const event: EventT = {
                source_id: completeImport.value.data_source_id,
                source_type: "data source",
                type: "data ingested",
                data: importID
            }
            QueueProcessor.Instance.addEvents([event])
        }
        return super.runAsTransaction(ImportStorage.setStatusStatement(importID, status, message))
    }

    public async List(importAdapterID:string, offset:number, limit:number): Promise<Result<ImportT[]>>{
        return super.rows<ImportT>(ImportStorage.listStatement(importAdapterID,offset,limit))
    }

    public async ListReady(dataSourceID:string, offset:number, limit:number): Promise<Result<ImportT[]>>{
        return super.rows<ImportT>(ImportStorage.listReady(dataSourceID,offset,limit))
    }

    public async PermanentlyDelete(importID: string): Promise<Result<boolean>> {
        return super.run(ImportStorage.deleteStatement(importID))
    }

    // can only allow deletes on unprocessed imports
    private static deleteStatement(importID: string): QueryConfig {
        return {
            text:`DELETE FROM imports WHERE id = $1 AND status <> 'processed'`,
            values: [importID]
        }
    }

    private static initiateImportStatement(id: string, dataSourceID: string, userID:string, reference:string): QueryConfig {
        return {
            text: `INSERT INTO imports(id,data_source_id,created_by,modified_by, reference) VALUES($1,$2,$3,$4,$5)`,
            values: [id,dataSourceID,userID, userID, reference]
        }
    }

    private static retrieveStatement(logID: string): QueryConfig {
        return {
            text: `SELECT * FROM imports WHERE id = $1`,
            values: [logID]
        }
    }

    private static retrieveLastStatement(logID: string): QueryConfig {
        return {
            text: `SELECT * FROM imports WHERE data_source_id = $1 ORDER BY modified_at DESC NULLS LAST LIMIT 1 `,
            values: [logID]
        }
    }

    private static setStatusStatement(id:string, status: "ready" | "processing" | "error" | "stopped" | "completed", message?: string): QueryConfig {
        return {
            text: `UPDATE imports SET status = $2, status_message = $3, modified_at = NOW() WHERE id = $1`,
            values: [id, status, message]
        }
    }

    private static listStatement(importAdapterID: string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT id,
                    data_source_id,
                    status,
                    status_message,
                    created_at,
                    reference,
                    modified_at FROM imports WHERE data_source_id = $1 OFFSET $2 LIMIT $3`,
            values: [importAdapterID, offset, limit]
        }
    }

    private static listReady(importAdapterID: string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM imports WHERE data_source_id = $1 AND status = 'ready' OFFSET $2 LIMIT $3`,
            values: [importAdapterID, offset, limit]
        }
    }
}
