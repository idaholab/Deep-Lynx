import RepositoryInterface from '../../repository';
import Container, {ContainerAlert, ContainerExport} from '../../../../domain_objects/data_warehouse/ontology/container';
import Result from '../../../../common_classes/result';
import ContainerMapper from '../../../mappers/data_warehouse/ontology/container_mapper';
import Authorization from '../../../../domain_objects/access_management/authorization/authorization';
import Logger from '../../../../services/logger';
import Cache from '../../../../services/cache/cache';
import {plainToClass, serialize} from 'class-transformer';
import Config from '../../../../services/config';
import {User} from '../../../../domain_objects/access_management/user';
import ContainerAlertMapper from '../../../mappers/data_warehouse/ontology/container_alert_mapper';
import MetatypeMapper from '../../../mappers/data_warehouse/ontology/metatype_mapper';
import OntologyVersionRepository from './versioning/ontology_version_repository';
import MetatypeKeyMapper from '../../../mappers/data_warehouse/ontology/metatype_key_mapper';
import MetatypeRelationshipMapper from '../../../mappers/data_warehouse/ontology/metatype_relationship_mapper';
import MetatypeRelationshipKeyMapper from '../../../mappers/data_warehouse/ontology/metatype_relationship_key_mapper';
import MetatypeRelationshipPairMapper from '../../../mappers/data_warehouse/ontology/metatype_relationship_pair_mapper';
import fs from 'fs';
import FileRepository from '../data/file_repository';
import File from '../../../../domain_objects/data_warehouse/data/file';
import OntologyVersion from '../../../../domain_objects/data_warehouse/ontology/versioning/ontology_version';
import MetatypeRepository from './metatype_repository';
import MetatypeRelationshipRepository from './metatype_relationship_repository';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';
import MetatypeRelationship from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeKeyRepository from './metatype_key_repository';
import MetatypeKey from '../../../../domain_objects/data_warehouse/ontology/metatype_key';
import MetatypeRelationshipKey from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_key';
import MetatypeRelationshipKeyRepository from './metatype_relationship_key_repository';
import MetatypeRelationshipPairRepository from './metatype_relationship_pair_repository';
import MetatypeRelationshipPair from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import TypeMappingRepository from '../etl/type_mapping_repository';
import KeyPairMapper from '../../../mappers/access_management/keypair_mapper';
import RedisGraphLoaderService from '../../../../services/cache/redis_graph_loader';

/*
    ContainerRepository contains methods for persisting and retrieving a container
    to storage. Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning.
 */
export default class ContainerRepository implements RepositoryInterface<Container> {
    #mapper: ContainerMapper = ContainerMapper.Instance;
    #alertMapper: ContainerAlertMapper = ContainerAlertMapper.Instance;

