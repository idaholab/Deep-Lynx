import Result from "../result"
import {Readable} from "stream";
import Config from "../config"
import MockFileStorageImpl from "./mock_impl";
import AzureBlobImpl from "./azure_blob_impl";

export interface FileStorage {
    uploadPipe(filepath:string, stream: Readable | null, encoding?:string, mimeType?:string): Promise<Result<string>>
    deleteFile(filepath:string): Promise<Result<boolean>>
}

// Returns an instantiated FileStorage provider if provider method is set.
export default function FileStorageProvider(): FileStorage | null {
    switch (Config.file_storage_method) {
        case "azure_blob_storage": {
            return new AzureBlobImpl(Config.azure_blob_connection_string, Config.azure_blob_container_name)
        }
    }

    return null
}
