import {FileStorage} from "./file_storage";
import Result from "../result";
import {Stream} from "stream";
import {BlobServiceClient, ContainerClient} from "@azure/storage-blob";

export default class AzureBlobImpl implements FileStorage {
    private _BlobServiceClient: BlobServiceClient
    private _ContainerClient: ContainerClient

    deleteFile(filepath: string): Promise<Result<boolean>> {
        return Promise.resolve(Result.Failure("unimplemented"));
    }

    uploadPipe(filepath: string, encoding: string, mimeType: string, stream: Stream | null): Promise<Result<string>> {
        return Promise.resolve(Result.Failure("unimplemented"));
    }

    constructor(connectionString: string, containerName: string) {
        this._BlobServiceClient = BlobServiceClient.fromConnectionString(connectionString)

        // check to see if the container has been created already
        this._ContainerClient = this._BlobServiceClient.getContainerClient(containerName)

        this._ContainerClient.create()
            .then(response => console.log(response))
            .catch((e: any) => console.log(`ERROR ${e}`))

    }

}
