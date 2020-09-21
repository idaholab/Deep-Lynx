# Querying and Filtering Data in Deep Lynx

## Filtering
Filtering data in Deep Lynx can be accomplished using the relevant "filter" class for a given data type. Here is a brief example of using the filter class.

```
let filter = new NodeFilter()

let results = await filter.where().containerID("eq", "123").all()
```

As you can see, the filter class has many chainable methods for building a filter query. Each of those methods will almost always take two arguments, the `operator` and the `value`. The `operator` is a single word denoting the style of query, see table below for the supported operators. The `value` is of type `any` and represents the value upon which the operator operates.

Here is a list of all supported operators

| Operator | Description|
| ------- | ------ |
| `eq` | equals or equal to|
| `neq` | non-equals or not equal to|
| `like` | matches results against a passed in pattern. This pattern matching mimics Postgres's pattern matching.
| `in` | provided with an enumerable such as an array, or a comma separated string, match all results from passed in value|

<br>

## Querying

Querying data from Deep Lynx is possible through the use of a GraphQL enabled endpoint. Using GraphQL a user can retrieve nodes, walk the graph, and query data based on different requirements. In order to facilitate easy querying, we've listed a few general queries, and the general method by which data is retrieved from Deep Lynx. Please query the endpoint for information on what fields are available on what types. Since those might change frequently we will not take time here to illustrate any of the fields unless they accept arguments or are unique in the response they send.

<br>

#### Fetching nodes or an individual node
______
```
// list by single node id
{
    nodes(nodeID: "id") {
     {list set of properties desired to retrieve} 
     outgoing_edges - incoming edge connections, can query deeper to fetch the actual nodes as well
     incoming_edges - outoing ege connections, can query deeper to fetch the actual nodes as well
    }
}

// list by group of ids, notice how we have to use the "where" filter parameter
{
    nodes(where: {AND: [ {id: "in id1,id2,id3"} ] }) {
     {list set of properties desired to retrieve} 
    }
}
```

#### Fetching nodes with filter
Filter queries are accomplished by passing in a filter object to the `parameter` on supported queries. The filter object consists of two properties, AND and OR. AND and OR should be an array of filter objects, the shape of that object dependent on the query you're currently attempting to filter. See the schema or query it dynamically to find out which input types are acceptable for any given situation.


Here are a few examples of using the filter type for the nodes resolver. Apart from this resolver, you can pass in a `where` filter on the `incoming_edges, outgoing_edges` fields of the return from the node query.
______
```
// filter by metatype name/id
{
    nodes(where: {AND: [ {metatype_name: "eq name"} ]
                  OR:  [ {metatype_id: "eq id"} ] }) {
     {list set of properties desired to retrieve} 
    }
}

// filter by properties - slightly complex as it deals with a properties object
{
    nodes(where: {
        AND: [
            {properties: [
            {key: "flower" value:"Daisy" operator:"eq"}
            ]}
            ]
    }) {
       {list set of properties desired to retrieve}
    }
}


// filter by properties (nested) - by using dot notation you can filter by nested
// keys on the properties object
{
    nodes(where: {
        AND: [
            {properties: [
            {key: "key1.key2" value:"Daisy" operator:"eq"}
            ]}
            ]
    }) {
       {list set of properties desired to retrieve}
    }
}
```

#### Filtering returned node's edges 
When requesting that your query returns a node's incoming or outgoing edges you may also pass in a filter. The query will filter the node's edges to show you only those edges that matched your filter. This is a very common query when attempting to walk the graph.


```
// filter by edge properties
{
            nodes(nodeID: "${nodeID}") {
                incoming_edges(where: {
                AND: [
                    {properties: [
                    {key: "flower" value:"Daisy" operator:"eq"}
                    ]}
                    ]
            }) {id}
            }
}

// filter by edge's relationship name
{
            nodes(nodeID: "${nodeID}") {
                incoming_edges(where: {
                AND: [
                    {relationship_name: "eq parent" }
                    ]
            }) {id}
            }
}
```


#### Fetching files and files with filter
Here are a few other examples, this time we're querying the file storage system of Deep Lynx, not the graph system. The change is subtle.


______
```
// list by single file id
{
    files(fileID: "id") {
     {list set of properties desired to retrieve} 
    }
}

// list by group of ids, notice how we have to use the "where" filter parameter
{
    files(where: {AND: [ {id: "in id1,id2,id3"} ] }) {
     {list set of properties desired to retrieve} 
    }
}

// filter by file name/id
{
    files(where: {AND: [ {file_name: "eq name"} ]
                  OR:  [ {id: "eq id"} ] }) {
     {list set of properties desired to retrieve} 
    }
}
```
