import PostgresStorage from "../postgresStorage";
import Result from "../../result";
import {QueryConfig} from "pg";
import {ImportT} from "../../types/import/importT";
import uuid from "uuid";

export default class ImportStorage extends PostgresStorage {
    private static instance: ImportStorage;

    public static get Instance(): ImportStorage {
        if(!ImportStorage.instance) {
            ImportStorage.instance = new ImportStorage()
        }

        return ImportStorage.instance
    }

    public InitiateJSONImportAndUnpack(dataSourceID: string, userID:string, reference: string, payload: any): Promise<Result<boolean>> {
        const id = uuid.v4();

        return super.runAsTransaction(
            ImportStorage.initiateImportJSONStatement(id, dataSourceID,userID, reference, payload), ImportStorage.unpackJsonStatement(id)
        )
    }

    public async InitiateJSONImport(dataSourceID: string, userID:string, reference: string, payload: any): Promise<Result<string>> {
        const id = uuid.v4();

        const initiated = await super.runAsTransaction(ImportStorage.initiateImportJSONStatement(id, dataSourceID,userID, reference, payload))
        if(initiated.isError) {return new Promise(resolve => resolve(Result.Pass(initiated)))}

        return new Promise(resolve => resolve(Result.Success(id)))
    }

    public AppendToJSONImport(importID: string, payload: any): Promise<Result<boolean>> {
        return super.runAsTransaction(ImportStorage.appendToJSONImportStatement(importID, payload))
    }

    public UnpackJSONImport(importID: string): Promise<Result<boolean>> {
        return super.runAsTransaction(ImportStorage.unpackJsonStatement(importID))
    }

    public InitiateCSVImport(dataSourceID: string, userID:string, reference:string, payload: any): Promise<Result<boolean>> {
        return super.runAsTransaction(ImportStorage.initiateImportCSVStatement(dataSourceID,userID, reference, payload))
    }

    public Retrieve(id: string): Promise<Result<ImportT>> {
        return super.retrieve<ImportT>(ImportStorage.retrieveStatement(id))
    }

    public RetrieveLast(dataSourceID: string): Promise<Result<ImportT>> {
        return super.retrieve<ImportT>(ImportStorage.retrieveLastStatement(dataSourceID))
    }

    public SetStopped(id: string): Promise<Result<boolean>> {
        return super.runAsTransaction(ImportStorage.setStoppedStatement(id))
    }

    public SetErrors(id:string, errors: string[]): Promise<Result<boolean>> {
        return super.runAsTransaction(ImportStorage.setErrorsStatement(id, errors))
    }

    public async List(importAdapterID:string, offset:number, limit:number): Promise<Result<ImportT[]>>{
        return super.rows<ImportT>(ImportStorage.listStatement(importAdapterID,offset,limit))
    }

    public async ListUncompleted(dataSourceID:string, offset:number, limit:number): Promise<Result<ImportT[]>>{
        return super.rows<ImportT>(ImportStorage.listUncompletedStatement(dataSourceID,offset,limit))
    }

    private static initiateImportJSONStatement(id: string, dataSourceID: string, userID:string, reference:string,  payload:any): QueryConfig {
        return {
            text: `INSERT INTO imports(id,data_source_id,data_json,created_by,modified_by, reference) VALUES($1,$2,$3,$4,$5,$6)`,
            values: [id,dataSourceID,JSON.stringify(payload), userID, userID, reference]
        }
    }

    private static appendToJSONImportStatement(importID: string, payload:any): QueryConfig {
        return {
            text: `UPDATE imports SET data_json = data_json || $2::jsonb WHERE id = $1`,
            values: [importID, JSON.stringify(payload)]
        }
    }

    private static initiateImportCSVStatement(dataSourceID: string, userID:string, reference:string, payload:any): QueryConfig {
        return {
            text: `INSERT INTO imports(id,data_source_id,data_csv,created_by,modified_by) VALUES($1,$2,$3,$4,$5,$6)`,
            values: [uuid.v4(),dataSourceID,payload, userID, userID, reference]
        }
    }

    private static unpackJsonStatement(importID: string): QueryConfig {
        return {
            text: `SELECT "unpack_import_row"($1);`,
            values: [importID]
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
            text: `SELECT * FROM imports WHERE data_source_id = $1 ORDER BY stopped_at DESC NULLS LAST LIMIT 1 `,
            values: [logID]
        }
    }

    private static setStoppedStatement(logID:string): QueryConfig {
        return {
            text: `UPDATE imports SET stopped_at = NOW() WHERE id = $1`,
            values: [logID]
        }
    }

    private static setErrorsStatement(logID: string, errors: string[]): QueryConfig {
        return {
            text: `UPDATE imports SET errors = $1 WHERE id = $2`,
            values: [errors, logID]
        }
    }

    private static listStatement(importAdapterID: string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT id,
                    data_source_id,
                    started_at,
                    stopped_at,
                    errors,
                    created_at,
                    reference,
                    modified_at FROM imports WHERE data_source_id = $1 OFFSET $2 LIMIT $3`,
            values: [importAdapterID, offset, limit]
        }
    }

    private static listUncompletedStatement(importAdapterID: string, offset:number, limit:number): QueryConfig {
        return {
            text: `SELECT * FROM imports WHERE data_source_id = $1 AND stopped_at IS NULL OFFSET $2 LIMIT $3`,
            values: [importAdapterID, offset, limit]
        }
    }
}
