import {Application, NextFunction, Request, Response} from 'express';
import {authInContainer, authRequest} from '../../../middleware';
import ContainerImport, {ContainerImportT} from '../../../../data_access_layer/mappers/data_warehouse/ontology/container_import';
import ContainerRepository from '../../../../data_access_layer/repositories/data_warehouse/ontology/container_respository';
import {plainToClass} from 'class-transformer';
import Container, {ContainerExport, ContainerConfig} from '../../../../domain_objects/data_warehouse/ontology/container';
import Result from '../../../../common_classes/result';
import {FileInfo} from 'busboy';
import FileRepository from '../../../../data_access_layer/repositories/data_warehouse/data/file_repository';
import DataSourceRepository from '../../../../data_access_layer/repositories/data_warehouse/import/data_source_repository';
import {DataSource} from '../../../../interfaces_and_impl/data_warehouse/import/data_source';
import pAll from 'p-all';
import TypeMappingRepository from '../../../../data_access_layer/repositories/data_warehouse/etl/type_mapping_repository';
import TypeMapping from '../../../../domain_objects/data_warehouse/etl/type_mapping';

const Busboy = require('busboy');
const Buffer = require('buffer').Buffer;
const path = require('path');

const repository = new ContainerRepository();
const containerImport = ContainerImport.Instance;

// This contains all routes pertaining to container management.
export default class ContainerRoutes {
    public static mount(app: Application, middleware: any[]) {
        app.post('/containers', ...middleware, this.createContainer);
        app.post('/containers/import', ...middleware, this.importContainerFromOwl);
        app.put('/containers/import/:containerID', ...middleware, this.updateContainerFromOwl);
        app.put('/containers', ...middleware, authRequest('write', 'containers'), this.batchUpdate);

        // we don't auth this request as the actual handler will only ever show containers
        // to which the user has access
        app.get('/containers', ...middleware, this.listContainers);

        app.get('/containers/:containerID', ...middleware, authInContainer('read', 'data'), this.retrieveContainer);
        app.put('/containers/:containerID', ...middleware, authInContainer('write', 'containers'), this.updateContainer);
        app.delete('/containers/:containerID', ...middleware, authInContainer('write', 'containers'), this.archiveContainer);
        app.post('/containers/:containerID/active', ...middleware, authInContainer('read', 'containers'), this.setActive);

        app.get('/containers/:containerID/export', ...middleware, authInContainer('read', 'ontology'), this.exportContainer);

        app.post('/containers/:containerID/import', ...middleware, authInContainer('write', 'ontology'), this.importContainer);

        app.post('/containers/:containerID/permissions', ...middleware, authRequest('write', 'containers'), this.repairPermissions);

        app.get('/containers/:containerID/alerts', ...middleware, authInContainer('read', 'ontology'), this.listAlerts);
        app.post('/containers/:containerID/alerts/:alertID', ...middleware, authInContainer('write', 'containers'), this.acknowledgeAlert);
    }

    private static createContainer(req: Request, res: Response, next: NextFunction) {
        let toCreate: Container[] = [];

        if (Array.isArray(req.body)) {
            toCreate = plainToClass(Container, req.body);
        } else {
            toCreate = [plainToClass(Container, req.body as object)];
        }

        // set default config if not set in request
        toCreate.forEach((container) => {
            if (!container.config) {
                container.config = new ContainerConfig({
                    data_versioning_enabled: true,
                    ontology_versioning_enabled: false,
                    enabled_data_sources: ['standard', 'http', 'timeseries'],
                });
            }
        });

        repository
            .bulkSave(req.currentUser!, toCreate)
            .then((result) => {
                if (result.isError) {
                    result.asResponse(res);
                    return;
                }

                Result.Success(toCreate).asResponse(res);
            })
            .catch((err) => {
                Result.Error(err).asResponse(res);
            })
            .finally(() => next());
    }

