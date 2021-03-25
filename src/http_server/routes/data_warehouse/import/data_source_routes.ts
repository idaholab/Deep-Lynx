import {Application, NextFunction, Request, Response} from "express"
import {authInContainer} from "../../../middleware";
import {NewDataSource, SetDataSourceActive, SetDataSourceConfiguration} from "../../../data_source";
import DataSourceStorage from "../../../../data_access_layer/mappers/data_warehouse/import/data_source_storage";

// This contains all routes pertaining to DataSources.
export default class DataSourceRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post("/containers/:containerID/import/datasources", ...middleware, authInContainer("write", "data"), this.createDataSource);
        app.get("/containers/:containerID/import/datasources", ...middleware, authInContainer("read", "data"), this.listDataSources);
        app.get("/containers/:containerID/import/datasources/:sourceID", ...middleware, authInContainer("read", "data"), this.retrieveDataSource);
        app.put("/containers/:containerID/import/datasources/:sourceID", ...middleware, authInContainer("read", "data"), this.setConfiguration);
        app.delete("/containers/:containerID/import/datasources/:sourceID", ...middleware, authInContainer("read", "data"), this.deleteDataSource);

        app.post("/containers/:containerID/import/datasources/:sourceID/active", ...middleware, authInContainer("read", "data"), this.setActive);
        app.delete("/containers/:containerID/import/datasources/:sourceID/active", ...middleware, authInContainer("read", "data"), this.setInactive);
    }

    private static createDataSource(req: Request, res: Response, next: NextFunction) {
        NewDataSource(req.currentUser! , req.params.id, req.body)
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

    private static setConfiguration(req: Request, res: Response, next: NextFunction) {
        SetDataSourceConfiguration(req.currentUser! , req.params.sourceID, req.body)
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

    private static retrieveDataSource(req: Request, res: Response, next: NextFunction) {
        DataSourceStorage.Instance.Retrieve(req.params.sourceID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                // TODO: slightly hacky, might be a better way of doing this.
                // this is needed to remove encrypted data from the return
                if (result.value.config) {
                    // @ts-ignore
                    delete result.value.config.token
                    // @ts-ignore
                    delete result.value.config.username
                    // @ts-ignore
                    delete result.value.config.password
                }

                res.status(200).json(result)
            })
            .catch((err) => {
                res.status(404).send(err)
            })
            .finally(() => next())
    }

    private static setActive(req: Request, res: Response, next: NextFunction) {
        SetDataSourceActive(req.params.sourceID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.sendStatus(200)
            })
            .catch((err) => res.status(404).send(err))
            .finally(() => next())
    }

    private static setInactive(req: Request, res: Response, next: NextFunction) {
        DataSourceStorage.Instance.SetInactive(req.params.sourceID)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                res.sendStatus(200)
            })
            .catch((err) => {
                res.status(404).send(err)
            })
            .finally(() => next())
    }

    private static listDataSources(req: Request, res: Response, next: NextFunction) {
        DataSourceStorage.Instance.ListForContainer(req.params.id)
            .then((result) => {
                if (result.isError && result.error) {
                    res.status(result.error.errorCode).json(result);
                    return
                }

                for (const i in result.value) {
                    // TODO: slightly hacky, might be a better way of doing this.
                    // this is needed to remove encrypted data from the return
                    if (result.value[i].config) {
                        // @ts-ignore
                        delete result.value[i].config.token
                        // @ts-ignore
                        delete result.value[i].config.username
                        // @ts-ignore
                        delete result.value[i].config.password
                    }

                }

                res.status(200).json(result)
            })
            .catch((err) => {
                res.status(404).send(err)
            })
            .finally(() => next())
    }

    private static deleteDataSource(req: Request, res: Response, next: NextFunction) {
        DataSourceStorage.Instance.PermanentlyDelete(req.params.sourceID)
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

