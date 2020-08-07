## Querying in Deep Lynx

Querying data from Deep Lynx is possible through the use of a GraphQL enabled endpoint. Using GraphQL a user can retrieve nodes, walk the graph, and query data based on different requirements. In order to facilitate easy querying, we've listed a few general queries and the general method by which data is retrieved from Deep Lynx. Please query the endpoint for information on what fields are available on what types. Since those might change frequently we will not take time here to illustrate any of the fields unless they accept arguments or are unique in the response they send.

<br>

#### Fetching nodes or an individual node
______
```
{
          **optional**
    nodes(nodeID: "id") {
     {list set of properties desired to retrieve} 
     outgoing_edges - incoming edge connections, can query deeper to fetch the actual nodes as well
     incoming_edges - outoing ege connections, can query deeper to fetch the actual nodes as well
    }
}
```
