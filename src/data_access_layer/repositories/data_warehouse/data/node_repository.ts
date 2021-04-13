import RepositoryInterface, {QueryOptions, Repository} from "../../repository";
import Node from "../../../../data_warehouse/data/node"
import Result from "../../../../common_classes/result";
import NodeMapper from "../../../mappers/data_warehouse/data/node_mapper";
import {PoolClient} from "pg";
import {User} from "../../../../access_management/user";
import MetatypeRepository from "../ontology/metatype_repository";
import Logger from "../../../../services/logger"

/*
    NodeRepository contains methods for persisting and retrieving nodes
    to storage as well as managing things like validation.
    Users should interact with repositories when possible and not
    the mappers as the repositories contain additional logic such as validation
    or transformation prior to storage or returning.
 */
export default class NodeRepository extends Repository implements RepositoryInterface<Node> {
    #mapper: NodeMapper = NodeMapper.Instance
    #metatypeRepo: MetatypeRepository = new MetatypeRepository()

    constructor() {
        super(NodeMapper.tableName);

        // we must rewrite the initial query in order to accept LEFT JOINS so that
        // can avoid making more database queries for often required additional
        // information
        this._rawQuery = [
            `SELECT nodes.*, metatypes.name as metatype_name FROM ${NodeMapper.tableName}`,
            `LEFT JOIN metatypes ON metatypes.id = nodes.metatype_id`
        ]
    }

    delete(n: Node): Promise<Result<boolean>> {
        if(n.id) {
            return this.#mapper.Delete(n.id!)
        }

        return Promise.resolve(Result.Failure('node must have id'))
    }

    archive(user:User, n: Node): Promise<Result<boolean>> {
        if(n.id) {
            return this.#mapper.Archive(user.id!, n.id!)
        }

        return Promise.resolve(Result.Failure('node must have id'))
    }

    async findByID(id: string, transaction?: PoolClient): Promise<Result<Node>> {
        const node = await this.#mapper.Retrieve(id, transaction)
        if(!node.isError) {
            const metatype = await this.#metatypeRepo.findByID(node.value.metatype!.id!)
            if(metatype.isError) Logger.error(`unable to load node's metatype`)
            else Object.assign(node.value.metatype, metatype.value)
        }

        return Promise.resolve(node)
    }

    // composite id's are only unique when paired with a data source as well
    async findByCompositeID(id: string, dataSourceID: string, transaction?: PoolClient): Promise<Result<Node>> {
        const node = await this.#mapper.RetrieveByCompositeOriginalID(id, dataSourceID, transaction)
        if(!node.isError) {
            const metatype = await this.#metatypeRepo.findByID(node.value.metatype!.id!)
            if(metatype.isError) Logger.error(`unable to load node's metatype`)
            else Object.assign(node.value.metatype, metatype.value)
        }

        return Promise.resolve(node)
    }

    async save(n: Node, user: User, transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction: boolean = false
        const errors = await n.validationErrors()
        if(errors) return Promise.resolve(Result.Failure(`node does not pass validation ${errors.join(",")}`))

        if(!transaction) {
            const newTransaction = await this.#mapper.startTransaction()
            if(newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiated db transaction'))

            transaction = newTransaction.value
            internalTransaction = true
        }

        // the metatype should fetch with all its keys
        const metatype = await this.#metatypeRepo.findByID(n.metatype!.id!, true)
        if(metatype.isError) {
            if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
            return Promise.resolve(Result.Failure(`unable to retrieve node's metatype ${metatype.error?.error}`))
        }

        // we decided to keep the validation and transformation of object properties
        // on the metatype vs. pulling it into the node - as we might be performing
        // that validation/transformation elsewhere and we would always need the
        // metatype and it's keys anyways
        const validPayload = await metatype.value.validateAndTransformProperties(n.properties);
        if(validPayload.isError) {
            if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
            return Promise.resolve(Result.Failure(`node's properties do no match declared metatype: ${n.metatype_name} or validation failed: ${validPayload.error?.error}`));
        }

        // replace the properties with the validated and transformed payload
        n.properties = validPayload.value

        if(n.id) {
            const results = await this.#mapper.Update(user.id!, n)
            if(results.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(results))
            }

            Object.assign(n, results.value)
        } else {
            const results = await this.#mapper.CreateOrUpdateByCompositeID(user.id!, n)
            if(results.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(results))
            }

            Object.assign(n, results.value)
        }

