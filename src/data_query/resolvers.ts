/*
Resolvers contains the functions used by a GraphQL query to resolve a field
to its known value. This file is a mix of the static resolvers and functionality
for auto-generating resolvers based on the stored ontology.
 */
import NodeStorage from "../data_storage/graph/node_storage";
import MetatypeStorage from "../data_storage/metatype_storage";
import EdgeStorage from "../data_storage/graph/edge_storage";
import {
    EdgeQL,
    MetatypeQL,
    MetatypeRelationshipQL,
    NodeFilterQL,
    NodeQL,
    NodeWhereQL,
    PropertyFilterQL,
    PropertyQL
} from "./types";
import {NodeT} from "../types/graph/nodeT";
import MetatypeRelationshipPairStorage from "../data_storage/metatype_relationship_pair_storage";
import Logger from "../logger";
import MetatypeRelationshipStorage from "../data_storage/metatype_relationship_storage";
import NodeFilter from "../data_storage/graph/node_filter";

export default function resolversRoot(containerID: string):any {
    return {
        // the depth parameter isn't used by GraphQL, rather its an option
        // for when other functions use the node resolver
        nodes: async ({nodeID, limit, offset, where}: any) => {
            if(nodeID) {
                const node = await NodeResolverByID(nodeID, containerID)
                return new Promise(resolve => {

                    resolve([node])
                })
            }

            if(!where) {
                // no search parameters, return a simple list for graph based on
                // limit/offset. Default values are provided by the schema so as
                // not to overwhelm the response with hundreds of thousands of nodes
                const nodes = await NodeStorage.Instance.List(containerID, offset, limit)
                if(nodes.isError) return Promise.resolve([])

                const output: Promise<NodeQL>[] = []

                for(const node of nodes.value) {
                    output.push(NodeResolver(node, containerID))
                }

                return Promise.resolve(Promise.all(output));
            }

            const nodeWhere = where as NodeWhereQL
            let filter = new NodeFilter().where().containerID("eq", containerID).and()

            for(const n in nodeWhere.AND) {
                // in order to utilize the GraphQL error handling we wrap everything
                // in a try catch and pass any errors up
                try {
                    filter = buildNodeFilter(filter,nodeWhere.AND[n])

                    if(+n !== (nodeWhere.AND.length - 1)) {
                        filter = filter.and()
                    }
                } catch(e) {
                    throw e
                }
            }

            for(const n in nodeWhere.OR) {
                // in order to utilize the GraphQL error handling we wrap everything
                // in a try catch and pass any errors up
                try {
                    if(+n === 0) {
                        filter = filter.or() // initial OR
                    }

                    filter = buildNodeFilter(filter,nodeWhere.OR[n])

                    if(+n !== (nodeWhere.OR.length - 1)) {
                        filter = filter.or()
                    }
                } catch(e) {
                    throw e
                }

                // limit all results to the currently selected container and unarchived
                filter = filter.and().containerID("eq", containerID)
            }


            const results = await filter.all(limit, offset)
            if(results.isError) return Promise.resolve([])

            const output: Promise<NodeQL>[] = []

            for(const node of results.value) {
                output.push(NodeResolver(node, containerID))
            }

            return Promise.resolve(Promise.all(output));
        }
    }
}


async function NodeResolverByID(nodeID: string, containerID:string): Promise<NodeQL> {
    const result = await NodeStorage.Instance.DomainRetrieve(nodeID, containerID)
    if(result.isError) return Promise.resolve({} as NodeQL) // and log

    const createdAt = (result.value.created_at) ? result.value.created_at.toString() : ""
    const modifiedAt = (result.value.modified_at) ? result.value.modified_at.toString() : ""

    const node = {
        id: result.value.id,
        container_id: result.value.container_id,
        original_data_id: result.value.original_data_id,
        data_source_id: result.value.data_source_id,
        archived: result.value.archived,
        created_at: createdAt,
        modified_at: modifiedAt,
        metatype: MetatypeResolver(result.value.metatype_id),
        properties: PropertyResolver(result.value.properties),
        raw_properties: JSON.stringify(result.value.properties),
        outgoing_edges: await EdgeOutgoingResolver(result.value.id!),
        incoming_edges: await EdgeIncomingResolver(result.value.id!),
    } as NodeQL

    return Promise.resolve(node)
}


async function NodeResolver(node: NodeT, containerID:string): Promise<NodeQL> {
    const createdAt = (node.created_at) ? node.created_at.toString() : ""
    const modifiedAt = (node.modified_at) ? node.modified_at.toString() : ""

    const nodeQL = {
        id: node.id,
        container_id: node.container_id,
        original_data_id: node.original_data_id,
        data_source_id: node.data_source_id,
        archived: node.archived,
        created_at: createdAt,
        modified_at: modifiedAt,
        metatype: MetatypeResolver(node.metatype_id),
        properties: PropertyResolver(node.properties),
        raw_properties: JSON.stringify(node.properties),
        outgoing_edges: await EdgeOutgoingResolver(node.id!),
        incoming_edges: await EdgeIncomingResolver(node.id!),
    } as NodeQL

    return Promise.resolve(nodeQL)
}

async function MetatypeResolver(metatypeID: string): Promise<MetatypeQL> {
    const result = await MetatypeStorage.Instance.Retrieve(metatypeID)
    if(result.isError) return Promise.resolve({} as MetatypeQL)

    return Promise.resolve({
        id: result.value.id,
        name: result.value.name,
        description: result.value.description
    } as MetatypeQL)
}

