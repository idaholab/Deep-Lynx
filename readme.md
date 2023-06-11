![img.png](lynx_blue.png)

## What is DeepLynx?

DeepLynx is a open-source data warehouse focused on enabling complex projects to embrace digital engineering. It accomplishes bringing digital thread and digital twins to these projects with integrations to a large collection of software systems across a project's lifecycle.

Data is stored in a graph-like format following a user-defined domain ontology. Using the provided GraphQL interface, users and applications can request exactly the data they need by using client side defined queries. This aids finding relationships between complex datasets enabling data science efforts and AI/ML.

## Why Embrace Digital Engineering and DeepLynx?

The construction of megaprojects has consistently demonstrated challenges for project managers in regard to meeting cost, schedule, and performance requirements.

Currently, engineering teams operate in siloed tools and disparate teams. Data connections across design, procurement, construction, and operations systems are translated manually or over brittle point-to-point integrations.

This uncoordinated and disjoint data exchange across these siloes increases the risk of silent errors. These silent errors can cascade across the effort and lead to uncontrollable risk during construction, resulting in significant delays and cost overruns.

DeepLynx is a key tool in solving this problem for megaprojects by bringing those siloed efforts into an integrated platform that operates over the course of a project's lifecycle. DeepLynx integrates to widely used enterprise scale software. The list of software integrations include tools such as Innoslate for systems engineering, IBM's DOORS for requirements management, design tools such as AutoDesk's Revit, and asset management in ABB's AssetSuite.

Leveraging this rich set of integrations allows for projects to efficiently consolidate their data into a cohesive data lake. This data lake provides the foundation for digital thread and digital twin efforts.
## **Documentation**

`DeepLynx` is documented in the following ways

