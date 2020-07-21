# Snapshot Exports

This application has the ability to export a snapshot of all currently stored data to different storage mediums. Currently, the application has only the Gremlin Graph API export adapter.


### Gremlin Exporter `gremlin`
_____
This export adapter connects the application to any Gremlin API. Gremlin is used to communicate with graph database solutions such as JanusGraph, Neo4j, and CosmosDB. As long as the storage solution exposes a Gremlin API, this export adapter will function correctly.


**Configuration**
```shell script

// example request body POSTed to /containers/:container-id/data/export
{
    "adapter": "gremlin", - declare adapter name
    "config": {
        "traversal_source": "g", - default is generally 'g', see documentation with questions
        "mime_type": "application/vnd.gremlin-v2.0+json", -  OPTIONAL determines which version of GRAPHson to use, defaults to v3
        "graphson_v1": false, - OPTIONAL force GRAPHson v1, defaults to false 
        "user": "process.env.GREMLIN_PLUGIN_USER || ", - Gremlin user
        "key": "process.env.GREMLIN_PLUGIN_KEY || ", - Gremlin secret key
        "endpoint": "localhost",
        "port": "8182",
        "path": "/gremlin",
        "writes_per_second": 300 - Allows us to throttle the export
    }
}
```
