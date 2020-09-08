# Ontology Extractor

Ontology Extractor is a NodeJS script that utilizes the Digital Engineering [Deep Lynx](https://github.com/idaholab/Deep-Lynx) API suite to parse an ontology (.owl) file and create the corresponding container, relationships, and metatypes within a Deep Lynx PostgreSQL database. See the Deep Lynx repo for additional schema information and for help with setting it up.

## How to Run

1. Begin by cloning the repo and running `npm install`  
    * Please note that you will need to have **Python installed** (Mac users must also have the XCode Command Line Tools installed). Please see this page for additional [details](https://www.npmjs.com/package/node-gyp).   
2. The script can be run from the command line. Enter the project directory and run `node extractor.js` with the following available options:  

| Name        | Option | Required | Description                                                       |
|-------------|--------|----------|-------------------------------------------------------------------|
| File        | f      | Yes      | Path to the file to extract                                       |
| Name        | n      | Yes      | Desired name of the container                                    |
| Description | d      | Yes      | Desired description for the container                            |
| Hostname    | o      | No       | Hostname for API calls to the de-lynx library. Default: localhost |
| Port        | p      | No       | Port for API calls to the de-lynx library. Default: 8090          |
| Explain     | e      | No       | Explain what containers and classes will be created              |
| Profiles    | l      | No       | Add parsing of profile annotations                                |
| Help        | h      | No       | Display help showing available options                            |  
  
For example, run `node extractor.js -f diamond.owl -n DIAMOND -d obo:IAO_0000115` to run the extractor on the file `diamond.owl` located in the same directory with a container name `DIAMOND`, a description specified by the annotation `obo:IAO_0000115` (taken from the ontology annotations at rdf:RDF -> owl:Ontology), and using the default hostname and port values.  
Note that it is recommended to first run with the option `-e` to verify what results will be achieved with the extractor.  

## Ontology Requirements and Expected Structure
The ontology must be in a certain format to be properly parsed and stored in Deep Lynx. Please adhere to the following guides:  
* Each class, relationship, and data property should have at most one definition annotation. Ontology Extractor expects that the obo:IAO_0000115 annotation is used for class definitions. Please open a GitHub issue if this will not work for your needs.
* Certain characters cannot be parsed correctly. The extractor attempts to remove such characters, but please open a GitHub issue if the extractor is failing to run due to this sort of issue.
* The extractor expects to **create a brand new container** from scratch and does not currently support updating an existing Deep Lynx database.

