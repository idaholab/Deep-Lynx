import {Request, Response, NextFunction, Application} from "express"
import {UserT} from "../../../../types/user_management/userT";
import {authRequest, authInContainer} from "../../../middleware";
import ContainerImport from "../../../../data_access_layer/mappers/data_warehouse/ontology/container_import";
import { ContainerImportT } from "../../../../types/import/containerImportT";
import ContainerRepository from "../../../../data_access_layer/repositories/data_warehouse/ontology/container_respository";
import {plainToClass} from "class-transformer";
import Container from "../../../../data_warehouse/ontology/container";
import Result from "../../../../result";
const Busboy = require('busboy');
const Buffer = require('buffer').Buffer;
const path = require('path')

const repository = new ContainerRepository();
const containerImport = ContainerImport.Instance;

// This contains all routes pertaining to container management.
export default class ContainerRoutes {
    public static mount(app: Application, middleware:any[]) {
        app.post("/containers", ...middleware,this.createContainer);
        app.post("/containers/import",...middleware,this.importContainer)
        app.put("/containers/import/:containerID",...middleware,this.importUpdatedContainer)
        app.put("/containers",...middleware,authRequest("write", "containers"),this.batchUpdate);

        // we don't auth this request as the actual handler will only ever show containers
        // to which the user has access
        app.get("/containers",...middleware,this.listContainers);

        app.get("/containers/:containerID",...middleware, authInContainer("read", "data"),this.retrieveContainer);
        app.put("/containers/:containerID",...middleware, authInContainer("write", "data"),this.updateContainer);
        app.delete("/containers/:containerID",...middleware, authInContainer("write", "data"),this.archiveContainer);

        app.post("/containers/:containerID/permissions", ...middleware, authRequest("write", "containers"), this.repairPermissions)
    }

    private static createContainer(req: Request, res: Response, next: NextFunction) {
        const payload = plainToClass(Container, req.body as object)
        repository.save(req.user as UserT, payload)
            .then((result) => {
                if(result.isError) {
                    result.asResponse(res)
                    return
                }

                Result.Success(payload).asResponse(res)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static batchUpdate(req: Request, res: Response, next: NextFunction) {
        if(!Array.isArray(req.body)){
            res.status(500).json(Result.Failure("input must be an array of containers"))
        }

        const containers = plainToClass(Container, req.body)

        repository.bulkSave(req.user as UserT, containers)
            .then((result) => {
                if(result.isError){
                    result.asResponse(res)
                    return
                }

                Result.Success(containers).asResponse(res)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static retrieveContainer(req: Request, res: Response, next: NextFunction) {
        // the middleware will have fetched the container for us, no need to refecth
        if(req.container) {
            const result = Result.Success(req.container)
            result.asResponse(res)
            next()
            return
        }

        res.status(404).json(Result.Failure('unable to find container'))
        next()
    }

    private static async listContainers(req: Request, res: Response, next: NextFunction) {
        repository.listForUser(req.user as UserT)
            .then((result) => {
                result.asResponse(res)
            })
            .catch((err) => res.status(404).send(err))
            .finally(() => next())
    }

    private static updateContainer(req: Request, res: Response, next: NextFunction) {
        const container = plainToClass(Container, req.body as object)
        container.id = req.params.containerID

        repository.save(req.user as UserT, container)
            .then((updated) => {
                if(updated.isError){
                    updated.asResponse(res)
                    return
                }

                Result.Success(container).asResponse(res)
            })
            .catch((updated) => res.status(500).send(updated))
    }

    private static archiveContainer(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;
        if(!req.container) {
            res.status(500).json(Result.Failure(`must provide a container to archive or delete`))
        }

        if(req.query.permanent === 'true') {
            repository.delete(req.container!)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        } else {
            repository.archive(user, req.container!)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        }
    }

    private static importContainer(req: Request, res: Response, next: NextFunction) {
        const streamChunks: Buffer[] = []
        let fileBuffer: Buffer = Buffer.alloc(0)
        const input: {[key: string]: any} = {}
        const busboy = new Busboy({headers: req.headers})
        const user = req.user as UserT

        // if a file has been provided, create a buffer from it
        busboy.on('file', async (fieldname: string, file: NodeJS.ReadableStream, filename: string, encoding: string, mimeType: string) => {
            const ext = path.extname(filename)
            if (ext !== '.owl') {
                res.status(500).send('Unsupported filetype supplied. Please provide a .owl file')
                return
            }

            file.on('data', (data) => {
                streamChunks.push(data)
            });
            file.on('end', () => {
                fileBuffer = Buffer.concat(streamChunks)
            });
        })

        // create a ContainerImportT type from the input fields
        busboy.on('field', (fieldName: string, value: any, fieldNameTruncated: boolean, encoding: string, mimetype:string) => {
            input[fieldName] = value
        })

        busboy.on('finish', () => {
            containerImport.ImportOntology(user, input as ContainerImportT, fileBuffer, req.query.dryrun === 'true', false, '')
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        })

        return req.pipe(busboy)
    }

    private static importUpdatedContainer(req: Request, res: Response, next: NextFunction) {
        const streamChunks: Buffer[] = []
        let fileBuffer: Buffer = Buffer.alloc(0)
        const input: {[key: string]: any} = {}
        const busboy = new Busboy({headers: req.headers})
        const user = req.user as UserT

        // if a file has been provided, create a buffer from it
        busboy.on('file', async (fieldname: string, file: NodeJS.ReadableStream, filename: string, encoding: string, mimeType: string) => {
            const ext = path.extname(filename)
            if (ext !== '.owl') {
                res.status(500).send('Unsupported filetype supplied. Please provide a .owl file')
                return
            }

            file.on('data', (data) => {
                streamChunks.push(data)
            });
            file.on('end', () => {
                fileBuffer = Buffer.concat(streamChunks)
            });
        })

        // create a ContainerImportT type from the input fields
        busboy.on('field', (fieldName: string, value: any, fieldNameTruncated: boolean, encoding: string, mimetype:string) => {
            input[fieldName] = value
        })

        busboy.on('finish', () => {
            containerImport.ImportOntology(user, input as ContainerImportT, fileBuffer, req.query.dryrun === 'false', true, req.params.containerID)
                .then((result) => {
                    result.asResponse(res)
                })
                .catch((err) => res.status(500).send(err))
                .finally(() => next())
        })

        return req.pipe(busboy)
    }

    private static repairPermissions(req: Request, res: Response, next: NextFunction) {
        if(!req.container) {
           res.status(500).json(Result.Failure('must provide container to repair'))
           next()
           return
        }

        req.container.setPermissions()
            .then(set => {
                set.asResponse(res)
            })
            .catch((err) => res.status(500).send(err))
    }
}
