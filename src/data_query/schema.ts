import {buildSchema} from "graphql";

export const schema = buildSchema(generateSchema())


function generateSchema(): string {
    return `
  type Query {
    nodes(limit: Int = 1000, offset: Int = 0, nodeID: String, where: NodeWhere): [Node]
  }

  type Property {
    key: String
    value: String
    type: String
    }

  type Node {
    id: String
    metatype: Metatype
    properties: [Property]
    raw_properties: String
    container_id: String
    original_data_id: String
    data_source_id: String
    archived: Boolean
    created_at: String
    modified_at: String
    graph: String
    incoming_edges(where: EdgeWhere): [Edge]
    outgoing_edges(where: EdgeWhere): [Edge]
  }

input NodeWhere {
    AND: [NodeFilter]
    OR: [NodeFilter]
}

input NodeFilter {
    container_id: String
    original_data_id: String
    data_source_id: String
    archived: String
    metatype_name: String
    metatype_id: String
    properties: [PropertyFilter]
}

input EdgeWhere {
    AND: [EdgeFilter]
    OR: [EdgeFilter]
}

input EdgeFilter {
    container_id: String
    original_data_id: String
    data_source_id: String
    archived: String
    relationship_pair_id: String
    origin_node_id: String
    origin_node_original_id: String
    destination_node_id: String
    destination_node_original_id: String
    properties: [PropertyFilter]
}

input PropertyFilter {
    key: String
    operator: String
    value: String
}

  type Metatype {
    id: String
    name: String
    description: String
  }

  type MetatypeRelationship {
    id: String
    name: String
    description: String
  }

  type Edge {
  id: String
  container_id: String
  original_data_id: String
  data_source_id: String
  archived: Boolean
  created_at: String
  modified_at: String

  relationship: MetatypeRelationship

  origin: Node
  destination: Node
  }
`
}
