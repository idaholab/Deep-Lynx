/*
Resolvers contains the functions used by a GraphQL query to resolve a field
to its known value. This file is a mix of the static resolvers and functionality
for auto-generating resolvers based on the stored ontology.
 */
import NodeStorage from "../data_storage/graph/node_storage";
import MetatypeStorage from "../data_storage/metatype_storage";
import {
    EdgeFilterQL,
    EdgeQL, EdgeWhereQL, FileFilterQL, FileQL, FileWhereQL,
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
import {EdgeT} from "../types/graph/edgeT";
import EdgeFilter from "../data_storage/graph/edge_filter";
import FileStorage from "../data_storage/file_storage";
import Config from "../config";
import {FileT} from "../types/fileT";
import FileFilter from "../data_storage/file_filter";

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
        },

        files: async ({fileID, limit, offset, where}: any) => {
           if(fileID) {
               const file = await FileResolverByID(fileID, containerID)
               return new Promise(resolve => {
                   resolve([file])
               })
           }

           if(!where) {
               const files = await FileStorage.Instance.List(containerID, offset, limit)
               if(files.isError) return Promise.resolve([])

               const output: Promise<FileQL>[] = []

               for(const file of files.value) {
                   output.push(FileResolver(file, containerID))
               }

               return Promise.resolve(Promise.all(output))
           }

           const fileWhere = where as FileWhereQL;
           let filter = new FileFilter().where().containerID("eq", containerID).and();

           for(const n in fileWhere.AND) {
                // in order to utilize the GraphQL error handling we wrap everything
                // in a try catch and pass any errors up
                try {
                    filter = buildFileFilter(filter,fileWhere.AND[n])

                    if(+n !== (fileWhere.AND.length - 1)) {
                        filter = filter.and()
                    }
                } catch(e) {
                    throw e
                }
            }

           for(const n in fileWhere.OR) {
                // in order to utilize the GraphQL error handling we wrap everything
                // in a try catch and pass any errors up
                try {
                    if(+n === 0) {
                        filter = filter.or() // initial OR
                    }

                    filter = buildFileFilter(filter,fileWhere.OR[n])

                    if(+n !== (fileWhere.OR.length - 1)) {
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

           const output: Promise<FileQL>[] = []

           for(const file of results.value) {
                output.push(FileResolver(file, containerID))
            }

           return Promise.resolve(Promise.all(output));
        }
    }
}

async function FileResolverByID(fileID: string, containerID: string): Promise<FileQL> {
    const result = await FileStorage.Instance.DomainRetrieve(fileID, containerID)
    if(result.isError) return Promise.resolve({} as FileQL)

    const createdAt = (result.value.created_at) ? result.value.created_at.toString() : ""
    const modifiedAt = (result.value.modified_at) ? result.value.modified_at.toString() : ""

    const file = {
        id: result.value.id,
        file_name: result.value.file_name,
        file_size: result.value.file_size,
        download_path: `${Config.root_address}/containers/${containerID}/files/${result.value.id}`,
        metadata: JSON.stringify(result.value.metadata),
        created_at: createdAt,
        modified_at: modifiedAt,
    } as FileQL

    return Promise.resolve(file)
}


async function FileResolver(file: FileT, containerID: string): Promise<FileQL> {
    const createdAt = (file.created_at) ? file.created_at.toString() : ""
    const modifiedAt = (file.modified_at) ? file.modified_at.toString() : ""

    const out = {
        id: file.id,
        file_name: file.file_name,
        file_size: file.file_size,
        download_path: `${Config.root_address}/containers/${containerID}/files/${file.id}`,
        metadata: JSON.stringify(file.metadata),
        created_at: createdAt,
        modified_at: modifiedAt,
    } as FileQL

    return Promise.resolve(out)
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
        outgoing_edges: await EdgeResolver(result.value.id!, "outgoing"),
        incoming_edges: await EdgeResolver(result.value.id!, "incoming"),
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
        outgoing_edges: await EdgeResolver(node.id!, "outgoing"),
        incoming_edges: await EdgeResolver(node.id!, "incoming"),
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

async function EdgeResolver(nodeID: string, direction: "incoming" | "outgoing"): Promise<(where: EdgeWhereQL) => Promise<EdgeQL[]>> {
    return Promise.resolve(async (where: EdgeWhereQL): Promise<EdgeQL[]> => {
        let edges: EdgeT[] = []

        let filter = new EdgeFilter().where()

        if(direction === "incoming") {
            filter = filter.destination_node_id("eq", nodeID)
        } else if (direction === "outgoing") {
            filter = filter.origin_node_id("eq", nodeID)
        }

        if(where) {
            const edgeWhere = where as EdgeWhereQL

            for (const e in edgeWhere.AND) {
                try {
                    filter = buildEdgeFilter(filter, edgeWhere.AND[e])

                    if(+e !== (edgeWhere.AND.length -1)) {
                        filter = filter.and()
                    }
                } catch(e) {
                    throw e
                }
            }

            for (const e in edgeWhere.OR) {
                try {
                    if(+e === 0) {
                        filter = filter.or()
                    }

                    filter = buildEdgeFilter(filter, edgeWhere.OR[e])

                    if(+e !== (edgeWhere.OR.length - 1)) {
                        filter = filter.or()
                    }
                } catch(e) {
                    throw e
                }
            }

            // if they setup and OR just right they could get edges back not belonging
            // to the node, verify that this can't happen
            if(direction === "incoming") {
                filter = filter.and().destination_node_id("eq", nodeID)
            } else if (direction === "outgoing") {
                filter = filter.and().origin_node_id("eq", nodeID)
            }
        }

        const result = await filter.all()
        if(result.isError) return Promise.resolve([])

        edges = result.value

        const output: EdgeQL[] = []

        for(const edge of edges) {
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
                destination_node: NodeResolverByID(edge.destination_node_id!, edge.container_id!),
                origin_node: NodeResolverByID(edge.origin_node_id!, edge.container_id!),
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
            value: JSON.stringify(properties[key]),
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
            case "id": {
                let values: string[];
                values = (fql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for id")
                }

                f.id(values[0], values[1])
                break;
            }

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

                const operator = values[0]
                values.shift()
                const query = values.join(" ")

                f.metatypeName(operator, query)
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

            case "import_data_id": {
                let values: string[];
                values = (fql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for import_data_id")
                }

                f.importDataID(values[0], values[1])
                break;
            }
        }
    })

    return f
}

// In order to utilize GraphQL's error type we must throw errors instead of
// returning a Result type for this function. This is one of the few places in
// the application in which throwing errors is encouraged.
function buildEdgeFilter(f: EdgeFilter, eql: EdgeFilterQL): EdgeFilter {
    if(Object.keys(eql).length > 1) {
        throw Error('filter object must only contain a single field')
    }

    Object.keys(eql).forEach(k => {
        switch(k) {
            case "container_id": {
                let values: string[];
                values = (eql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for container_id")
                }


                f.containerID(values[0], values[1])
                break;
            }

            case "relationship_name": {
                let values: string[];
                values = (eql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for metatype_name")
                }

                const operator = values[0]
                values.shift()
                const query = values.join(" ")

                f.relationshipName(operator, query)
                break;
            }

            case "original_data_id": {
                let values: string[];
                values = (eql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for original_data_id")
                }

                f.originalDataID(values[0], values[1])
                break;
            }

            case "archived": {
                let values: string[];
                // @ts-ignore
                values = (eql[k] as string).split(" ");
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
                values = (eql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for data_source_id")
                }

                f.dataSourceID(values[0], values[1])
                break;
            }

            case "origin_node_id": {
                let values: string[];
                values = (eql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for origin_node_id")
                }
                const operator = values[0]
                values.shift()
                const query = values.join(" ")


                f.origin_node_id(values[0], values[1])
                break;
            }

            case "origin_node_original_id": {
                let values: string[];
                values = (eql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for origin_node_original_id")
                }

                f.origin_node_original_id(values[0], values[1])
                break;
            }

            case "destination_node_id": {
                let values: string[];
                values = (eql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for destination_node_id")
                }

                f.destination_node_id(values[0], values[1])
                break;
            }

            case "destination_node_original_id": {
                let values: string[];
                values = (eql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for destination_node_original_id")
                }

                f.destination_node_original_id(values[0], values[1])
                break;
            }

            case "properties": {
                const propertyFilter = eql[k] as PropertyFilterQL[]
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

// In order to utilize GraphQL's error type we must throw errors instead of
// returning a Result type for this function. This is one of the few places in
// the application in which throwing errors is encouraged.
function buildFileFilter(f: FileFilter, fql: FileFilterQL): FileFilter{
    if(Object.keys(fql).length > 1) {
        throw Error('filter object must only contain a single field')
    }

    Object.keys(fql).forEach(k => {
        switch(k) {
            case "id": {
                let values: string[];
                values = (fql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for id")
                }

                f.id(values[0], values[1])
                break;
            }

            case "container_id": {
                let values: string[];
                values = (fql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for container_id")
                }

                f.containerID(values[0], values[1])
                break;
            }

            case "file_name": {
                let values: string[];
                values = (fql[k] as string).split(" ");
                if(values.length < 2) {
                    throw Error("malformed query for metatype_name")
                }

                const operator = values[0]
                values.shift()
                const query = values.join(" ")

                f.file_name(operator, query)
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
        }
    })

    return f
}
