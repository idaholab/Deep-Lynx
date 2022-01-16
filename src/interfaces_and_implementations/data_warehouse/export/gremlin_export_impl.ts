import ExportRecord, {GremlinExportConfig} from '../../../domain_objects/data_warehouse/export/export';
import GremlinAdapter from '../../../services/gremlin/gremlin';
import Config from '../../../services/config';
import ExportMapper from '../../../data_access_layer/mappers/data_warehouse/export/export_mapper';
import Result from '../../../common_classes/result';
import GremlinExportMapper from '../../../data_access_layer/mappers/data_warehouse/export/gremlin_export_mapper';
import Logger from '../../../services/logger';
import MetatypeRelationshipPairMapper from '../../../data_access_layer/mappers/data_warehouse/ontology/metatype_relationship_pair_mapper';
import NodeRSA from 'node-rsa';
import MetatypeRepository from '../../../data_access_layer/repositories/data_warehouse/ontology/metatype_repository';
import {NakedDomainClass} from '../../../common_classes/base_domain_class';
import {IsObject, IsOptional, IsUUID} from 'class-validator';
import {plainToClass} from 'class-transformer';
import {User} from '../../../domain_objects/access_management/user';
import {Exporter} from './exporter';

// first the classes required by the Gremlin implementation
export class GremlinEdge extends NakedDomainClass {
    @IsOptional()
    @IsUUID()
    id?: string;

    @IsUUID()
    relationship_pair_id?: string;

    @IsObject()
    properties: object = {};

    @IsUUID()
    origin_node_id?: string;

    @IsUUID()
    destination_node_id?: string;

    @IsOptional()
    gremlin_edge_id?: string;

    @IsUUID()
    export_id?: string;

    @IsUUID()
    container_id?: string;

    constructor(input: {
        relationship_pair_id: string;
        properties?: object;
        origin_node_id: string;
        destination_node_id: string;
        gremlin_edge_id?: string;
        export_id: string;
        container_id: string;
    }) {
        super();

        if (input) {
            this.relationship_pair_id = input.relationship_pair_id;
            if (input.properties) this.properties = input.properties;
            this.origin_node_id = input.origin_node_id;
            this.destination_node_id = input.destination_node_id;
            if (input.gremlin_edge_id) this.gremlin_edge_id = input.gremlin_edge_id;
            this.export_id = input.export_id;
            this.container_id = input.container_id;
        }
    }
}

export class GremlinNode extends NakedDomainClass {
    @IsOptional()
    @IsUUID()
    id?: string;

    @IsUUID()
    metatype_id?: string;

    @IsObject()
    properties: object = {};

    @IsOptional()
    gremlin_node_id?: string;

    @IsUUID()
    export_id?: string;

    @IsUUID()
    container_id?: string;

    constructor(input: {metatype_id: string; properties?: object; gremlin_node_id?: string; export_id: string; container_id: string}) {
        super();

        if (input) {
            this.metatype_id = input.metatype_id;
            if (input.properties) this.properties = input.properties;
            if (input.gremlin_node_id) this.gremlin_node_id = input.gremlin_node_id;
            this.export_id = input.export_id;
            this.container_id = input.container_id;
        }
    }
}

/*
 The Gremlin implementation of the Exporter interface allows the application to export
 all data to a Gremlin enabled graph database. The exporter will attempt to connect to
 the service using the Gremlin driver and on secure connection, export the data using
 the same driver.
*/
export class GremlinImpl implements Exporter {
    public ExportRecord?: ExportRecord;
    public client?: GremlinAdapter;

    // creating a new GremlinImpl assumes the configuration being passed in is not
    // encrypted in anyway. The exporter itself will handle encryption and storage
    // after successfully creating a client.
    constructor(exportRecord: ExportRecord) {
        // again we have to check for param existence because we might potentially be using class-transformer
        if (exportRecord) {
            // if this is coming from the database it will have an id - this indicates
            // we need to decrypt certain parts of the config before working
            if (exportRecord.id) {
                const key = new NodeRSA(Config.encryption_key_secret);

                try {
                    if ((exportRecord.config! as GremlinExportConfig).user) {
                        (exportRecord.config as GremlinExportConfig).user = key.decryptPublic((exportRecord.config as GremlinExportConfig).user, 'utf8');
                    }

                    if ((exportRecord.config! as GremlinExportConfig).key) {
                        (exportRecord.config as GremlinExportConfig).key = key.decryptPublic((exportRecord.config as GremlinExportConfig).key, 'utf8');
                    }
                } catch (err) {
                    Logger.error(`error while attempting to decrypt gremlin export adapter ${err}`);
                    return;
                }
            }
            this.ExportRecord = exportRecord;

            // init and save the client
            this.client = new GremlinAdapter(this.ExportRecord.config as GremlinExportConfig);
        }
    }