1. [Wiki](https://github.com/idaholab/Deep-Lynx/wiki/Home)
2. API level documentation in the form of an OpenAPI (Swagger) collection - found in the `API Documentation` folder

## **Installation and Running DeepLynx**

### Docker
___________
The easiest way to get DeepLynx up and running is to use Docker. Docker allows for easily reproducible builds and the majority of configuration tasks and database migrations are handled for you.

1. Install the latest version of Docker
2. Clone the DeepLynx repository
3. Navigate to the DeepLynx repository in your terminal/command line/Powershell
4. Type `docker compose pull` and wait for the process to finish
5. Type `docker compose up --attach deep-lynx` and hit enter
6. To terminate hit Cntrl-C or Cntrl-D

The initial startup might take a while as the operation must first fetch the pre-built containers from the internet. If you need to change any configuration values edit the `.docker-env` file included in your repository


### **Build From Source**
_________
#### **Requirements**

-   node.js 16.x, 17.x, 18.x, 19.x (untested)
-   Typescript ^4.x.x
-   npm ^6.x
-   Rust ^1.*.* (set to default stable)
-   Docker ^18.x - _optional_ - for ease of use in development

**_Data Source Requirements_**

- **Required** - PostgreSQL ^12.x
- **Required** - `pg-crypto` Postgres extension (automatically included with Postgres > 12 and in the Docker images)
- [TimescaleDB Postgres Extension](https://www.timescale.com/) - needed for raw data retention and time-series data

You must follow these steps in the exact order given. Failure to do so will cause DeepLynx to either fail to launch, or launch with problems.

1. NodeJS must be installed. You can find the download for your platform here: https://nodejs.org/en/download/ **note** - Newer versions of Node may be incompatible with some of the following commands. The most recent version tested that works fully is 16.13.0 - the latest LTS version.  

2. Clone the DeepLynx [repository](https://github.inl.gov/Digital-Engineering/DeepLynx/tree/main).

3. Run `npm run timeseries-setup`. This command will prepare the deeplynx-timeseries library to be used as one of DeepLynx's dependencies.
* NOTE: If you are on some sort of encrypted network, you may encounter an error similar to the following when attempting to set up any rust libraries: `warning: spurious network error... SSL connect error... The revocation function was unable to check revocation for the certificate.` This can be solved by navigating to your root cargo config file (`~/.cargo/config.toml`) file and adding the following lines. If you do not have an existing config.toml file at your root `.cargo` directory, you will need to make one:

```
# in ~/.cargo/config.toml
[http]
check-revoke = false
```

4. Run `npm upgrade && npm ci` to set up all the node library dependencies.

5. Copy and rename `.env-sample` to `.env`.

6. Update `.env` file. See the `readme` or comments in the file itself for details. The main setting people usually change is setting `TIMESCALEDB_ENABLED=true` if they plan on ever working with timeseries data.

7. To build the database using docker, follow step **a**. To use a dedicated PostgreSQL database, follow step **b**. Then continue to step 8.   

- 7a) Building the database using Docker:  
     - Ensure Docker is installed. You can find the download here: https://www.docker.com/products/docker-desktop.  
     - Run `npm run docker:postgres:build` to create a docker image containing a Postgres data source.  
     - Mac users may need to create the directory to mount to the docker container at `/private/var/lib/docker/basedata`. If this directory does not exist, please create it (you may need to use `sudo` as in `sudo mkdir /private/var/lib/docker/basedata`).  
     - Verify that image is properly created. See the screenshot below from Docker Desktop.
![image](uploads/e1d906d0399b1e4f890bf61035e5b64c/image.png)
     - Run `npm run docker:postgres:run` to run the created docker image (For Mac users, there is an alternative command `npm run mac:docker:postgres:run`).  
     - **Alternatively** you may use `npm run docker:timescale:run` (`npm run mac:docker:timescale:run` for Mac)to run a Postgres Docker image with the TimescaleDB extension already installed - to use TimescaleDB change the `.env` environment variable `TIMESCALEDB_ENABLED` to be `true`
- 7b) Building the database using a dedicated PostgreSQL database:  
     - Ensure PostgreSQL is installed. You can find the download here: https://www.postgresql.org/download/. Please see [this page](DeepLynx-Requirements) for the latest requirements on PostgreSQL version.  
     - Run pgAdmin and create a new database. The database name should match whatever value is provided in the `CORE_DB_CONNECTION_STRING` of the `.env` file. The default value is `deep_lynx`.  
     - Ensure a user has been created that also matches the `CORE_DB_CONNECTION_STRING` and that the user's password has been set appropriately. The default username is `postgres` and the default password is `deeplynxcore`.  

8. Run `npm run build` to build the internal modules and bundled administration GUI. **Note** You must re-run this command  if you make changes to the administration GUI.
![image](uploads/72791227158a46ba389346566f745ccb/image.png)

9. Run `npm run watch` or `npm run start` to start the application. See the `readme` for additional details and available commands. **This command starts a process that only ends when a user terminates with Cntrl+C or Cntrl+D - you will see a constant feed of logs from this terminal once you have started DeepLynx. This is normal.** Changes to the source code of DeepLynx will be captured if you run the application with the `npm run watch` command.
![image](uploads/c04ddc5cfea2b77ffe47287d8c213700/image.png)

**Note:** DeepLynx ships with a Vue single page application which serves as the primary UI for the DeepLynx system. You can run this [separately](Administration-Web-App-Installation) (and it's recommended to do so if you're developing it).

**The bundled admin web GUI can be accessed at `{{your base URL}}` - default is `localhost:8090`**

### **Enabling TimescaleDB**

DeepLynx ships with the capability to utilize a Postgres plugin called TimescaleDB. We use this for the storage of time-series data as well as a potential target for raw data retention. This is a powerful tool and you must have it enabled in order to store time-series data on nodes.

1. Change the `TIMESCALEDB_ENABLED` environment variable to read `true`
2. Restart the application.

**Note:** Once you enable TimescaleDB you **cannot** disable it. Please make sure you absolutely need this extension of DeepLynx before taking steps to enable.

**The bundled admin web GUI can be accessed at `{{your base URL}}` - default is `localhost:8090`**
 
### **Configuration**

This application's configuration relies on environment variables of its host system. It is best to rely on your CI/CD pipeline to inject those variables into your runtime environment.

In order to facilitate local development, a method has been provided to configure the application as if you were setting environment variables on your local machine. Including a `.env` file at the projects root and using the `npm run watch`, `npm run start`, or any of the `npm run docker:*` commands will start the application loading the listed variables in that file. See the `.env-sample` file included as part of the project for a list of required variables and formatting help.

### **Database Migrations**

A database migration step takes place each time you launch the application. This ensures that your local database always has the correct schema for your branch.

### **Enabling TimescaleDB**

DeepLynx ships with the capability to utilize a Postgres plugin called TimescaleDB. We use this for the storage of time-series data as well as a potential target for raw data retention. This is a powerful tool and you must have it enabled in order to store time-series data on nodes.

1. Change the `TIMESCALEDB_ENABLED` environment variable to read `true`
2. Restart the application

**Note:** Once you enable TimescaleDB you **cannot** disable it. Please make sure you absolutely need this extension of DeepLynx before taking steps to enable.

## **Testing**

This application uses [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/) for its unit and integration tests. Visit their respective websites and documentation to learn more about how to use and develop tests with their platforms.

**IMPORTANT NOTE**

If you decide to test graph functionality (Gremlin functionality in particular) in isolation or use something other than a CosmosDB or CosmosDB emulator you _must_ ensure that the `DATA_SOURCE_GRAPHSON_V1` environment variable is left blank. Failure to do so means you might be communicating in an unsupported format, or an unsupported combination of formats.

You must also have run DeepLynx at least once in order to run the testing suite.

## **Available Commands**

Below is a list of all `npm run` commands as listed in the `package.json` file.

- `docker:api:build` Creates a docker image of DeepLynx injecting the .env file for configuration.
- `docker:api:run` Runs previously created DeepLynx image.
- `docker:api:clean` Stops the DeepLynx Docker container run by the command above and deletes the container and image.
- `docker:postgres:build` Creates a Docker image containing a Postgres 12 data source.
- `docker:postgres:run` Runs previously created Postgres image.
- `docker:postgres:clean` Stops the Postgres Docker container run by the command above and deletes the container and image.
- `docker:timescale:run` Runs a Postgres 12 Docker container with TimescaleDB already installed.
- `build` Compiles the application
- `start` Runs the compiled application 
- `watch` Starts the application and rebuilds it each time you make a change to the code. **Note:** this command will not rebuild the bundled Admin Web Application
- `test`: Runs all tests using the `.env` file to configure application and tests **Note:** You must have run the application at least once so that the database migration took place correctly.

**There is a lot more information about DeepLynx, and it's capabilities in its [Wiki](https://github.com/idaholab/Deep-Lynx/wiki/). We highly recommend you start there if you have questions or need to figure out how best to utilize DeepLynx in your project.**
