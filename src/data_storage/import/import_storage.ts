import PostgresStorage from "../postgresStorage";
import Result from "../../result";
import {QueryConfig} from "pg";
import {ImportT} from "../../types/import/importT";
import uuid from "uuid";
import {QueueProcessor} from "../../services/event_system/events";
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
        if (status === "completed" || status === "stopped" || status === "error") {
            const completeImport = await this.Retrieve(importID)
            QueueProcessor.Instance.emit([{
                source_id: completeImport.value.data_source_id,
                source_type: "data_source",
                type: "data_ingested",
                data: {
                    import_id: importID,
                    status
                }
            } as EventT])
        }
        return super.runAsTransaction(ImportStorage.setStatusStatement(importID, status, message))
    }

    public async List(dataSourceID:string, offset:number, limit:number, sortBy?: string, sortDesc?: boolean): Promise<Result<ImportT[]>>{
        if(limit === -1) {
            return super.rows<ImportT>(ImportStorage.listAllStatement(dataSourceID))
        }
        return super.rows<ImportT>(ImportStorage.listStatement(dataSourceID,offset,limit, sortBy, sortDesc))
    }

    public async ListIncompleteWithUninsertedData(dataSourceID: string) : Promise<Result<ImportT[]>> {
        return super.rows<ImportT>(ImportStorage.listIncompleteWithUninsertedDataStatement(dataSourceID))
    }

    public async Count(): Promise<Result<number>> {
        return super.count(ImportStorage.countStatement())
    }

    public async ListReady(dataSourceID:string, offset:number, limit:number): Promise<Result<ImportT[]>>{
        return super.rows<ImportT>(ImportStorage.listReadyStatement(dataSourceID,offset,limit))
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

    private static listStatement(dataSourceID: string, offset?:number, limit?:number, sortBy?:string, sortDesc?: boolean): QueryConfig {
        if(sortDesc) {
            return {
                text: `SELECT imports.id,
                    imports.data_source_id,
                    imports.status,
                    imports.status_message,
                    imports.created_at,
                    imports.reference,
                    imports.modified_at,
                    SUM(CASE WHEN data_staging.inserted_at <> NULL AND data_staging.import_id = imports.id THEN 1 ELSE 0 END) AS records_inserted,
                    SUM(CASE WHEN data_staging.import_id = imports.id THEN 1 ELSE 0 END) as total_records
                    FROM imports
                    LEFT JOIN data_staging ON data_staging.import_id = imports.id
                    WHERE imports.data_source_id = $1
                    GROUP BY imports.id
                    ORDER BY "${sortBy}" DESC
                    OFFSET $2 LIMIT $3`,
                values: [dataSourceID, offset, limit]
            }
        } else if (sortBy) {
            return {
                text: `SELECT imports.id,
                    imports.data_source_id,
                    imports.status,
                    imports.status_message,
                    imports.created_at,
                    imports.reference,
                    imports.modified_at,
                    SUM(CASE WHEN data_staging.inserted_at <> NULL AND data_staging.import_id = imports.id THEN 1 ELSE 0 END) AS records_inserted,
                    SUM(CASE WHEN data_staging.import_id = imports.id THEN 1 ELSE 0 END) as total_records
                    FROM imports
                    LEFT JOIN data_staging ON data_staging.import_id = imports.id
                    WHERE imports.data_source_id = $1
                    GROUP BY imports.id
                    ORDER BY "${sortBy}" ASC
                    OFFSET $2 LIMIT $3`,
                values: [dataSourceID, offset, limit]
            }
        } else {
            return {
                text: `SELECT imports.id,
                    imports.data_source_id,
                    imports.status,
                    imports.status_message,
                    imports.created_at,
                    imports.reference,
                    imports.modified_at,
                    SUM(CASE WHEN data_staging.inserted_at <> NULL AND data_staging.import_id = imports.id THEN 1 ELSE 0 END) AS records_inserted,
                    SUM(CASE WHEN data_staging.import_id = imports.id THEN 1 ELSE 0 END) as total_records
                    FROM imports
                    LEFT JOIN data_staging ON data_staging.import_id = imports.id
                    WHERE imports.data_source_id = $1
                    GROUP BY imports.id
                    OFFSET $2 LIMIT $3`,
                values: [dataSourceID, offset, limit]
            }
        }
    }

    private static listAllStatement(dataSourceID: string): QueryConfig {
        return {
            text: `SELECT imports.id,
                          imports.data_source_id,
                          imports.status,
                          imports.status_message,
                          imports.created_at,
                          imports.reference,
                          imports.modified_at,
                          SUM(CASE WHEN data_staging.inserted_at <> NULL AND data_staging.import_id = imports.id THEN 1 ELSE 0 END) AS records_inserted,
                          SUM(CASE WHEN data_staging.import_id = imports.id THEN 1 ELSE 0 END) as total_records
                   FROM imports
                            LEFT JOIN data_staging ON data_staging.import_id = imports.id
                   WHERE imports.data_source_id = $1
                   GROUP BY imports.id`,
            values: [dataSourceID]
        }
    }

    private static listReadyStatement(dataSourceID: string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM imports WHERE data_source_id = $1 AND status = 'ready' OFFSET $2 LIMIT $3`,
            values: [dataSourceID, offset, limit]
        }
    }

    private static listIncompleteWithUninsertedDataStatement(dataSourceID: string): QueryConfig {
        return {
            text: `SELECT imports.*
            FROM imports
            WHERE imports.status <> 'completed'
            AND imports.data_source_id = $1
            AND EXISTS (SELECT * FROM data_staging WHERE data_staging.import_id = imports.id AND data_staging.inserted_at IS NULL)
            AND EXISTS(SELECT * FROM data_staging WHERE data_staging.import_id = imports.id)
            `,
            values: [dataSourceID]
        }
    }

    private static countStatement(): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM imports`
        }
    }
}