    private static batchUpdate(req: Request, res: Response, next: NextFunction) {
        if (!Array.isArray(req.body)) {
            res.status(500).json(Result.Failure('input must be an array of containers'));
        }

        const containers = plainToClass(Container, req.body);

        repository
            .bulkSave(req.currentUser!, containers)
            .then((result) => {
                if (result.isError) {
                    result.asResponse(res);
                    return;
                }

                Result.Success(containers).asResponse(res);
            })
            .catch((err) => {
                Result.Error(err).asResponse(res);
            })
            .finally(() => next());
    }

    private static retrieveContainer(req: Request, res: Response, next: NextFunction) {
        // the middleware will have fetched the container for us, no need to refecth
        if (req.container) {
            void repository.generateAuthAlert(req.container);

            const result = Result.Success(req.container);
            result.asResponse(res);
            next();
            return;
        }

        Result.Failure('unable to find container', 404).asResponse(res);
        next();
    }

    private static listContainers(req: Request, res: Response, next: NextFunction) {
        repository
            .listForUser(req.currentUser!)
            .then((result) => {
                result.asResponse(res);
            })
            .catch((err) => Result.Failure(err, 404).asResponse(res))
            .finally(() => next());
    }

    private static listAlerts(req: Request, res: Response, next: NextFunction) {
        repository
            .activeAlertsForContainer(req.params.containerID)
            .then((result) => {
                result.asResponse(res);
            })
            .catch((err) => Result.Failure(err, 404).asResponse(res))
            .finally(() => next());
    }

    private static acknowledgeAlert(req: Request, res: Response, next: NextFunction) {
        repository
            .acknowledgeAlert(req.params.alertID, req.currentUser!)
            .then((result) => {
                result.asResponse(res);
            })
            .catch((err) => Result.Failure(err, 404).asResponse(res))
            .finally(() => next());
    }

    private static updateContainer(req: Request, res: Response, next: NextFunction) {
        const container = plainToClass(Container, req.body as object);
        container.id = req.params.containerID;

        repository
            .save(container, req.currentUser!)
            .then((updated) => {
                if (updated.isError) {
                    updated.asResponse(res);
                    return;
                }

                void repository.generateAuthAlert(container);

                Result.Success(container).asResponse(res);
            })
            .catch((err) => Result.Error(err).asResponse(res));
    }

    private static archiveContainer(req: Request, res: Response, next: NextFunction) {
        const user = req.currentUser!;
        if (!req.container) {
            res.status(500).json(Result.Failure(`must provide a container to archive or delete`));
        }
        repository
            .delete(req.container!)
            .then((result) => {
                result.asResponse(res);
            })
            .catch((err) => {
                Result.Error(err).asResponse(res);
            })
            .finally(() => next());
    }

