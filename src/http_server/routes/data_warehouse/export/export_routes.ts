import {Request, Response, NextFunction, Application} from "express"
import {NewDataExport, StartExport, StopExport} from "../../../../data_warehouse/export/exporter";
import ExportStorage from "../../../../data_access_layer/mappers/data_warehouse/export/export_storage";
import {authInContainer} from "../../../middleware";

const exportStorage = ExportStorage.Instance;

// Endpoints specific to data exporting
export default class ExportRoutes {
    public static mount(app: Application, middleware:any[]) {
        app.get("/containers/:id/data/export", ...middleware, authInContainer("read", "data"), this.listExports)
        app.post("/containers/:id/data/export",...middleware, authInContainer("write", "data"), this.exportDataFromContainer);
        app.get("/containers/:id/data/export/:exportID",...middleware, authInContainer("read", "data"), this.getExport);
        app.post("/containers/:id/data/export/:exportID",...middleware, authInContainer("write", "data"), this.startExport);
        app.put("/containers/:id/data/export/:exportID",...middleware, authInContainer("write", "data"), this.stopExport);
        app.delete("/containers/:id/data/export/:exportID",...middleware, authInContainer("write", "data"), this.deleteExport);
    }

    private static exportDataFromContainer(req: Request, res: Response, next: NextFunction) {
        NewDataExport(req.currentUser! ,req.params.id, req.body)
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

    private static listExports(req: Request, res: Response, next: NextFunction) {
        // @ts-ignore
        if(req.query.sortBy) {
            // @ts-ignore
            exportStorage.List(req.params.id, +req.query.offset, +req.query.limit, req.query.sortBy, req.query.sortDesc === 'true')
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return
                    }

                    res.status(200).json(result)
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next())
        } else if(req.query.count) {
            // @ts-ignore
            exportStorage.Count(req.params.id)
                .then((result) => {
                    if (result.isError && result.error) {
                        res.status(result.error.errorCode).json(result);
                        return
                    }

                    res.status(200).json(result)
                })
                .catch((err) => res.status(404).send(err))
                .finally(() => next())
        } else {
            // @ts-ignore
            exportStorage.List(req.params.id, +req.query.offset, +req.query.limit)
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
    }

    private static startExport(req: Request, res: Response, next: NextFunction) {
        StartExport(req.currentUser! ,req.params.exportID, req.query.restart === 'true')
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
        StopExport(req.currentUser! ,req.params.exportID)
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
}