    async save(c: Container, user: User): Promise<Result<boolean>> {
        const errors = await c.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`container does not pass validation ${errors.join(',')}`));
        }

        // if we have a set ID, attempt to update the Container
        if (c.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(c.id);
            if (original.isError) return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));

            Object.assign(original.value, c);

            void this.deleteCached(c.id);

            const updated = await this.#mapper.Update(user.id!, original.value);
            if (updated.isError) return Promise.resolve(Result.Pass(updated));

            Object.assign(c, updated.value);
            return Promise.resolve(Result.Success(true));
        }

        // no id? create a new container and run relevant operations
        const result = await this.#mapper.Create(user.id!, c);
        if (result.isError) return Promise.resolve(Result.Pass(result));

        // we need to set permissions and create the graph instance for this container now
        const set = await result.value.setPermissions();
        if (set.isError) Logger.error(`unable to set container ${result.value.id}'s permissions ${set.error}`);

        // assign admin role to the user who created the container
        const role = await Authorization.AssignRole(user.id!, 'admin', result.value.id);
        if (!role) Logger.error(`error while assigning admin role to user`);

        // set the original object to the returned one
        Object.assign(c, result.value);

        return Promise.resolve(Result.Success(true));
    }

    async bulkSave(user: User, c: Container[]): Promise<Result<boolean>> {
        // separate containers by which need to be created and which need to be updated
        const toCreate: Container[] = [];
        const toUpdate: Container[] = [];
        const toReturn: Container[] = [];

        // run validation and separate
        for (const container of c) {
            const errors = await container.validationErrors();
            if (errors) {
                return Promise.resolve(Result.Failure(`some containers do not pass validation ${errors.join(',')}`));
            }

            if (container.id) {
                toUpdate.push(container);
                void this.deleteCached(container.id);
            } else {
                toCreate.push(container);
            }
        }

        // we run the bulk save in a transaction so that on failure we don't get
        // stuck with partially updated items
        const transaction = await this.#mapper.startTransaction();
        if (transaction.isError) return Promise.resolve(Result.Failure(`unable to initiate db transaction`));

        if (toUpdate.length > 0) {
            const results = await this.#mapper.BulkUpdate(user.id!, toUpdate, transaction.value);
            if (results.isError) {
                await this.#mapper.rollbackTransaction(transaction.value);
                return Promise.resolve(Result.Pass(results));
            }

            toReturn.push(...results.value);
        }

        if (toCreate.length > 0) {
            const results = await this.#mapper.BulkCreate(user.id!, toCreate, transaction.value);
            if (results.isError) {
                await this.#mapper.rollbackTransaction(transaction.value);
                return Promise.resolve(Result.Pass(results));
            }

            for (const container of results.value) {
                // we need to set permissions and create the graph instance for this container now
                const set = await container.setPermissions();
                if (set.isError) Logger.error(`unable to set container ${container.id}'s permissions ${set.error}`);

                // assign admin role to the user who created the container
                const role = await Authorization.AssignRole(user.id!, 'admin', container.id);
                if (!role) Logger.error(`error while assigning admin role to user`);

                void this.setCache(container);
            }

            toReturn.push(...results.value);
        }

        const committed = await this.#mapper.completeTransaction(transaction.value);
        if (committed.isError) {
            await this.#mapper.rollbackTransaction(transaction.value);
            return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`));
        }

        toReturn.forEach((result, i) => {
            Object.assign(c[i], result);
        });

        return Promise.resolve(Result.Success(true));
    }

    // this function is used to find all the containers that the provided user
    // has an active role on - used primarily by the http_server
    async listForUser(user: User): Promise<Result<Container[]>> {
        // casbin enforcer
        const e = await Authorization.enforcer();

        if (!user || user.admin) {
            return this.#mapper.List();
        }

        // listing containers for service users looks a little different
        // than listing them for a regular user
        if (user.identity_provider === 'service') {
            return this.#mapper.ListForServiceUser(user.id!);
        }

        // using the casbin filtered grouping function, fetch all permission sets for
        // user. Those permissions sets will contain all domains, or containers, a user
        // is a part of. With that information we can then query for the entirety of
        // the container information

        // grouping policies follow the pattern of user id, role, domain id. In this
        // case we are fetching all grouping policies(permission sets) with a given
        // userID
        const permissionSets = await e.getFilteredGroupingPolicy(0, user.id!);

        const containerIDs: string[] = [];

        // extract the container id, the third argument, from each returned set
        permissionSets.map((set) => {
            if (set[2]) containerIDs.push(set[2]);
        });

        if (containerIDs.length === 0) {
            return new Promise((resolve) => resolve(Result.Success([])));
        }

        return this.#mapper.ListFromIDs(containerIDs);
    }

    delete(c: Container): Promise<Result<boolean>> {
        if (c.id) {
            void this.deleteCached(c.id);
            return this.#mapper.Delete(c.id);
        }

        return Promise.resolve(Result.Failure('container has no id'));
    }

    archive(user: User, c: Container): Promise<Result<boolean>> {
        if (c.id) {
            void this.deleteCached(c.id);
            return this.#mapper.Archive(c.id, user.id!);
        }

        return Promise.resolve(Result.Failure('container has no id'));
    }

    async setActive(c: Container, user: User): Promise<Result<boolean>> {
        if (c.id) {
            const set = await this.#mapper.SetActive(c.id, user.id!);
            if (set.isError) return Promise.resolve(Result.Pass(set));

            return Promise.resolve(Result.Success(true));
        }

        return Promise.resolve(Result.Failure(`container has no id`));
    }

    async findByID(id: string): Promise<Result<Container>> {
        const cached = await this.getCached(id);
        if (cached) {
            return Promise.resolve(Result.Success(cached));
        }

        const retrieved = await this.#mapper.Retrieve(id);

        if (!retrieved.isError) {
            void this.setCache(retrieved.value);
        }

        return Promise.resolve(retrieved);
    }

    async loadIntoRedis(id: string): Promise<Result<boolean>> {
        const loader = await RedisGraphLoaderService.GetInstance();

        try {
            await loader.loadGraph(id);
        } catch (e: any) {
            return Promise.resolve(Result.Failure(e.toString()));
        }

        return Promise.resolve(Result.Success(true));
    }

    async createAlert(alert: ContainerAlert, user?: User): Promise<Result<boolean>> {
        const errors = await alert.validationErrors();
        if (errors) {
            return Promise.resolve(Result.Failure(`container alert does not pass validation ${errors.join(',')}`));
        }

        if (alert.id) {
            return Promise.resolve(Result.Failure(`alerts cannot be updated, only created, acknowledged, or deleted`));
        }

        const result = await this.#alertMapper.Create(user ? user.id! : 'system', alert);
        if (result.isError) return Promise.resolve(Result.Pass(result));

        Object.assign(alert, result.value);

        return Promise.resolve(Result.Success(true));
    }

    async acknowledgeAlert(id: string, user: User): Promise<Result<boolean>> {
        return this.#alertMapper.SetAcknowledged(id, user.id!);
    }

    async activeAlertsForContainer(containerID: string): Promise<Result<ContainerAlert[]>> {
        return this.#alertMapper.ListUnacknowledgedForContainer(containerID);
    }

    // export ontology returns a File record with the information needed to download a .json file with the container's
    // exported ontology. Eventually we'll convert this into an OWL file, for now, we just do a File.
    async exportOntology(containerID: string, user: User, ontologyVersionID?: string): Promise<Result<ContainerExport>> {
        const repo = new OntologyVersionRepository();

        if (!ontologyVersionID) {
            const result = await repo.where().containerID('eq', containerID).and().status('eq', 'published').list({sortDesc: true, sortBy: 'id', limit: 1});

            if (!result.isError || result.value.length > 0) {
                ontologyVersionID = result.value[0].id;
            }
        }

        const metatypes = await MetatypeMapper.Instance.ListForExport(containerID, ontologyVersionID);
        if (metatypes.isError) return Promise.resolve(Result.Pass(metatypes));

        const metatype_keys = await MetatypeKeyMapper.Instance.ListForExport(containerID, ontologyVersionID);
        if (metatype_keys.isError) return Promise.resolve(Result.Pass(metatype_keys));

        const relationships = await MetatypeRelationshipMapper.Instance.ListForExport(containerID, ontologyVersionID);
        if (relationships.isError) return Promise.resolve(Result.Pass(relationships));

        const relationship_keys = await MetatypeRelationshipKeyMapper.Instance.ListForExport(containerID, ontologyVersionID);
        if (relationship_keys.isError) return Promise.resolve(Result.Pass(relationship_keys));

        const relationship_pairs = await MetatypeRelationshipPairMapper.Instance.ListForExport(containerID, ontologyVersionID);
        if (relationship_pairs.isError) return Promise.resolve(Result.Pass(relationship_pairs));

        return Promise.resolve(
            Result.Success(
                new ContainerExport({
                    version: 1, // hardcoded for a reason!
                    metatypes: metatypes.value,
                    metatype_keys: metatype_keys.value,
                    relationships: relationships.value,
                    relationship_keys: relationship_keys.value,
                    relationship_pairs: relationship_pairs.value,
                }),
            ),
        );
    }

    async importOntology(containerID: string, user: User, jsonImport: any): Promise<Result<string>> {
        // verify the expected ontology elements are present in the supplied file
        if (
            !('metatypes' in jsonImport) ||
            !('metatype_keys' in jsonImport) ||
            !('relationships' in jsonImport) ||
            !('relationship_keys' in jsonImport) ||
            !('relationship_pairs' in jsonImport)
        ) {
            return Promise.resolve(Result.Failure('Container export file does not contain all necessary sections for an ontology export.'));
        }

        const ontologyVersionRepo = new OntologyVersionRepository();
        let oldOntologyVersionID;

        const ontVersionResult = await ontologyVersionRepo
            .where()
            .containerID('eq', containerID)
            .and()
            .status('eq', 'published')
            .list({sortDesc: true, sortBy: 'id', limit: 1});

        if (!ontVersionResult.isError && ontVersionResult.value.length > 0) {
            oldOntologyVersionID = ontVersionResult.value[0].id;
        } else {
            // look for ontology versions with a ready status and use the latest. if none found, return an error
            const readyVersions = await ontologyVersionRepo
                .where()
                .containerID('eq', containerID)
                .and()
                .status('eq', 'ready')
                .list({sortDesc: true, sortBy: 'id', limit: 1});

            if (!readyVersions.isError && readyVersions.value.length > 0) {
                oldOntologyVersionID = readyVersions.value[0].id;
            } else {
                return Promise.resolve(
                    Result.Failure(`No ontology version with a status of published or ready was found for container ID ${containerID}. 
                    Please create one to enable ontology import.`),
                );
            }
        }

        // create new ontology version
        const ontologyVersion = new OntologyVersion({
            container_id: containerID,
            name: `Container Import - ${new Date().toDateString()}`,
            description: 'Created from imported container file',
            status: 'generating',
        });

        const newVersion = await ontologyVersionRepo.save(ontologyVersion, user);

        if (newVersion.isError) {
            return Promise.resolve(Result.Failure('Unable to create new ontology version.'));
        }

        const newVersionID = ontologyVersion.id;

        // create metatypes and relationships
        const metatypes: Metatype[] = [];

        // add needed fields to metatypes
        jsonImport.metatypes.forEach((metatype: any) => {
            metatype.container_id = containerID;
            metatype.created_by = user.id!;
            metatype.modified_by = user.id!;
            metatype.ontology_version = newVersionID!;
            metatypes.push(metatype);
        });
        const metatypeRepo = new MetatypeRepository();
        void (await metatypeRepo.saveFromJSON(metatypes));

        const relationships: MetatypeRelationship[] = [];

        // add needed fields to relationships
        jsonImport.relationships.forEach((relationship: any) => {
            relationship.container_id = containerID;
            relationship.created_by = user.id!;
            relationship.modified_by = user.id!;
            relationship.ontology_version = parseInt(newVersionID!, 10);
            relationships.push(relationship);
        });
        const relationshipRepo = new MetatypeRelationshipRepository();
        void (await relationshipRepo.saveFromJSON(relationships));

        // create keys and relationship pairs
        const metatypeKeys: MetatypeKey[] = [];
        jsonImport.metatype_keys.forEach((key: any) => {
            key.container_id = containerID;
            key.created_by = user.id!;
            key.modified_by = user.id!;
            metatypeKeys.push(key);
        });
        const metatypeKeyRepo = new MetatypeKeyRepository();
        void (await metatypeKeyRepo.saveFromJSON(metatypeKeys));

        // refresh metatype key view
        const mKeyMapper = new MetatypeKeyMapper();
        void mKeyMapper.RefreshView();

        const relationshipKeys: MetatypeRelationshipKey[] = [];
        jsonImport.relationship_keys.forEach((key: any) => {
            key.container_id = containerID;
            key.created_by = user.id!;
            key.modified_by = user.id!;
            relationshipKeys.push(key);
        });
        const relationshipKeyRepo = new MetatypeRelationshipKeyRepository();
        void (await relationshipKeyRepo.saveFromJSON(relationshipKeys));

        // before relationship pair insert, archive existing relationship pairs under the previous ontology version
        const relationshipPairMapper = new MetatypeRelationshipPairMapper();
        void relationshipPairMapper.ArchiveForImport(oldOntologyVersionID!);

        const relationshipPairs: MetatypeRelationshipPair[] = [];
        jsonImport.relationship_pairs.forEach((pair: any) => {
            pair.container_id = containerID;
            pair.created_by = user.id!;
            pair.modified_by = user.id!;
            pair.ontology_version = parseInt(newVersionID!, 10);
            relationshipPairs.push(pair);
        });
        const relationshipPairRepo = new MetatypeRelationshipPairRepository();
        void (await relationshipPairRepo.saveFromJSON(relationshipPairs));

        // refresh relationship pair view
        void relationshipPairRepo.RefreshView();

        // after successful ontology imports (or after error), update ontology version statuses
        void ontologyVersionRepo.setStatus(oldOntologyVersionID!, 'deprecated', 'Replaced by imported ontology from container file');

        void this.createAlert(new ContainerAlert({containerID, type: 'info', message: 'Due to the ontology update, please review type mappings.'}), user);

        const thisContainer = await this.findByID(containerID);
        if (thisContainer.value.config?.ontology_versioning_enabled) {
            // set new ontology version status to ready for version-enabled containers
            void ontologyVersionRepo.setStatus(newVersionID!, 'ready');
            return Promise.resolve(
                Result.Success('A new ontology version with the supplied ontology has been created. Please review and submit for approval and publishing.'),
            );
        } else {
            void ontologyVersionRepo.setStatus(newVersionID!, 'published');

            // attempt to autoupgrade type mappings for containers without ontology versioning
            const mappingRepo = new TypeMappingRepository();
            const containerTypeMappings = await mappingRepo.where().containerID('eq', containerID).list(true);
            const upgradeResult = await mappingRepo.upgradeMappings(newVersionID!, ...containerTypeMappings.value);

            // if there are no mappings present, the value will be undefined. This should not be treated as an error
            if (upgradeResult[0].isError && typeof upgradeResult[0].value !== 'undefined') {
                return Promise.resolve(Result.Failure('Unable to automatically upgrade type mappings. Please review the type mappings for this container.'));
            }

            return Promise.resolve(Result.Success('Successful ontology import. '));
        }
    }

    async createContainerExportFile(containerID: string, user: User, containerExport: ContainerExport): Promise<Result<File>> {
        try {
            fs.appendFileSync(`container_export_${containerID}.json`, JSON.stringify(containerExport));

            // this naming scheme should be enough to avoid clashes
            const readStream = fs.createReadStream(`container_export_${containerID}.json`);
            const fileRepo = new FileRepository();

            const file = await fileRepo.uploadFile(containerID, user, `container_export_${containerID}`, readStream);
            if (file.isError) return Promise.resolve(Result.Pass(file));

            const saved = await fileRepo.save(file.value, user);
            if (saved.isError) return Promise.resolve(Result.Pass(saved));

            // don't forget to remove the temporary file
            fs.unlinkSync(`container_export_${containerID}.json`);

            return Promise.resolve(Result.Success(file.value));
        } catch (e: any) {
            return Promise.resolve(Result.Error(e));
        }
    }

    private async getCached(id: string): Promise<Container | undefined> {
        const cached = await Cache.get<object>(`${ContainerMapper.tableName}:${id}`);
        if (cached) {
            const container = plainToClass(Container, cached);
            return Promise.resolve(container);
        }

        return Promise.resolve(undefined);
    }

    private async setCache(c: Container): Promise<boolean> {
        const set = await Cache.set(`${ContainerMapper.tableName}:${c.id}`, serialize(c), Config.cache_default_ttl);
        if (!set) Logger.error(`unable to set cache for container ${c.id}`);

        return Promise.resolve(set);
    }

    private async deleteCached(id: string): Promise<boolean> {
        const deleted = await Cache.del(`${ContainerMapper.tableName}:${id}`);
        if (!deleted) Logger.error(`unable to remove container ${id} from cache`);

        return Promise.resolve(deleted);
    }
}
