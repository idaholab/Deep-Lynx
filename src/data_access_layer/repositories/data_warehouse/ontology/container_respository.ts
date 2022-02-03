import RepositoryInterface from '../../repository';
import Container, {ContainerAlert} from '../../../../domain_objects/data_warehouse/ontology/container';
import Result from '../../../../common_classes/result';
import ContainerMapper from '../../../mappers/data_warehouse/ontology/container_mapper';
import Authorization from '../../../../domain_objects/access_management/authorization/authorization';
import Logger from '../../../../services/logger';
import Cache from '../../../../services/cache/cache';
import {plainToClass, serialize} from 'class-transformer';
import Config from '../../../../services/config';
import {SuperUser, User} from '../../../../domain_objects/access_management/user';
import ContainerAlertMapper from '../../../mappers/data_warehouse/ontology/container_alert_mapper';

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
