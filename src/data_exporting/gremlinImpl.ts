import {Exporter} from "./exporter";
import {GremlinConfigT} from "../types/export/gremlinConfigT";
import GremlinAdapter from "../data_storage/adapters/gremlin/gremlin";
import Config from "../config";
import * as fs from "fs";
import ExportStorage from "../data_storage/export/export_storage";
import {ExportT} from "../types/export/exportT";
import Result from "../result";
import GremlinExportStorage from "../data_storage/export/gremlin_export_storage";
import Logger from "../logger"
import MetatypeStorage from "../data_storage/metatype_storage";
import MetatypeRelationshipPairStorage from "../data_storage/metatype_relationship_pair_storage";
import NodeRSA from "node-rsa"


// The Gremlin implementation of the Exporter interface allows the application to export
// all data to a Gremlin enabled graph database. The exporter will attempt to connect to
// the service using the Gremlin driver and on secure connection, export the data using
// the same driver.
export class GremlinImpl implements Exporter {
    public client: GremlinAdapter;
    public exportT: ExportT = {} as ExportT;

    // creating a new GremlinImpl assumes the configuration being passed in is not
    // encrypted in anyway. The exporter itself will handle encryption and storage
    // after successfully creating a client.
    private constructor(config:GremlinConfigT) {
        // init and save the client
        this.client = new GremlinAdapter(config)
    }

    public static async NewExport(containerID: string, userID: string, config: any | GremlinConfigT): Promise<Result<GremlinImpl>> {
        const instance = new GremlinImpl(config);
        const exportStorage = ExportStorage.Instance;
        const gremlinExportStorage = GremlinExportStorage.Instance;

        // encrypt the key and user information
        const key = new NodeRSA(Config.encryption_key_secret);

        config.key = key.encryptPrivate(config.key, "base64");
        config.user = key.encryptPrivate(config.user, "base64");
        // create a new export record and store
        const exp = await exportStorage.Create(containerID, userID, {
            adapter: "gremlin",
            config
        } as ExportT);

        return new Promise(resolve => {
           if(exp.isError) resolve(Result.Pass(exp));
           instance.exportT = exp.value;

           gremlinExportStorage.InitiateExport(exp.value.id!)
               .then(result => {
                  if(result.isError) {
                      exportStorage.PermanentlyDelete(exp.value.id!);
                      resolve(Result.Pass(exp))
                  }

                  resolve(Result.Success(instance))
               })
               .catch(e => resolve(Result.Failure(e)))
        })
    }

    public static async FromExportRecord(exportID: string): Promise<Result<GremlinImpl>> {
        const exportStorage = ExportStorage.Instance;
        // find export record in storage
        const exp = await exportStorage.Retrieve(exportID);
        if(exp.isError) return new Promise(resolve => resolve(Result.Pass(exp)));

        // decrypt configuration
        const key = new NodeRSA(Config.encryption_key_secret);

        const config = exp.value.config as GremlinConfigT;
        config.user = key.decryptPublic(config.user, "utf8");
        config.key = key.decryptPublic(config.key, "utf8");

        const instance = new GremlinImpl(config);

        // init client
        const adapter = new GremlinAdapter(config);


        instance.client = adapter;
        instance.exportT = exp.value;
        return new Promise(resolve => resolve(Result.Success(instance)))
    }

    async Start(userID: string): Promise<Result<boolean>>{
        ExportStorage.Instance.SetProcessing(this.exportT.id!);
        this.export();

        return new Promise(resolve => resolve(Result.Success(true)));
    }

    Status(): string {
        return this.exportT.status || "failed";
    }

    async Stop(userID: string): Promise<Result<boolean>>{
        const exportStorage = ExportStorage.Instance;

        // error result declaration by the application itself will handle the logging
        return exportStorage.Update(this.exportT.id!, userID, this.exportT)
    }