        if(internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction)
            if(commit.isError) return Promise.resolve(Result.Pass(commit))
        }

        return Promise.resolve(Result.Success(true))
    }

    async bulkSave(user: User | string, nodes: Node[], transaction?: PoolClient): Promise<Result<boolean>> {
        let internalTransaction: boolean = false
        if(!transaction) {
            const newTransaction = await this.#mapper.startTransaction()
            if(newTransaction.isError) return Promise.resolve(Result.Failure('unable to initiated db transaction'))

            transaction = newTransaction.value
            internalTransaction = true
        }

        const operations: Promise<Result<boolean>>[] = []
        const toCreate: Node[] = []
        const toUpdate: Node[] = []
        const toReturn: Node[] = []

        // we try to do as much of the initial processing in parallel as we can
        // while it's almost a pyramid of death, this allows us to decrease processing
        // time by a significant amount
        for(const node of nodes) {
            operations.push(new Promise(resolve => {
                node.validationErrors()
                    .then(errors => {
                        if (errors) {
                            resolve(Result.Failure(`validation for one or more nodes failed ${errors.join(",")}`))
                            return
                        }

                        this.#metatypeRepo.findByID(node.metatype!.id!)
                            .then(metatype => {
                                if (metatype.isError) {
                                    resolve(Result.Failure(`unable fetch metatype for node ${metatype.error?.error}`))
                                    return
                                }

                                node.metatype = metatype.value

                                // we decided to keep the validation and transformation of object properties
                                // on the metatype vs. pulling it into the node - as we might be performing
                                // that validation/transformation elsewhere and we would always need the
                                // metatype and it's keys anyways
                                metatype.value.validateAndTransformProperties(node.properties)
                                    .then(transformed => {
                                        if (transformed.isError) {
                                            resolve(Result.Failure(`unable to validate properties for node ${transformed.isError}`))
                                            return
                                        }

                                        node.properties = transformed.value
                                        resolve(Promise.resolve(Result.Success(true)))

                                    })
                                    .catch(error => resolve(Result.Failure(`unable to validate properties for node ${error}`)))
                            })
                            .catch(error => resolve(Result.Failure(`unable to fetch metatype for node ${error}`)))
                    })
                    .catch(error => resolve(Result.Failure(`validation for one or more nodes failed ${error}`)))
            }));

            (node.id) ? toUpdate.push(node) : toCreate.push(node)
        }

        const completed = await Promise.all(operations)

        for(const complete of completed) {
            if(complete.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Failure(`one or more nodes failed validation or property transformation ${complete.error?.error}`))
            }
        }

        if(toUpdate.length > 0) {
            const saved = await this.#mapper.BulkUpdate((user instanceof  User) ? user.id! : user, nodes, transaction)
            if(saved.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(saved))
            }

            toReturn.push(...saved.value)
        }

        if(toCreate.length > 0) {
            const saved = await this.#mapper.BulkCreateOrUpdateByCompositeID((user instanceof  User) ? user.id! : user, nodes, transaction)
            if(saved.isError) {
                if(internalTransaction) await this.#mapper.rollbackTransaction(transaction)
                return Promise.resolve(Result.Pass(saved))
            }

            toReturn.push(...saved.value)
        }

        toReturn.forEach((result, i) => {
            Object.assign(nodes[i], result)
        })

        if(internalTransaction) {
            const commit = await this.#mapper.completeTransaction(transaction)
            if(commit.isError) return Promise.resolve(Result.Pass(commit))
        }

        return Promise.resolve(Result.Success(true))
    }

    id(operator: string, value: any) {
        super.query("nodes.id", operator, value)
        return this
    }

    containerID(operator: string, value: any) {
        super.query("nodes.container_id", operator, value)
        return this
    }

    metatypeID(operator: string, value: any) {
        super.query("nodes.metatype_id", operator, value)
        return this
    }

    metatypeName(operator: string, value: any) {
        super.query("metatypes.name", operator, value)
        return this
    }

    originalDataID(operator: string, value: any) {
        super.query("nodes.original_data_id", operator, value)
        return this
    }

    archived(operator: string, value: any) {
        super.query("nodes.archived", operator, value)
        return this
    }

    dataSourceID(operator: string, value: any) {
        super.query("nodes.data_source_id", operator, value)
        return this
    }

    importDataID(operator: string, value: any) {
        super.query("nodes.import_data_id", operator, value)
        return this
    }

    property(key: string, operator: string, value: any) {
        super.queryJsonb(key, "nodes.properties", operator, value)
        return this
    }

    async count(): Promise<Result<number>> {
        const results = await super.count()
        // reset the query
        this._rawQuery = [
            `SELECT nodes.*, metatypes.name as metatype_name FROM ${NodeMapper.tableName}`,
            `LEFT JOIN metatypes ON metatypes.id = nodes.metatype_id`
        ]

        if(results.isError) return Promise.resolve(Result.Pass(results))
        return Promise.resolve(Result.Success(results.value))
    }

    async list(loadMetatypes?: boolean, queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<Node[]>> {
        const results = await super.findAll<Node>(queryOptions, {transaction, resultClass: Node})
        // reset the query
        this._rawQuery = [
            `SELECT nodes.*, metatypes.name as metatype_name FROM ${NodeMapper.tableName}`,
            `LEFT JOIN metatypes ON metatypes.id = nodes.metatype_id`
        ]

        if(results.isError) return Promise.resolve(Result.Pass(results))

        if(loadMetatypes) {
            await Promise.all(results.value.map(node => {
                return new Promise(resolve => {
                    this.#metatypeRepo.findByID(node.id!)
                        .then(metatype => {
                            if(metatype.isError) {
                                resolve(Result.Failure(`unable to load node's metatypes ${metatype.error?.error}`))
                                return
                            }

                            node.metatype = metatype.value
                            resolve(Result.Success(true))
                        })
                })
            }))
        }

        return Promise.resolve(Result.Success(results.value))
    }
}
