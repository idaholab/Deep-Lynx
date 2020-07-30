import {FileStorage} from "./file_storage";
import Result from "../result";
import {Readable} from "stream";
import {BlobServiceClient, ContainerClient, RestError} from "@azure/storage-blob";
import Logger from "../logger";

export default class AzureBlobImpl implements FileStorage {
    private _BlobServiceClient: BlobServiceClient
    private _ContainerClient: ContainerClient

    deleteFile(filepath: string): Promise<Result<boolean>> {
        return Promise.resolve(Result.Failure("unimplemented"));
    }

    async uploadPipe(filepath: string, stream: Readable | null): Promise<Result<string>> {
        const blobClient = this._ContainerClient.getBlockBlobClient(filepath);

        if(stream) {
            const uploadResult = await blobClient.uploadStream(stream)

            if(uploadResult._response.status !== 201) {
                return Promise.resolve(Result.Failure(`azure service responded with a status ${uploadResult._response.status} on upload`));
            }

            return Promise.resolve(Result.Success(`${JSON.stringify(uploadResult)}`))
        }

        return Promise.resolve(Result.Failure("unimplemented"));
    }

    constructor(connectionString: string, containerName: string) {
        this._BlobServiceClient = BlobServiceClient.fromConnectionString(connectionString)

        // check to see if the container has been created already
        this._ContainerClient = this._BlobServiceClient.getContainerClient(containerName)

        this._BlobServiceClient.listContainers()

        this._ContainerClient.create()
            .then(response => Logger.info('azure container successfully created'))
            .catch((e: RestError) => {
                // ignore conflict rest errors as those indicate the container
                // was created previously. We don't need to note that
                if(e.statusCode !== 409) {
                    Logger.error(`unable to create new azure container - ${e}`)
                }
            })

    }

}
