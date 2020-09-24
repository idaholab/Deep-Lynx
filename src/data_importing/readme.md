# Data Ingestion, Sources and Flow

This application has the ability to connect to external programs and services in order to import data through the "Data Sources". Data is then processed based on existing "Type Mappings". 

The following steps demonstrate how data ingestion and processing work, as of 4/27/2020.


# 1. Create Data Source

In order to begin data ingestion you must first specify a data source. A data source serves to maintain both a set of data retrieved/sent and the type mappings (connection between the shape of incoming data and the shape it must be stored in). 


## Method 1 (Recommended)

#### Manual JSON Data Source 

___
Deep Lynx can ingest data manually - but you still must specify a data source. This insures that type mappings and imports are properly tracked. Use the configuration values below to create a manual data source.


**Configuration**
```shell script
// example request body POSTed to /containers/:container-id/import/datasources
{
    "name": "Test Manual Source"
	"adapter_type":"manual",
	"active": true,
    "data_format": "json"
}
```
#### HTTP Data Source
_____
This import adapter allows you to specify an HTTP endpoint, and basic authentication methods, to poll for data retrevial. Data is expected as an array of JSON objects.

**Configuration**
```shell script
// example request body POSTed to /containers/:container-id/import/datasources
{
    "name": "Test HTTP Source"
	"adapter_type":"http",
	"active": true,
    "data_format": "json",
	"config": {
		"endpoint":"",
        "auth_method":"basic",
        "username": "test",
        "password": "test"
	}
}
```


# 2. Ingest Data

As of April 2020 all incoming data through existing source adapters must be ingested as an array of JSON objects. Once data is ingested that database automatically parses and loads said data into to the `data_staging` table. Each row consists of a single piece of data, the connection back to the original import, and status indicators showing whether or not its been mapped to an existing type or inserted into the database. See the reference diagrams for more information.

### Ingestion and Processing flow
![Image](../../images/data_ingestion_workflow.jpg)

# 3. Map Data to Existing Types 

Before data can be processed and inserted into the Deep Lynx database it must be transformed into a valid object. In order to do this, you must create "Type Mappings". Each type mapping tells the system how to treat incoming data. For example, we want to take the following payload:

```$xslt
{
    "RAD": 0.1,
    "COLOR": "blue",
    "TYPE": "PIPE",
    "TEST": "TEST",
    "ITEM_ID": "1234"
}
```

and map it to the `PIPE` Metatype. That Metatype contains a key called `radius`. We need to be able to tell Deep Lynx that payloads shaped like the ones above must be transformed into a payload that is considered a valid `PIPE` type. The type mapping for this payload might look something like this:

```$xslt
{
    "type_key": "TYPE",
    "type_value": "PIPE",
    "unique_identifier_key": "ITEM_ID",
    "metatype_id": "",
    "keys": [
        {
            "key": "RAD",
            "metatype_key_id": "{key id for the radius MetatypeKey}"
        }
    ],
    "example_payload": {
    "RAD": 0.1,
    "COLOR": "blue",
    "TYPE": "PIPE",
    "TEST": "TEST",
    "ITEM_ID": "1234"
    }
}
```

This mapping indicates to Deep Lynx all it needs to know in order to transform the payload above into a valid `PIPE` Metatype.


# 4. Data is Processed

Data is processed by the system automatically. As long as an ingested piece of data is mapped to a type the system will automatically take the data and type mapping - using them to transform and load the data into the Deep Lynx system. This processing is handled by a mix of database triggers, scheduled jobs, and a long polling process handled by the Deep Lynx system itself. See the diagram above for reference.


## Method 2 (Not Recommended)

Deep Lynx _does_ provide the ability to bypass this data storage methodology. This can be useful if you already know the Metatype your data corresponds to and that your data already maps to the Metatype keys. Bypassing the methodology might be beneficial as your data will be instantly queryable and not held back, waiting for type mapping. We recommend you use this method only for the following:


  1. Populating test or demo data when in early stages of development or for demonstration purposes and
  2. Providing an API for modifying an existing data set (creation of data which must be done manually and providing a means to update and delete nodes, their properties, and edges from a GUI)


You can create a node, or edge, through the following endpoints and with the following request bodies. **Note** that you can pass in an array of nodes or edges, you don't need to do just one.

```
/containers/:container-id/graphs/nodes

[{
     "container_id": "required",
     "original_data_id": "optional - but required if planning on being able to update the node from this endpoint",
     "data_source_id": "required",
     "data_type_mapping_id": "optional",
     "metatype_id": "required",
     "modified_at": "optional - set to update node along with the original data id to update if it exists",
     "properties": {}
 }]


/containers/:container-id/graphs/edges

[{
     "container_id": "required",
     "original_data_id": "required",
     "data_source_id": "required",
     "origin_node_id": "required (if origin_node_original_id not set)",
     "destination_node_id": "required (if destination_node_original_id not set)",
     "origin_node_original_id": "create edge based on original ID of node, not Deep Lynx ID",
     "destination_node_original_id": "create edge based on original ID of node, not Deep Lynx ID",
     "relationship_pair_id": "required",
     "modified_at": "will attempt to update edge if exists",
     "properties": {}
 }]
```

