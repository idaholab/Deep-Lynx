The construction of megaprojects has consistently demonstrated challenges for project managers in regard to meeting cost, schedule, and performance requirements. Megaproject construction challenges are common place within megaprojects with many active projects in the United States failing to meet cost and schedule efforts by significant margins. Currently, engineering teams operate in siloed tools and disparate teams where connections across design, procurement, and construction systems are translated manually or over brittle point-to-point integrations. The manual nature of data exchange increases the risk of silent errors in the reactor design, with each silent error cascading across the design. These cascading errors lead to uncontrollable risk during construction, resulting in significant delays and cost overruns. Deep Lynx allows for an integrated platform during design and operations of mega projects.

##**Documentation**

`DeepLynx` is documented in the following ways

1. [Wiki](https://gitlab.software.inl.gov/b650/Deep-Lynx/-/wikis/Home)
2. API level documentation in the form of an OpenAPI (Swagger) collection - found in the `API Documentation` folder

##**Requirements**

-   node.js 12.x, 14.x, 15.x, 16.x, 17.x
-   Typescript ^4.x.x
-   npm ^6.x
-   Docker ^18.x - _optional_ - for ease of use in development
-   Private RSA key. This is used for encryption of sensitive data. If you need help on generating a private key, we recommend using `openssl` to do so. Here is a [tutorial](https://www.scottbrady91.com/OpenSSL/Creating-RSA-Keys-using-OpenSSL)

**_Data Source Requirements_**

- **Required** - PostgreSQL ^12.x 
- **Required** - `pg-crypto` Postgres extension (automatically included with Postgres > 12 and in the Docker images)
- [TimescaleDB Postgres Extension](https://www.timescale.com/) - needed for raw data retention and time-series data

##**Installation**
You must follow these steps in the exact order given. Failure to do so will cause Deep Lynx to either fail to launch, or launch with problems.

###**Steps**
1. NodeJS must be installed. You can find the download for your platform here: https://nodejs.org/en/download/ **note** - Newer versions of Node may be incompatible with some of the following commands. The most recent version tested that works fully is 16.13.0 - the latest LTS version.

2. Clone the DeepLynx [repository](https://gitlab.software.inl.gov/b650/Deep-Lynx/-/tree/master).
3. Run `npm upgrade && npm install` in your local DeepLynx directory.
4. Copy and rename `.env-sample` to `.env`.
5. Update `.env` file. See the `readme` or comments in the file itself for details. If you are not using Docker, ensure that you update the ENCRYPTION_KEY_PATH environment variable in `.env` to reflect the absolute path of a RSA private key.
6. **optional** - If you would like to use Docker rather than a dedicated PostgreSQL database, please follow these steps:
   - Ensure Docker is installed. You can find the download here: https://www.docker.com/products/docker-desktop.
   - Run `npm run docker:postgres:build` to create a docker image containing a Postgres data source.
   - Mac users may need to create the directory to mount to the docker container at `/private/var/lib/docker/basedata`. If this directory does not exist, please create it (you may need to use `sudo` as in `sudo mkdir /private/var/lib/docker/basedata`).
   - Verify that image is properly created. See below.
   - Run `npm run docker:postgres:run` to run the created docker image (For Mac users, there is an alternative command `npm run mac:docker:postgres:run`).
   - **Alternatively** you may use `npm run docker:timescale:run` to run a Postgres Docker image with the TimescaleDB extension already installed - to use TimescaleDB change the environment variable `TIMESCALEDB_ENABLED` to be `true`
7. Run `npm run migrate` to create the database and schema within a PostgreSQL database configured in the `.env` file.  
8. Run `npm run build:dev` to build the internal modules and bundled administration GUI. **Note** You must re-run this command ONLY if you make changes to the bundled administration GUI. Changes to the source code of Deep Lynx itself will be captured either with the `npm run watch` command or the next time the user runs `npm run start`.
9. A private key file is required to start Deep Lynx. This file is used for various processes related to user management, data export, etc. A key file can be created by simply using the [OpenSSL](https://www.openssl.org/) library. A command such as `openssl genrsa -out private-key.key 2048` will create a private key that will be safely ignored by the `.gitignore`. After the private key file is created, please provide the path to it with the `ENCRYPTION_KEY_PATH` environment variable.
10. Run `npm run watch` or `npm run start` to start the application. See the `readme` for additional details and available commands.  


**Note:** DeepLynx ships with a Vue single page application which serves as the primary UI for the DeepLynx system. While you can run this [separately](https://gitlab.software.inl.gov/b650/Deep-Lynx/-/wikis/Administration-Web-App-Installation) (and it's recommended to do so if you're developing it) we suggest you use the `npm run start-with-web` command or `npm run build:dev` and `npm run start` to build and deploy the included Vue app alongside DeepLynx. This process may take a few minutes each time.

**The bundled admin web GUI can be accessed at `{{your base URL}}` - default is `localhost:8090`**
 
###**Configuration**

This application's configuration relies on environment variables of its host system. It is best to rely on your CI/CD pipeline to inject those variables into your runtime environment.

In order to facilitate local development, a method has been provided to configure the application as if you were setting environment variables on your local machine. Including a `.env` file at the projects root and using the `npm run watch`, `npm run start`, or any of the `npm run docker:*` commands will start the application loading the listed variables in that file. See the `.env-sample` file included as part of the project for a list of required variables and formatting help.

###**Database Migrations**

A migration tool is provided to run SQL scripts against the configured database. You must run the migration tool at least once after installing the application.

Run using `npm run migrate` after configuring your datasource.

###**Enabling TimescaleDB**

DeepLynx ships with the capability to utilize a Postgres plugin called TimescaleDB. We use this for the storage of time-series data as well as a potential target for raw data retention. This is a powerful tool and you must have it enabled in order to store time-series data on nodes.

1. Change the `TIMESCALEDB_ENABLED` environment variable to read `true`
2. Run `npm run migrate` - there are TimescaleDB specific migrations that must be ran in order for your installation to work correctly

**Note:** Once you enable TimescaleDB you **cannot** disable it. Please make sure you absolutely need this extension of DeepLynx before taking steps to enable.

##**Testing**

This application uses [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/) for its unit and integration tests. Visit their respective websites and documentation to learn more about how to use and develop tests with their platforms.

**IMPORTANT NOTE**

If you decide to test graph functionality (Gremlin functionality in particular) in isolation or use something other than a CosmosDB or CosmosDB emulator you _must_ insure that the `DATA_SOURCE_GRAPHSON_V1` environment variable is left blank. Failure to do so means you might be communicating in an unsupported format, or an unsupported combination of formats.

##**Available Commands**

Below is a list of all `npm run` commands as listed in the `package.json` file.

- `docker:api:build` Creates a docker image of Deep Lynx, injecting the `.env` file into it. **Note**: You must updated the environment variables in the Dockerfile prior to building. They explain what they do in the comments above them - they are needed for the bundled admin gui vue application to work correctly.
- `docker:api:run` Runs previously created Deep Lynx image.
- `docker:api:clean` Stops the Deep Lynx docker container run by the command above and deletes the container and image.
- `docker:postgres:build` Creates a docker image containing a Postgres 12 data source, along with all needed extensions and bundled web app - this might take a few minutes to run.
- `docker:postgres:run` Runs previously created Postgres.
- `docker:postgres:clean` Stops the Postgres docker container run by the command above and deletes the container and image.
- `watch` Runs `nodemon` using the `nodemon.json` configuration file. This runs the application and automatically rebuilds it when file changes are detected.
- `docker:timescale:run` Runs a Postgres Docker container with TimescaleDB already installed.
- `start-with-web` Compiles and runs the application - this includes the bundled Admin Web App. This command might take a few minutes to run.
- `start` Compiles and runs the application without rebuilding the Admin Web App. 
- `build:dev-with-web` Compiles the application in development mode - this includes the bundled Admin Web App. This command might take a few minutes to run.
- `build:dev` Compiles the application in development mode without rebuilding the Admin Web App.
- `test`: Runs all tests using the `.env` file to configure application and tests.
- `migrate`: Runs the database migration tool.

**There is a lot more information about Deep Lynx, and it's capabilities in its [Wiki](https://gitlab.software.inl.gov/b650/Deep-Lynx/-/wikis/Home). We highly recommend you start there if you have questions or need to figure out how best to utilize Deep Lynx in your project.**
