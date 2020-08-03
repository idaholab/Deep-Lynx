import {FileStorage, FileUploadResponse} from "./file_storage";
import Result from "../result";
import {Readable} from "stream";
import {BlobServiceClient, ContainerClient, RestError} from "@azure/storage-blob";
import Logger from "../logger";

export default class AzureBlobImpl implements FileStorage {
    private _BlobServiceClient: BlobServiceClient
    private _ContainerClient: ContainerClient

    name(): string {
        return "azure_blob"
    }

    async deleteFile(filepath: string): Promise<Result<boolean>> {
        const blobClient = this._ContainerClient.getBlockBlobClient(filepath)

        const response = await blobClient.delete()
        if(response.errorCode) {
            Logger.error(`error deleting file in azure blob storage ${response.errorCode}`)
            return Promise.resolve(Result.Failure(response.errorCode!))
        }

        return Promise.resolve(Result.Success(true));
    }

    async uploadPipe(filepath: string, filename: string, stream: Readable | null, contentType: string, encoding: string): Promise<Result<FileUploadResponse>> {
        const blobClient = this._ContainerClient.getBlockBlobClient(`${filepath}${filename}`);

        if(stream) {
            // buffer size and max concurrency are set to their default values
            // we only have to set them manually because we need access to the
            // final parameter which are the upload options.
            const uploadResult = await blobClient.uploadStream(
                stream,
                8000,
                5, {blobHTTPHeaders:{
                    blobContentType: contentType,
                    blobContentEncoding: encoding
                }})

            if(uploadResult._response.status !== 201) {
                Logger.error(`error uploading file to azure blob storage ${uploadResult.errorCode}`)
                return Promise.resolve(Result.Failure(`azure service responded with a status ${uploadResult._response.status} on upload`));
            }

            // fetch the properties so we know the content size. This is the only
            // real way of finding file size apart from creating a man in the middle
            // pipe that gets used before the azure blob pipe upload, not ideal
            const props = await blobClient.getProperties()

            return Promise.resolve(Result.Success({
                filepath,
                filename,
                size: (props.contentLength) ? props.contentLength / 1000 : 0 ,
                metadata: {},
                adapter_name: this.name()
            }))
        }

        return Promise.resolve(Result.Failure("must provide a valid Readable stream"));
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