    async ToSave(): Promise<ExportRecord> {
        const key = new NodeRSA(Config.encryption_key_secret);

        const output = plainToClass(ExportRecord, {}); // we do this to avoid having to use the constructor
        Object.assign(output, this.ExportRecord);

        // copy over the record first, so that we're not accidentally encrypting
        // the data needed for the exporter to function
        (output.config as GremlinExportConfig).key = key.encryptPrivate((output.config as GremlinExportConfig).key, 'base64');
        (output.config as GremlinExportConfig).user = key.encryptPrivate((output.config as GremlinExportConfig).user, 'base64');

        return Promise.resolve(output);
    }

    async Initiate(user: User): Promise<Result<boolean>> {
        if (!this.ExportRecord || !this.ExportRecord.id) {
            return Promise.resolve(Result.Failure(`this export must be saved before initiating`));
        }

        let result = await GremlinExportMapper.Instance.InitiateExport(this.ExportRecord.id, this.ExportRecord.container_id!);
        if (result.isError) return Promise.resolve(Result.Pass(result));

        result = await ExportMapper.Instance.SetStatus(user.id!, this.ExportRecord.id, 'processing');
        void this.export();

        return Promise.resolve(Result.Pass(result));
    }

    async Restart(user: User): Promise<Result<boolean>> {
        if (!this.ExportRecord || !this.ExportRecord.id) {
            return Promise.resolve(Result.Failure(`this export must be saved before restarting`));
        }

        await ExportMapper.Instance.SetStatus(user.id!, this.ExportRecord.id, 'processing');
        return this.export();
    }

    Status(): string {
        return this.ExportRecord!.status || 'failed';
    }

    async Stop(user: User): Promise<Result<boolean>> {
        if (!this.ExportRecord || !this.ExportRecord.id) {
            return Promise.resolve(Result.Failure(`this export must be saved before stopping`));
        }

        return ExportMapper.Instance.SetStatus(user.id!, this.ExportRecord.id, 'paused');
    }

