/* DEPRECATED */
import {buildSchema} from 'graphql';

export const schema = buildSchema(generateSchema());

function generateSchema(): string {
    return `
  type Query {
    nodes(limit: Int = 1000, offset: Int = 0, nodeID: String, where: NodeWhere): [Node]
    files(limit: Int = 1000, offset: Int = 0, fileID: String, where: FileWhere): [File]
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
    created_at: String
    modified_at: String
    import_data_id: String
    incoming_edges(where: EdgeWhere): [Edge]
    outgoing_edges(where: EdgeWhere): [Edge]
  }

input NodeWhere {
    AND: [NodeFilter]
    OR: [NodeFilter]
}

input NodeFilter {
    id: String
    container_id: String
    original_data_id: String
    data_source_id: String
    metatype_name: String
    metatype_id: String
    properties: [PropertyFilter]
    import_data_id: String
}

input FileWhere {
    AND: [FileFilter]
    OR: [FileFilter]
}

input FileFilter {
    id: String
    container_id: String
    data_source_id: String
    adapter: String
    file_name: String
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
    relationship_name: String
    origin_id: String
    origin_original_id: String
    destination_id: String
    destination_original_id: String
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

  origin_node: Node
  destination_node: Node
  }

  type File {
  id: String
  file_name: String
  file_size: Int
  created_at: String
  modified_at: String
  download_path: String
  metadata: String
  }
`;
}
