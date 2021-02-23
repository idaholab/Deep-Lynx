import Result from "../result";
import {UserT} from "../types/user_management/userT";
import {exportT, ExportT} from "../types/export/exportT";
import {pipe} from "fp-ts/lib/pipeable";
import {fold} from "fp-ts/lib/Either";
import {GremlinImpl} from "./gremlinImpl";
import ExportStorage from "../data_storage/export/export_storage";
import {onDecodeError} from "../utilities";
import Logger from "../logger"

// The exporter interface allows the user to create a standard implementation
// for data export and implement it with minimum amount of work.
export interface Exporter {
    Start(userID: string): Promise<Result<boolean>>
    Stop(userID: string): Promise<Result<boolean>>
    Reset(userID: string): Promise<Result<boolean>>
    Status(): string
}

// Create a new data export, with each adapter needing to be implemented represented as a case
export async function NewDataExport(user: UserT, containerID: string, input: any): Promise<Result<ExportT>> {
    return new Promise(resolve => {
        const onSuccess = (res: (r:any) => void): (e: ExportT)=> void => {
            return async (ex: ExportT) => {
                switch(ex.adapter) {
                    case "gremlin": {
                        const gremlin = await GremlinImpl.NewExport(containerID, user.id!, ex);
                        if(gremlin.isError) resolve(Result.Pass(gremlin));

                        resolve(Result.Success(gremlin.value.exportT))
                    }
                }
            }
        };

        pipe(exportT.decode(input), fold(onDecodeError(resolve), onSuccess(resolve)))
    })
}


// Starts an export based on export record created by the above function.
export async function StartExport(user: UserT, exportID: string, reset?: boolean): Promise<Result<boolean>> {
    const exportStorage = ExportStorage.Instance;

    const exportRecord = await exportStorage.Retrieve(exportID);
    if(exportRecord.isError) return new Promise(resolve => resolve(Result.Pass(exportRecord)));

    let exporter: Exporter;

    switch(exportRecord.value.adapter) {
        case "gremlin": {
            const gremlin = await GremlinImpl.FromExportRecord(exportID);
            if(gremlin.isError) return new Promise(resolve => resolve(Result.Pass(gremlin)));

            exporter = gremlin.value
        }
    }

    if(reset) {
        return exporter.Reset(user.id!)
    }

    return exporter.Start(user.id!)
}

// Restarts all previously running exports. This exists so that if the application
// restarts we don't have to start the export from scratch, or are left with orphaned data
export async function RestartExports(): Promise<Result<boolean>> {
    Logger.debug('restarting exports that were processing before shutdown or interruption');
    const exportStorage = ExportStorage.Instance;

    const exportRecords = await exportStorage.ListByStatus("processing");
    if(exportRecords.isError) return new Promise(resolve => resolve(Result.Pass(exportRecords)));

    for(const exportRecord of exportRecords.value) {
        let exporter: Exporter;

        switch(exportRecord.adapter) {
            case "gremlin": {
                const gremlin = await GremlinImpl.FromExportRecord(exportRecord.id!);
                if(gremlin.isError) return new Promise(resolve => resolve(Result.Pass(gremlin)));

                exporter = gremlin.value
            }
        }

        exporter.Start("automatic export restart")
    }

    return new Promise(resolve => resolve(Result.Success(true)))
}

export async function StopExport(user: UserT, exportID: string): Promise<Result<boolean>> {
    const exportStorage = ExportStorage.Instance;

    const exportRecord = await exportStorage.Retrieve(exportID);
    if(exportRecord.isError) return new Promise(resolve => resolve(Result.Pass(exportRecord)));

    let exporter: Exporter;

    switch(exportRecord.value.adapter) {
        case "gremlin": {
            const gremlin = await GremlinImpl.FromExportRecord(exportID);
            if(gremlin.isError) return new Promise(resolve => resolve(Result.Pass(gremlin)));

            exporter = gremlin.value
        }
    }

    return exporter.Stop(user.id!)
}

// Deletes an export record. NOTE: This does not delete data that might have already been exported nor
// does it delete data inside the data warehouse.
export async function DeleteExport(user: UserT, exportID: string): Promise<Result<boolean>> {
    const exportStorage = ExportStorage.Instance;

    const exportRecord = await exportStorage.Retrieve(exportID);
    if(exportRecord.isError) return new Promise(resolve => resolve(Result.Pass(exportRecord)));

    let exporter: Exporter;

    switch(exportRecord.value.adapter) {
        case "gremlin": {
            const gremlin = await GremlinImpl.FromExportRecord(exportID);
            if(gremlin.isError) return new Promise(resolve => resolve(Result.Pass(gremlin)));

            exporter = gremlin.value
        }
    }

    const stopped = await exporter.Stop(user.id!);
    if(stopped.isError) return new Promise(resolve => resolve(Result.Failure('cannot stop export, abandoning delete request')));

    return exportStorage.PermanentlyDelete(exportID)
}