async function MetatypeRelationshipByPairResolver(relationshipPairID: string): Promise<MetatypeRelationshipQL> {
    const pair = await MetatypeRelationshipPairStorage.Instance.Retrieve(relationshipPairID)
    if(pair.isError) {
        Logger.error(`unable to resolve metatype relationship pair: ${pair.error}`)
        return Promise.resolve({} as MetatypeRelationshipQL)
    }

    const relationship = await MetatypeRelationshipStorage.Instance.Retrieve(pair.value.relationship_id)
    if(relationship.isError) {
        Logger.error(`unable to resolve metatype relationship pair: ${relationship.error}`)
        return Promise.resolve({} as MetatypeRelationshipQL)
    }

    return Promise.resolve({
        id: relationship.value.id,
        name: relationship.value.name,
        description: relationship.value.description
    } as MetatypeRelationshipQL)
}

async function EdgeOutgoingResolver(nodeID: string): Promise<() => Promise<EdgeQL[]>> {
    return Promise.resolve(async (): Promise<EdgeQL[]> => {
        const edges = await EdgeStorage.Instance.ListByOrigin(nodeID)
        if(edges.isError) return Promise.resolve([])

        const output: EdgeQL[] = []

        for(const edge of edges.value) {
            const createdAt = (edge.created_at) ? edge.created_at.toString() : ""
            const modifiedAt = (edge.modified_at) ? edge.modified_at.toString() : ""

            output.push({
                id: edge.id!,
                container_id: edge.container_id!,
                original_data_id: edge.original_data_id!,
                data_source_id: edge.data_source_id!,
                archived: edge.archived!,
                properties: PropertyResolver(edge.properties),
                raw_properties: JSON.stringify(edge.properties),
                relationship: MetatypeRelationshipByPairResolver(edge.relationship_pair_id),
                destination: NodeResolverByID(edge.destination_node_id!, edge.container_id!),
                origin: NodeResolverByID(edge.origin_node_id!, edge.container_id!),
                created_at: createdAt,
                modified_at: modifiedAt
            })
        }

        return Promise.resolve(output)
    })
}


async function EdgeIncomingResolver(nodeID: string): Promise<() => Promise<EdgeQL[]>> {
    return Promise.resolve(async (): Promise<EdgeQL[]> => {
        const edges = await EdgeStorage.Instance.ListByDestination(nodeID)
        if(edges.isError) return Promise.resolve([])

        const output: EdgeQL[] = []

        for(const edge of edges.value) {
            const createdAt = (edge.created_at) ? edge.created_at.toString() : ""
            const modifiedAt = (edge.modified_at) ? edge.modified_at.toString() : ""

            output.push({
                id: edge.id!,
                container_id: edge.container_id!,
                original_data_id: edge.original_data_id!,
                data_source_id: edge.data_source_id!,
                archived: edge.archived!,
                relationship: MetatypeRelationshipByPairResolver(edge.relationship_pair_id),
                properties: PropertyResolver(edge.properties),
                raw_properties: JSON.stringify(edge.properties),
                destination: NodeResolverByID(edge.destination_node_id!, edge.container_id!),
                origin: NodeResolverByID(edge.origin_node_id!, edge.container_id!),
                created_at: createdAt,
                modified_at: modifiedAt
            })
        }

        return Promise.resolve(output)
    })
}

function PropertyResolver(properties: any): PropertyQL[]{
    const output : PropertyQL[] = []
    if(!properties || typeof properties !== 'object') {
        return []
    }

    const keys = Object.keys(properties)

    for(const key of keys){
        output.push({
            key,
            value: properties[key],
            type: typeof properties[key]
        } as PropertyQL)
    }

    return output
}

// In order to utilize GraphQL's error type we must throw errors instead of
// returning a Result type for this function. This is one of the few places in
// the application in which throwing errors is encouraged.
function buildNodeFilter(f: NodeFilter, fql: NodeFilterQL): NodeFilter {
    if(Object.keys(fql).length > 1) {
        throw Error('filter object must only contain a single field')
    }

    Object.keys(fql).forEach(k => {
        switch(k) {
            case "container_id": {
                let values: string[];
                values = (fql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for container_id")
                }

                f.containerID(values[0], values[1])
                break;
            }

            case "metatype_id": {
                let values: string[];
                values = (fql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for metatype_id")
                }

                f.metatypeID(values[0], values[1])
                break;
            }

            case "metatype_name": {
                let values: string[];
                values = (fql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for metatype_name")
                }

                f.metatypeName(values[0], values[1])
                break;
            }

            case "original_data_id": {
                let values: string[];
                values = (fql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for original_data_id")
                }

                f.originalDataID(values[0], values[1])
                break;
            }

            case "archived": {
                let values: string[];
                // @ts-ignore
                values = (fql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for archived")
                }

                if(values[1] !== "t" && values[1] !== "true" && values[1] !== "f" && values[1] !== "false") {
                    throw new Error("malformed query for archived query value must be true, t, false, f")
                }

                f.archived(values[0], values[1])
                break;
            }

            case "data_source_id": {
                let values: string[];
                values = (fql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for data_source_id")
                }

                f.dataSourceID(values[0], values[1])
                break;
            }

            case "properties": {
                const propertyFilter = fql[k] as PropertyFilterQL[]
                for(const i in propertyFilter) {
                    f.property(propertyFilter[i].key, propertyFilter[i].operator, propertyFilter[i].value)

                    if(+i !== propertyFilter.length - 1) {
                        f.and()
                    }
                }

                break;
            }
        }
    })

    return f
}