    private async export(){
        Logger.debug(`restarting gremlin export ${this.exportT.id}`);
        const gremlinExportStorage = GremlinExportStorage.Instance;

        // Insert node with properties into gremlin for each node in snapshot
        while(true) {
            // Verify that the process hasn't stopped, then continue
            const check = await ExportStorage.Instance.Retrieve(this.exportT.id!);
            if(check.isError || check.value.status !== "processing") {
                Logger.error(`gremlin export ${this.exportT.id} unable to verify status or status stopped, exiting`);
                return
            }

            // unassociated nodes should be inserted as vertices without any edges, as such we get them out of the way first.
            const unassociatedNodes = await gremlinExportStorage.ListUnassociatedNodes(this.exportT.id!, 0, (this.exportT.config as GremlinConfigT).writes_per_second);
            if(unassociatedNodes.isError) {
                Logger.error(`gremlin export failing: ${unassociatedNodes.error?.error}`);
                return
            }

            if(unassociatedNodes.value.length <= 0) break;

            for(const node of unassociatedNodes.value) {
                const metatype = await MetatypeStorage.Instance.Retrieve(node.metatype_id);
                if(metatype.isError){
                    Logger.error(`gremlin export node failed: ${metatype.error?.error}`);
                    continue
                }

                const gremlinNode = await this.client.vertices.add(metatype.value.name, node);
                if(gremlinNode.isError) {
                    Logger.error(`gremlin export node failed: ${gremlinNode.error?.error}`);
                    continue
                }

                const inserted = await gremlinExportStorage.SetGremlinNodeID(node.id, gremlinNode.value.id);
                if(inserted.isError || !inserted.value) {
                    Logger.error(`gremlin export node failed: ${inserted.error?.error}`);

                }
            }

            await this.delay(1000)
        }

        // Insert edges with properties
        Logger.debug(`gremlin export ${this.exportT.id} successfully added nodes, starting edges`);

        while(true) {
            // Verify that the process hasn't stopped, then continue
            const check = await ExportStorage.Instance.Retrieve(this.exportT.id!);
            if(check.isError || check.value.status !== "processing") {
                Logger.error(`gremlin export ${this.exportT.id} unable to verify status or status stopped, exiting`);
                return
            }

            const unassociatedEdges = await gremlinExportStorage.ListUnassociatedEdges(this.exportT.id!, 0, (this.exportT.config as GremlinConfigT).writes_per_second);
            if(unassociatedEdges.isError) {
                Logger.error(`gremlin export failing: ${unassociatedEdges.error?.error}`);
                return
            }

            if(unassociatedEdges.value.length <= 0) break;

            // add corresponding gremlin edge for each
            for(const edge of unassociatedEdges.value) {
                const destination = await gremlinExportStorage.RetrieveNode(edge.destination_node_id);
                const origin = await gremlinExportStorage.RetrieveNode(edge.origin_node_id!);
                const pair = await MetatypeRelationshipPairStorage.Instance.Retrieve(edge.relationship_pair_id);

                if(destination.isError || origin.isError || pair.isError) {
                    Logger.error(`gremlin export failing: ${destination.error?.error}/${origin.error?.error}`);
                    continue
                }


                const gremlinEdge = await this.client.edges.add(origin.value.gremlin_node_id, destination.value.gremlin_node_id, pair.value.name, edge);
                if(gremlinEdge.isError) {
                    Logger.error(`gremlin export failing to add edge ${gremlinEdge.error?.error}`);
                    continue
                }

                const set = await gremlinExportStorage.SetGremlinEdgeID(edge.id!, gremlinEdge.value.id);
                if(set.isError) {
                    Logger.error(`gremlin export failing to add edge ${set.error?.error}`);

                }
            }

            await this.delay(1000)
        }

        Logger.debug(`gremlin export ${this.exportT.id} completed, cleaning up snapshot`);
        await ExportStorage.Instance.SetCompleted(this.exportT.id!);
        await gremlinExportStorage.FinalizeExport(this.exportT.id!)
    }
    private delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }
}

