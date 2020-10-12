// The DataSource interface allows a user to create and implement a new type
// of data source without having to modify a large amount of source code. Hopefully
// by providing this interface we also demonstrate how best to implement a new source.
import Result from "../result";
import {UserT} from "../types/user_management/userT";
import {dataSourceT, DataSourceT} from "../types/import/dataSourceT";
import {HttpImpl} from "../data_importing/httpImpl";
import DataSourceStorage from "../data_storage/import/data_source_storage";
import {pipe} from "fp-ts/lib/pipeable";
import {fold} from "fp-ts/lib/Either";
import {onDecodeError} from "../utilities";
import ImportStorage from "../data_storage/import/import_storage";
import {DataSource} from "../data_importing/data_source"
import {Readable} from "stream";
import {FileT} from "../types/fileT";
import FileStorageProvider, {FileUploadResponse} from "../file_storage/file_storage";
import FileStorage from "../data_storage/file_storage";
import Logger from "../logger";



// Each data source might have its own particular startup needs. Make sure your data source
// is handled in the switch statement below, and that you start any long-running processes
// at this point.
export async function NewDataSource(user:UserT, containerID:string, input: any): Promise<Result<DataSourceT>> {
    return new Promise(resolve => {
        const onSuccess = (res: (r:any) => void): (i: DataSourceT) => void => {
            return async (im: DataSourceT) => {
                switch(im.adapter_type) {
                    case "http": {
                        const http = await HttpImpl.New(containerID, user.id!, im.name, im.config);
                        if(http.isError) resolve(Result.Pass(http));

                        // we set this polling now, the Poll function will check to make
                        // sure if its active and should poll or not
                        http.value.Poll()

                        resolve(Result.Success(http.value.dataSourceT))
                        break;
                    }

                    case "aveva": {
                        const source = await DataSourceStorage.Instance.Create(containerID, user.id!, im)
                        resolve(source)
                        break;
                    }

                    // if manual we don't need to do any more checking, manual does not have its own implementation as of 4/16/20
                    // in order to get data into the manual source use the relevant endpoint to upload either a json file
                    // or array of json objects.
                    case "manual": {
                        const source = await DataSourceStorage.Instance.Create(containerID, user.id!, im)
                        resolve(source)
                        break;
                    }
                }
            }
        };

        pipe(dataSourceT.decode(input), fold(onDecodeError(resolve), onSuccess(resolve)))
    })
}

export async function ManualJsonImport(user:UserT, dataSourceID: string, payload:any): Promise<Result<string>> {
    const dataSource = await DataSourceStorage.Instance.Retrieve(dataSourceID)
    if(dataSource.isError) return new Promise(resolve => resolve(Result.Pass(dataSource)))

    if(dataSource.value.adapter_type !== "manual") return new Promise(resolve => resolve(Result.Failure('cannot run manual import for non-manual data source')))
    if(!Array.isArray(payload)) return new Promise(resolve => resolve(Result.Failure('payload must be an array of JSON objects')))

    const newImport = await ImportStorage.Instance.InitiateImport(dataSourceID, user.id!, "test")

    for(const data of payload) {
        const inserted = await ImportStorage.Instance.AddData(newImport.value, dataSourceID, data)
        if(inserted.isError) {
            Logger.error(`unable to add data to import ${inserted.isError}`)
        }
    }

    return new Promise(resolve => resolve(Result.Success(newImport.value)))
}

// Each data source's configuration is different, this allows us to both set that configuration and perform
// any operations that need to happen (like encrypting passwords) at the same time as we update the config.
export async function SetDataSourceConfiguration(user:UserT, dataSourceID: string, config:any): Promise<Result<boolean>> {
    const importer = await DataSourceStorage.Instance.Retrieve(dataSourceID);
    if(importer.isError) return new Promise(resolve => resolve(Result.Pass(importer)));

    let adapter: DataSource;

    switch(importer.value.adapter_type) {
        case "http": {
            const httpImporter = await HttpImpl.NewFromDataSourceRecord(importer.value);
            if(httpImporter.isError) return new Promise(resolve => resolve(Result.Pass(importer)));

            adapter = httpImporter.value
        }
    }


    return new Promise(resolve => resolve(adapter.SetConfiguration(user.id!, config)))
}

// Sets the data source record to "active" and runs any functionality that needs to be set (like polling)
// when a data source is declared active.
export async function SetDataSourceActive(dataSourceID: string): Promise<Result<boolean>> {
    const dataSource = await DataSourceStorage.Instance.Retrieve(dataSourceID);
    if(dataSource.isError) return new Promise(resolve => resolve(Result.Pass(dataSource)));

    const set = await DataSourceStorage.Instance.SetActive(dataSourceID)
    if(set.isError) return new Promise(resolve => resolve(Result.Pass(set)));


    switch(dataSource.value.adapter_type) {
        case "http": {
            const httpImporter = await HttpImpl.NewFromDataSourceRecord(dataSource.value);
            if(httpImporter.isError) return new Promise(resolve => resolve(Result.Pass(dataSource)));

            httpImporter.value.Poll()
        }
    }


    return new Promise(resolve => resolve(Result.Success(true)))
}

// Upload a file and create a File record in the database. Even if the file record creation fails, we need to maintain
// the file in cold storage as both insurance against data loss and versioning
export async function DataSourceUploadFile(containerID: string, dataSourceID: string, userID:string, filename: string, encoding: string, mimetype: string, stream: Readable): Promise<Result<FileT>> {
    const provider = FileStorageProvider()

    if(!provider) return Promise.resolve(Result.Failure("no storage provider set"))

    // run the actual file upload the storage provider
    const result = await provider.uploadPipe(`containers/${containerID}/datasources/${dataSourceID}/`,filename, stream);
    if(result.isError) return Promise.resolve(Result.Pass(result))

    const file = {
        file_name: filename,
        file_size: result.value.size,
        adapter_file_path: result.value.filepath,
        adapter: provider.name(),
        metadata: result.value.metadata,
    }

    return FileStorage.Instance.Create(userID, containerID, dataSourceID, file)
}

