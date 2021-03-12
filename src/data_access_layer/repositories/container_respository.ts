import RepositoryInterface from "./repository_base";
import Container from "../../data_warehouse/ontology/container";
import Result from "../../result";
import {UserT} from "../../types/user_management/userT";
import ContainerMapper from "../mappers/container_mapper";
import Authorization from "../../user_management/authorization/authorization";
import Logger from "../../logger"
import GraphStorage from "../mappers/graph/graph_storage";

export default class ContainerRepository implements RepositoryInterface<Container> {
    #mapper: ContainerMapper = ContainerMapper.Instance

    async save(user: UserT, c: Container): Promise<Result<boolean>> {
        const errors = await c.validationErrors()
        if(errors) {
            return Promise.resolve(Result.Failure(`container does not pass validation ${errors.join(",")}`))
        }

        // if we have a set ID, attempt to update the Container
        if(c.id) {
            const updated = await this.#mapper.Update(user.id!, c)
            if(updated.isError) return Promise.resolve(Result.Pass(updated))

            Object.assign(c, updated.value)
            return Promise.resolve(Result.Success(true))
        }

        // no id? create a new container and run relevant operations
        const result = await this.#mapper.Create(user.id!, c)
        if(result.isError) return Promise.resolve(Result.Pass(result))

        // we need to set permissions and create the graph instance for this container now
        const set = await result.value.setPermissions()
        if(set.isError) Logger.error(`unable to set container ${result.value.id}'s permissions ${set.error}`)

        GraphStorage.Instance.Create(result.value.id!, user.id!).then(async (graph) => {
            // set active graph from graph ID
            if (graph.isError) {
                Logger.error(result.error?.error!);
            } else {
                const activeGraph = await GraphStorage.Instance.SetActiveForContainer(result.value.id!, graph.value.id);
                if (activeGraph.isError || !activeGraph.value) {
                    Logger.error(activeGraph.error?.error!);
                }
            }
        }).catch(e => Logger.error(e))

        // set the original object to the returned one
        Object.assign(c, result.value)

        return Promise.resolve(Result.Success(true));
    }

    async bulkSave(user: UserT, c: Container[]): Promise<Result<boolean>> {
        // separate containers by which need to be created and which need to be updated
        const toCreate: Container[] = []
        const toUpdate: Container [] = []

        const toReturn: Container[] = []

        // run validation and separate
        for(const container of c) {
            const errors = await container.validationErrors()

            if(errors) {
                return Promise.resolve(Result.Failure(`container does not pass validation ${errors.join(",")}`))
            }

            (container.id) ? toUpdate.push(container) : toCreate.push(container)
        }

        // we run the bulk save in a transaction so that on failure we don't get
        // stuck with partially updated items
        const transaction = await this.#mapper.startTransaction()
        if(transaction.isError) return Promise.resolve(Result.Failure(`unable to initiate db transaction`))

        if(toUpdate.length > 0) {
            const results = await this.#mapper.BulkUpdate(user.id!, toUpdate, transaction.value)
            if(results.isError) {
                await this.#mapper.rollbackTransaction(transaction.value)
                return Promise.resolve(Result.Pass(results))
            }

            toReturn.push(...results.value)
        }

        if(toCreate.length > 0) {
            const results = await this.#mapper.BulkCreate(user.id!, toCreate, transaction.value)
            if(results.isError) {
                await this.#mapper.rollbackTransaction(transaction.value)
                return Promise.resolve(Result.Pass(results))
            }

            for(const container of results.value) {
                // we need to set permissions and create the graph instance for this container now
                const set = await container.setPermissions()
                if(set.isError) Logger.error(`unable to set container ${container.id}'s permissions ${set.error}`)

                GraphStorage.Instance.Create(container.id!, user.id!).then(async (result) => {
                    // set active graph from graph ID
                    if (result.isError) {
                        Logger.error(result.error?.error!);
                    } else {
                        const activeGraph = await GraphStorage.Instance.SetActiveForContainer(container.id!, result.value.id);
                        if (activeGraph.isError || !activeGraph.value) {
                            Logger.error(activeGraph.error?.error!);
                        }
                    }
                }).catch(e => Logger.error(e))
            }

            toReturn.push(...results.value)
        }

        const committed = await this.#mapper.completeTransaction(transaction.value)
        if(committed.isError) {
           this.#mapper.rollbackTransaction(transaction.value)
           return Promise.resolve(Result.Failure(`unable to commit changes to database ${committed.error}`))
        }

        toReturn.forEach((result, i) => {
           Object.assign(c[i], result)
        })

        return Promise.resolve(Result.Success(true));
    }

    async listForUser(user: UserT): Promise<Result<Container[]>> {
        // casbin enforcer
        const e = await Authorization.enforcer()

        if(!user || user.admin) {
            return this.#mapper.List()
        }

        // using the casbin filtered grouping function, fetch all permission sets for
        // user. Those permissions sets will contain all domains, or containers, a user
        // is a part of. With that information we can then query for the entirety of
        // the container information

        // grouping policies follow the pattern of user id, role, domain id. In this
        // case we are fetching all grouping policies(permission sets) with a given
        // userID
        const permissionSets = await e.getFilteredGroupingPolicy(0, user.id!)

        const containerIDs: string[] = [];

        // extract the container id, the third argument, from each returned set
        permissionSets.map(set => {
            if(set[2]) containerIDs.push((set[2]))
        })

        if(containerIDs.length === 0) {
            return new Promise(resolve => resolve(Result.Success([])))
        }

        return this.#mapper.ListFromIDs(containerIDs)
    }

    delete(c: Container): Promise<Result<boolean>> {
        if(c.id) {
            return this.#mapper.Delete(c.id)
        }

        return Promise.resolve(Result.Failure('container has no id'))
    }

    archive(user: UserT, c: Container): Promise<Result<boolean>> {
        if(c.id) {
            return this.#mapper.Archive(c.id, user.id!)
        }

        return Promise.resolve(Result.Failure('container has no id'))
    }

    findByID(id: string): Promise<Result<Container>> {
        return this.#mapper.Retrieve(id)
    }
}
