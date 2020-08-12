import {buildSchema} from "graphql";

export const schema = buildSchema(generateSchema())


function generateSchema(): string {
    return `
  type Query {
    nodes(limit: Int = 1000, offset: Int = 0, nodeID: String): [Node]
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
    incoming_edges: [Edge]
    outgoing_edges: [Edge]
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
