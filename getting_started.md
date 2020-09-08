# Getting Started with Deep Lynx
In order to get Deep Lynx set up in a local environment for development and testing purposes, please follow these steps:  
1. Ensure Docker is installed. You can find the download here: https://www.docker.com/products/docker-desktop
2. NodeJS must also be installed. You can find the download for your platform here: https://nodejs.org/en/download/
3. Clone the Deep Lynx [repository](https://github.com/idaholab/Deep-Lynx)
4. Run `npm upgrade && npm install` in your local Deep Lynx directory
5. Copy and rename `.env-sample` to `.env` 
6. Update `.env` file. See the `readme` for details. 
7. Run `npm run docker:postgres:build` to create a docker image containing a Postgres data source
8. Run `npm run docker:postgres:run` to run the created docker image (For Mac users, there is an alternative command `mac:docker:postgres:run`)
9. Run `npm run migrate` to create the database and schema within Postgres 
10. Run `npm run watch` or `npm run start` to start the application. See the `readme` for additional details and available commands.  
  
### Populating Metatypes with the DIAMOND Ontology
The `tools/ontology_extractor` folder contains code for populating an instance of Deep Lynx with the DIAMOND ontology. First, download the latest version of DIAMOND from [GitHub](https://github.com/idaholab/DIAMOND). Then follow the instructions in `tools/ontology_extractor/readme.md`, running `npm install` within the `tools/ontology_extractor` folder. Please note that you will need to have **Python installed** (Mac users must also have the XCode Command Line Tools installed). Please see this page for additional [details](https://www.npmjs.com/package/node-gyp). You can then run the `extractor.js` script, specifying the path to the `diamond.owl` file you downloaded from GitHub.