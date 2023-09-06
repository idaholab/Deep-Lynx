// this file is designed to store graphQL sample queries
// in an effort to make QueryBuilder more readable
export const metatypeSampleQuery =
`{ # note that classes are referred to as metatypes in GraphQL
  metatypes {
    # optionally add desired filters within ()
    # placed between your metatype name and the {
    YOUR_METATYPE_HERE {
      # put metatype properties you wish to retrieve here
      _record { # contains metadata about the node
        id
        data_source_id
        original_id
        import_id
        metatype_id
        metatype_name
        created_at
        created_by
        modified_at
        modified_by
        metadata
      }
    }
  }
}`;

export const relationshipSampleQuery =
`{
  relationships {
    # optionally add desired filters within ()
    # placed between your relationship name and the {
    YOUR_REALTIONSHIP_HERE {
      # relationship properties you wish to retrieve here
      _record { # contains metadata about the edge
        id
        data_source_id
        original_id
        import_id
        metatype_id
        metatype_name
        created_at
        created_by
        modified_at
        modified_by
        metadata
      }
    }
  }
}`;

export const introspectiveQuery =
`{
  __type(name:"YOUR_METATYPE_OR_RELATIONSHIP_HERE OR graph_type"){
    name
    fields{
      name
      type{
        name
        kind
      }
    }
  }
}`;

export const graphSampleQuery =
`{
  graph(
    root_node: "NODE_ID"
    depth: "3"  # number of layers deep to recursively search on
  ){
    origin_properties
    edge_properties
    destination_properties

    origin_id
    origin_metatype_id
    origin_metatype_name

    edge_id
    relationship_pair_id
    relationship_id
    relationship_name

    destination_id
    destination_metatype_id
    destination_metatype_name

    depth
    path
  }
}`;

export const simpleGraphQuery =
`{
  graph(
    root_node: "NODE_ID"
    depth: "3"
  ) {
    edge_id
    destination_id
    destination_metatype_name
    destination_properties
  }
}`;

export const hintSchema =
`type Any {
  key: String
}

type Metadata {
  conversions: [Any]
  failed_conversions: [Any]
}

type Record {
  id: String
  data_source_id: String
  original_id: String
  import_id: String
  metatype_id: String
  metatype_name: String
  created_at: String
  created_by: String
  modified_at: String
  modified_by: String
  metadata: Metadata
}

type Graph {
  origin_properties: Any
  edge_properties: Any
  destination_properties: Any
  origin_id: String
  origin_metatype_id: String
  origin_metatype_name: String
  edge_id: String
  relationship_pair_id: String
  relationship_id: String
  relationship_name: String
  destination_id: String
  destination_metatype_id: String
  destination_metatype_name: String
  depth: Int
  path: [Any]
}

type Relationship {
  _record: Record
}

type Metatype {
  _record: Record
}

type Query {
  metatypes: Metatype
  relationships: Relationship
  graph(root_node: String, depth: String): Graph
}`