    private async export(): Promise<Result<boolean>> {
        if (!this.ExportRecord || !this.ExportRecord.id) {
            Logger.error(`unable to start export, export must be saved before attempting to process`);
            return Promise.resolve(Result.Failure('unable to start export, export must be saved before processing'));
        }

        if (!this.client) {
            Logger.error(`unable to initiate gremlin client for export ${this.ExportRecord.id}`);
            return Promise.resolve(Result.Failure('unable to initiate gremlin client for export'));
        }

        const metatypeRepo = new MetatypeRepository();
        Logger.debug(`restarting gremlin export ${this.ExportRecord.id}`);
        const gremlinExportStorage = GremlinExportMapper.Instance;

        // Insert node with properties into gremlin for each node in snapshot
        while (true) {
            // Verify that the process hasn't stopped, then continue
            const check = await ExportMapper.Instance.Retrieve(this.ExportRecord.id);
            if (check.isError || check.value.status !== 'processing') {
                Logger.error(`gremlin export ${this.ExportRecord.id} unable to verify status or status stopped, exiting`);
                return Promise.resolve(Result.Failure(`gremlin export ${this.ExportRecord.id} unable to verify status or status stopped, exiting`));
            }

            const transaction = await gremlinExportStorage.startTransaction();
            if (transaction.isError) {
                Logger.error(`unable to initiate db transaction ${transaction}`);
                return Promise.resolve(Result.Failure(`unable to initiate db transaction ${transaction}`));
            }

            // unassociated nodes should be inserted as vertices without any edges,
            // as such we get them out of the way first. We choose to wait here if
            // we can't get a lock so that we don't error out, we'll perform a check
            // later on to verify a node hasn't been inserted
            const unassociatedNodes = await gremlinExportStorage.ListUnassociatedNodesAndLock(
                this.ExportRecord.id,
                0,
                (this.ExportRecord.config as GremlinExportConfig).writes_per_second,
                transaction.value,
                true,
            );
            if (unassociatedNodes.isError) {
                Logger.error(`gremlin export failing: ${unassociatedNodes.error?.error}`);
                await gremlinExportStorage.completeTransaction(transaction.value);

                return Promise.resolve(Result.Failure(`gremlin export failing: ${unassociatedNodes.error?.error}`));
            }

            if (unassociatedNodes.value.length <= 0) break;

            for (const node of unassociatedNodes.value) {
                // double check it hasn't been added
                if (!node.gremlin_node_id || node.gremlin_node_id !== '') continue;

                const metatype = await metatypeRepo.findByID(node.metatype_id!);
                if (metatype.isError) {
                    Logger.error(`gremlin export node failed: ${metatype.error?.error}`);
                    continue;
                }

                const gremlinNode = await this.client.vertices.add(metatype.value.name, node);
                if (gremlinNode.isError) {
                    Logger.error(`gremlin export node failed: ${gremlinNode.error?.error}`);
                    continue;
                }

                const inserted = await gremlinExportStorage.SetGremlinNodeID(node.id!, gremlinNode.value.id);
                if (inserted.isError || !inserted.value) {
                    Logger.error(`gremlin export node failed: ${inserted.error?.error}`);
                }
            }

            await gremlinExportStorage.completeTransaction(transaction.value);

            await this.delay(1000);
        }

        // Insert edges with properties
        Logger.debug(`gremlin export ${this.ExportRecord.id} successfully added nodes, starting edges`);

        while (true) {
            // Verify that the process hasn't stopped, then continue
            const check = await ExportMapper.Instance.Retrieve(this.ExportRecord.id);
            if (check.isError || check.value.status !== 'processing') {
                Logger.error(`gremlin export ${this.ExportRecord.id} unable to verify status or status stopped, exiting`);
                return Promise.resolve(Result.Failure(`gremlin export ${this.ExportRecord.id} unable to verify status or status stopped, exiting`));
            }

            const transaction = await gremlinExportStorage.startTransaction();
            if (transaction.isError) {
                Logger.error(`unable to initiate db transaction ${transaction}`);
                return Promise.resolve(Result.Failure(`unable to initiate db transaction ${transaction}`));
            }

            // We choose to wait here if we can't get a lock so that we don't
            // error out, we'll perform a check later on to verify a node hasn't
            // been inserted
            const unassociatedEdges = await gremlinExportStorage.ListUnassociatedEdgesAndLock(
                this.ExportRecord.id,
                0,
                (this.ExportRecord.config as GremlinExportConfig).writes_per_second,
                transaction.value,
                true,
            );
            if (unassociatedEdges.isError) {
                Logger.error(`gremlin export failing: ${unassociatedEdges.error?.error}`);
                await gremlinExportStorage.completeTransaction(transaction.value);

                return Promise.resolve(Result.Failure(`gremlin export failing: ${unassociatedEdges.error?.error}`));
            }

            if (unassociatedEdges.value.length <= 0) break;

            // add corresponding gremlin edge for each
            for (const edge of unassociatedEdges.value) {
                // double check it hasn't been added already
                if (!edge.gremlin_edge_id || edge.gremlin_edge_id !== '') continue;

                const destination = await gremlinExportStorage.RetrieveNode(edge.destination_node_id!);
                const origin = await gremlinExportStorage.RetrieveNode(edge.origin_node_id!);
                const pair = await MetatypeRelationshipPairMapper.Instance.Retrieve(edge.relationship_pair_id!);

                if (destination.isError || origin.isError || pair.isError) {
                    Logger.error(`gremlin export failing: ${destination.error?.error}/${origin.error?.error}`);
                    continue;
                }

                const gremlinEdge = await this.client.edges.add(origin.value.gremlin_node_id!, destination.value.gremlin_node_id!, pair.value.name, edge);
                if (gremlinEdge.isError) {
                    Logger.error(`gremlin export failing to add edge ${gremlinEdge.error?.error}`);
                    continue;
                }

                const set = await gremlinExportStorage.SetGremlinEdgeID(edge.id!, gremlinEdge.value.id);
                if (set.isError) {
                    Logger.error(`gremlin export failing to add edge ${set.error?.error}`);
                }
            }

            await gremlinExportStorage.completeTransaction(transaction.value);

            await this.delay(1000);
        }

        Logger.debug(`gremlin export ${this.ExportRecord.id} completed, cleaning up snapshot`);
        await ExportMapper.Instance.SetStatus('system', this.ExportRecord.id, 'completed');

        return gremlinExportStorage.DeleteForExport(this.ExportRecord.id);
    }

    private delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // reset will wipe out the gremlin nodes/edges database and then re-instantiate
    // them
    async Reset(user: User): Promise<Result<boolean>> {
        if (!this.ExportRecord || !this.ExportRecord.id) {
            return Promise.resolve(Result.Failure(`this export must be saved before stopping`));
        }

        const deleted = await GremlinExportMapper.Instance.DeleteForExport(this.ExportRecord.id);

        if (deleted.isError) {
            Logger.error(`error deleting gremlin nodes and edges for export ${deleted.error}`);
            return new Promise((resolve) => resolve(Result.Pass(deleted)));
        }

        return this.Initiate(user);
    }
}