    private static setActive(req: Request, res: Response, next: NextFunction) {
        if (req.container) {
            repository
                .setActive(req.container, req.currentUser!)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                })
                .finally(() => next());
        } else {
            Result.Failure(`unable to find container`, 404).asResponse(res);
            next();
        }
    }

    private static importContainerFromOwl(req: Request, res: Response, next: NextFunction) {
        const streamChunks: Buffer[] = [];
        let fileBuffer: Buffer = Buffer.alloc(0);
        const input: {[key: string]: any} = {};
        const busboy = Busboy({headers: req.headers});
        const user = req.currentUser!;

        // if a file has been provided, create a buffer from it
        busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: FileInfo) => {
            const {filename} = info;
            const ext = path.extname(filename);
            if (ext !== '.owl') {
                Result.Failure('Unsupported filetype supplied. Please provide an .owl file').asResponse(res);
                return;
            }

            file.on('data', (data) => {
                streamChunks.push(data);
            });
            file.on('end', () => {
                fileBuffer = Buffer.concat(streamChunks);
            });
        });

        // create a ContainerImportT type from the input fields
        busboy.on('field', (fieldName: string, value: any) => {
            input[fieldName] = value;
        });

        busboy.on('finish', () => {
            // we have to force the data_versioning to boolean here
            if (input.data_versioning_enabled) input.data_versioning_enabled = String(input.data_versioning_enabled).toLowerCase() === 'true';
            if (input.ontology_versioning_enabled) input.ontology_versioning_enabled = String(input.ontology_versioning_enabled).toLowerCase() === 'true';
            if (input.enabled_data_sources) input.enabled_data_sources = input.enabled_data_sources.split(',');

            containerImport
                .ImportOntology(user, input as ContainerImportT, fileBuffer, String(req.query.dryrun).toLowerCase() === 'true', false, '')
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => {
                    Result.Error(err).asResponse(res);
                });
        });

        return req.pipe(busboy);
    }

    private static updateContainerFromOwl(req: Request, res: Response, next: NextFunction) {
        const streamChunks: Buffer[] = [];
        let fileBuffer: Buffer = Buffer.alloc(0);
        const input: {[key: string]: any} = {};
        const busboy = Busboy({headers: req.headers});
        const user = req.currentUser!;

        // if a file has been provided, create a buffer from it
        busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: FileInfo) => {
            const {filename} = info;
            const ext = path.extname(filename);
            if (ext !== '.owl') {
                res.status(500).send('Unsupported filetype supplied. Please provide a .owl file');
                return;
            }

            file.on('data', (data) => {
                streamChunks.push(data);
            });
            file.on('end', () => {
                fileBuffer = Buffer.concat(streamChunks);
            });
        });

        // create a ContainerImportT type from the input fields
        busboy.on('field', (fieldName: string, value: any) => {
            input[fieldName] = value;
        });

        busboy.on('finish', () => {
            containerImport
                .ImportOntology(user, input as ContainerImportT, fileBuffer, req.query.dryrun === 'false', true, req.params.containerID)
                .then((result) => {
                    result.asResponse(res);
                })
                .catch((err) => Result.Error(err).asResponse(res))
                .finally(() => next());
        });

        return req.pipe(busboy);
    }

    private static repairPermissions(req: Request, res: Response, next: NextFunction) {
        if (!req.container) {
            Result.Failure(`must provide container to repair`).asResponse(res);
            next();
            return;
        }

        req.container
            .setPermissions()
            .then((set) => {
                set.asResponse(res);
            })
            .catch((err) => Result.Error(err).asResponse(res));
    }

    private static async exportContainer(req: Request, res: Response, next: NextFunction) {
        if (!req.container) {
            Result.Failure(`must provide container to export from`).asResponse(res);
            next();
            return;
        }

        let containerExport: ContainerExport = new ContainerExport();
        if (String(req.query.exportOntology).toLowerCase() === 'true') {
            containerExport = (await repository.exportOntology(req.container.id!, req.currentUser!, req.query.ontologyVersionID as string | undefined)).value;
        }
        if (String(req.query.exportDataSources).toLowerCase() === 'true') {
            const dsRepository = new DataSourceRepository();
            const dataSourceExport = await dsRepository.listForExport(req.container.id!);
            containerExport.data_sources = dataSourceExport.value as DataSource[];
        }
        if (String(req.query.exportTypeMappings).toLowerCase() === 'true') {
            // Implement in future update
            const typeRepo = new TypeMappingRepository().where().containerID('eq', req.container?.id);
            const mappings = await typeRepo.list(true);
            containerExport.type_mappings = mappings.value;
        }

        repository
            .createContainerExportFile(req.container.id!, req.currentUser!, containerExport)
            .then((file) => {
                if (file.isError) {
                    file.asResponse(res);
                    return;
                }

                res.attachment(file.value.file_name);
                new FileRepository()
                    .downloadFile(file.value)
                    .then((stream) => {
                        if (!stream) {
                            res.sendStatus(500);
                            return;
                        }

                        stream.pipe(res);
                    })
                    .catch((err) => {
                        Result.Error(err).asResponse(res);
                    });
            })
            .catch((err) => Result.Error(err).asResponse(res));
    }

    private static importContainer(req: Request, res: Response, next: NextFunction) {
        if (!req.container) {
            Result.Failure(`must provide container to import`).asResponse(res);
            next();
            return;
        }

        const streamChunks: Buffer[] = [];
        let fileBuffer: Buffer = Buffer.alloc(0);
        const busboy = Busboy({headers: req.headers});

        // if a file has been provided, create a buffer from it
        busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: FileInfo) => {
            const {filename} = info;
            const ext = path.extname(filename);
            if (ext !== '.json') {
                Result.Failure('Unsupported filetype supplied. Please provide a valid export (.json) file.', 400).asResponse(res);
                next();
                return;
            }

            file.on('data', (data) => {
                streamChunks.push(data);
            });
            file.on('end', () => {
                fileBuffer = Buffer.concat(streamChunks);
            });
        });

        busboy.on('finish', async () => {
            // check query params supplied and attempt to import
            let importErrors = '';
            let ontologyResult = '';
            let dataSourceMap: Map<string, string> | null = null;
            const typeMappingMap: Map<string, string> = new Map();

            const jsonImport = JSON.parse(fileBuffer.toString('utf8').trim());

            if (String(req.query.importOntology).toLowerCase() === 'true') {
                const ontologyImport = await repository.importOntology(req.container!.id!, req.currentUser!, jsonImport);
                if (ontologyImport.isError) {
                    importErrors += ontologyImport.error;
                } else {
                    ontologyResult = ontologyImport.value;
                }
            }
            if (String(req.query.importDataSources).toLowerCase() === 'true') {
                const dsRepository = new DataSourceRepository();
                const dataSourceImport = await dsRepository.importDataSources(req.container!.id!, req.currentUser!, jsonImport);
                if (dataSourceImport.isError) {
                    importErrors += dataSourceImport.error;
                } else {
                    dataSourceMap = dataSourceImport.value;
                }
            }
            if (String(req.query.importTypeMappings).toLowerCase() === 'true') {
                // dependent on successful data source import
                if (dataSourceMap === null) {
                    importErrors +=
                        ' Tye mapping import is dependent on a successful data source import. ' +
                        'Fix data source import errors to enable type mapping import.';
                } else {
                    if (!('type_mappings' in jsonImport)) {
                        importErrors += 'Container export file does not contain all necessary sections for a type mapping import.';
                    }
                    const mappings = jsonImport.type_mappings as TypeMapping[];
                    const mappingRepo = new TypeMappingRepository();

                    const importedMappings: Promise<Result<TypeMapping>[]>[] = [];

                    // for each data source, grab associated type mappings and attempt import
                    for (const [originalID, newID] of dataSourceMap.entries()) {
                        const sourceMappings = mappings.filter((m) => m.data_source_id === originalID);
                        if (sourceMappings.length < 1) continue;

                        importedMappings.push(mappingRepo.importToDataSource(newID, req.currentUser!, false, ...sourceMappings));
                    }

                    const mappingImport = await Promise.all(importedMappings);

                    for (const mappingResult of mappingImport) {
                        for (const mapping of mappingResult) {
                            if (mapping.isError) {
                                importErrors += mapping.error;
                            } else {
                                typeMappingMap.set(mapping.value.id!, 'success');
                            }
                        }
                    }
                }
            }

            const resultMessage = () => {
                let result = 'Container Import Result:';
                if (ontologyResult.length > 0) result += '\n' + ontologyResult;
                if (dataSourceMap) result += `\nData Sources imported: ${dataSourceMap.size}`;
                if (typeMappingMap) result += `\nType Mappings imported: ${typeMappingMap.size}`;
                return result;
            };

            if (importErrors.length > 0) {
                Result.Failure(importErrors + resultMessage()).asResponse(res);
            } else {
                Result.Success(resultMessage()).asResponse(res);
            }

            next();
        });

        return req.pipe(busboy);
    }
}
