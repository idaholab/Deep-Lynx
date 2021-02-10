import Result from "../result";
import {HttpImpl} from "./httpImpl";
import DataSourceStorage from "../data_storage/import/data_source_storage";
import Logger from "../logger"

export interface DataSource {
    Poll(): Promise<void>
    SetConfiguration(userID: string, config: any): Promise<Result<boolean>>
}

// This is used on application startup to ensure that any active data sources which need to poll
// for data are running.
export async function StartDataSourcePolling(): Promise<Result<boolean>> {
    Logger.debug('starting data source polling');
    // first get all data sources
    const sources = await DataSourceStorage.Instance.ListActive();
    if(sources.isError) return new Promise(resolve => resolve(Result.Failure('unable to list data sources for polling')));

    // for each data source initiate the proper class
    for(const source of sources.value) {
        switch(source.adapter_type) {
            case "http": {
                const httpImporter = await HttpImpl.NewFromDataSourceRecord(source);
                if(httpImporter.isError) {
                    Logger.error(`unable to initiate http importer ${httpImporter.error}`)
                    continue
                }

                httpImporter.value.Poll()
            }
        }
    }

    // for each class set it to "Poll"
    return new Promise(resolve => resolve(Result.Success(true)))
}
