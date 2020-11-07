import {Request, Response, NextFunction, Application} from "express"
import ContainerStorage from "../data_storage/container_storage";
import {CreateContainer, ListContainers, RepairContainerPermissions} from "../api_handlers/container";
import {NewDataExport, StartExport, StopExport} from "../data_exporting/exporter";
import {UserT} from "../types/user_management/userT";
import ExportStorage from "../data_storage/export/export_storage";
import {authRequest, authInContainer} from "./middleware";
import ContainerImport from "../data_storage/import/container_import";
import { ContainerImportT } from "../types/import/containerImportT";
const Busboy = require('busboy');
const Buffer = require('buffer').Buffer;

const storage = ContainerStorage.Instance;
const exportStorage = ExportStorage.Instance;
const containerImport = ContainerImport.Instance;

// This contains all routes pertaining to container management. This also contains routes for the export functionality
// as it was not large enough to pull into its own functionality.
export default class ContainerRoutes {
    public static mount(app: Application, middleware:any[]) {
        app.post("/containers", ...middleware,this.createContainer);
        app.put("/containers",...middleware,authRequest("write", "containers"),this.batchUpdate);

        // we don't auth this request as the actual handler will only ever show containers
        // to which the user has access
        app.get("/containers",...middleware,this.listContainers);

        app.get("/containers/:id",...middleware, authInContainer("read", "data"),this.retrieveContainer);
        app.put("/containers/:id",...middleware, authInContainer("write", "data"),this.updateContainer);
        app.delete("/containers/:id",...middleware, authInContainer("write", "data"),this.archiveContainer);

        app.post("/containers/import",...middleware, authInContainer("write", "containers"),this.importContainer)

        app.post("/containers/:id/data/export",...middleware, authInContainer("write", "data"),this.exportDataFromContainer);
        app.get("/containers/:id/data/export/:exportID",...middleware, authInContainer("read", "data"),this.getExport);
        app.post("/containers/:id/data/export/:exportID",...middleware, authInContainer("write", "data"),this.startExport);
        app.put("/containers/:id/data/export/:exportID",...middleware, authInContainer("write", "data"),this.stopExport);
        app.delete("/containers/:id/data/export/:exportID",...middleware, authInContainer("write", "data"),this.deleteExport);

        app.post("/containers/:id/permissions", ...middleware, authRequest("write", "containers"), this.repairPermissions)
    }

    private static createContainer(req: Request, res: Response, next: NextFunction) {
        CreateContainer(req.user as UserT, req.body)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static batchUpdate(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        storage.BatchUpdate(user.id!, req.body)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }


    private static retrieveContainer(req: Request, res: Response, next: NextFunction) {
        storage.Retrieve(req.params.id)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(200).json(result)
            })
            .catch((err) => res.status(404).send(err))
            .finally(() => next())
    }

    private static async listContainers(req: Request, res: Response, next: NextFunction) {
        ListContainers(req.user as UserT)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }
                res.status(200).json(result)
            })
            .catch((err) => res.status(404).send(err))
            .finally(() => next())
    }

    private static updateContainer(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        storage.Update(req.params.id, user.id!, req.body)
            .then((updated) => {
                if (updated.isError && updated.error) {
                    res.status(updated.error.errorCode).json(updated);
                    return
                }
                res.status(200).json(updated)
            })
            .catch((updated) => res.status(500).send(updated))
    }

    private static archiveContainer(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserT;

        if(req.query.permanent === 'true') {
            storage.PermanentlyDelete(req.params.id)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }
                res.sendStatus(200)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
        } else {
            storage.Archive(req.params.id, user.id!)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }
                res.sendStatus(200)
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
            containerImport.ImportOntology(user, input as ContainerImportT, fileBuffer, req.query.dryrun === 'true')
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
        })

        return req.pipe(busboy)
    }

    private static exportDataFromContainer(req: Request, res: Response, next: NextFunction) {
        NewDataExport(req.user as UserT,req.params.id, req.body)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static getExport(req: Request, res: Response, next: NextFunction) {
        exportStorage.Retrieve(req.params.exportID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }
    private static startExport(req: Request, res: Response, next: NextFunction) {
        StartExport(req.user as UserT,req.params.exportID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static stopExport(req: Request, res: Response, next: NextFunction) {
        StopExport(req.user as UserT,req.params.exportID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static deleteExport(req: Request, res: Response, next: NextFunction) {
        exportStorage.PermanentlyDelete(req.params.exportID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.status(201).json(result)
            })
            .catch((err) => res.status(500).send(err))
            .finally(() => next())
    }

    private static repairPermissions(req: Request, res: Response, next: NextFunction) {
        RepairContainerPermissions(req.params.id)
            .then((updated) => {
                if (!updated) {
                    res.sendStatus(500);
                    return
                }
                res.status(200).json(updated)
            })
            .catch((updated) => res.status(500).send(updated))
    }
}

