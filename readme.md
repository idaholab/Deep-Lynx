The construction of megaprojects has consistently demonstrated challenges for project managers in regard to meeting cost, schedule, and performance requirements. Megaproject construction challenges are common place within megaprojects with many active projects in the United States failing to meet cost and schedule efforts by significant margins. Currently, engineering teams operate in siloed tools and disparate teams where connections across design, procurement, and construction systems are translated manually or over brittle point-to-point integrations. The manual nature of data exchange increases the risk of silent errors in the reactor design, with each silent error cascading across the design. These cascading errors lead to uncontrollable risk during construction, resulting in significant delays and cost overruns. Deep Lynx allows for an integrated platform during design and operations of mega projects.

## **Documentation**

`DeepLynx` is documented in the following ways

1. [Wiki](https://gitlab.software.inl.gov/b650/Deep-Lynx/-/wikis/Home)
2. API level documentation in the form of an OpenAPI (Swagger) collection - found in the `API Documentation` folder

## **Installation and Running Deep Lynx**

### Docker
___________
The easiest way to get DeepLynx up and running is to use Docker. Docker allows for easily reproducible builds and the majority of configuration tasks and database migrations are handled for you.

1. Install the latest version of Docker
2. Clone the DeepLynx repository
3. Navigate to the DeepLynx repository in your terminal/command line/Powershell
4. Type `docker compose up` and hit enter
5. To terminate hit Cntrl-C or Cntrl-D

The initial startup might take a while as the operation must first fetch the pre-built containers from the internet. If you need to change any configuration values edit the `.docker-env` file included in your repository


### **Build From Source**
_________
#### **Requirements**

-   node.js 12.x, 14.x, 15.x, 16.x, 17.x
-   Typescript ^4.x.x
-   npm ^6.x
-   Docker ^18.x - _optional_ - for ease of use in development

**_Data Source Requirements_**

- **Required** - PostgreSQL ^12.x
- **Required** - `pg-crypto` Postgres extension (automatically included with Postgres > 12 and in the Docker images)
- [TimescaleDB Postgres Extension](https://www.timescale.com/) - needed for raw data retention and time-series data

You must follow these steps in the exact order given. Failure to do so will cause Deep Lynx to either fail to launch, or launch with problems.

1. NodeJS must be installed. You can find the download for your platform here: https://nodejs.org/en/download/ **note** - Newer versions of Node may be incompatible with some of the following commands. The most recent version tested that works fully is 16.13.0 - the latest LTS version.

2. Clone the DeepLynx [repository](https://gitlab.software.inl.gov/b650/Deep-Lynx/-/tree/master).
3. Run `npm upgrade && npm ci` in your local DeepLynx directory.
4. Copy and rename `.env-sample` to `.env`.
5. Update `.env` file. See the `readme` or comments in the file itself for details. 
6. **optional** - If you would like to use Docker rather than a dedicated PostgreSQL database, please follow these steps:
   - Ensure Docker is installed. You can find the download here: https://www.docker.com/products/docker-desktop.
   - Run `npm run docker:postgres:build` to create a docker image containing a Postgres data source.
   - Mac users may need to create the directory to mount to the docker container at `/private/var/lib/docker/basedata`. If this directory does not exist, please create it (you may need to use `sudo` as in `sudo mkdir /private/var/lib/docker/basedata`).
   - Verify that image is properly created. See below.
   - Run `npm run docker:postgres:run` to run the created docker image (For Mac users, there is an alternative command `npm run mac:docker:postgres:run`).
   - **Alternatively** you may use `npm run docker:timescale:run` to run a Postgres Docker image with the TimescaleDB extension already installed - to use TimescaleDB change the environment variable `TIMESCALEDB_ENABLED` to be `true`
7. Run `npm run build` to build the internal modules and bundled administration GUI. **Note** You must re-run this command  if you make changes to the administration GUI. Changes to the source code of Deep Lynx itself will be captured if you run the application with the `npm run watch` command
8. Run `npm run watch` or `npm run start` to start the application. See the `readme` for additional details and available commands.  


**Note:** DeepLynx ships with a Vue single page application which serves as the primary UI for the DeepLynx system. You can run this [separately](https://gitlab.software.inl.gov/b650/Deep-Lynx/-/wikis/Administration-Web-App-Installation) (and it's recommended to do so if you're developing it) 

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

You must also have run Deep Lynx at least once in order to run the testing suite.

## **Available Commands**

Below is a list of all `npm run` commands as listed in the `package.json` file.

- `docker:api:build` Creates a docker image of Deep Lynx injecting the .env file for configuration.
- `docker:api:run` Runs previously created Deep Lynx image.
- `docker:api:clean` Stops the Deep Lynx Docker container run by the command above and deletes the container and image.
- `docker:postgres:build` Creates a Docker image containing a Postgres 12 data source.
- `docker:postgres:run` Runs previously created Postgres image.
- `docker:postgres:clean` Stops the Postgres Docker container run by the command above and deletes the container and image.
- `docker:timescale:run` Runs a Postgres 12 Docker container with TimescaleDB already installed.
- `build` Compiles the application
- `start` Runs the compiled application 
- `watch` Starts the application and rebuilds it each time you make a change to the code. **Note:** this command will not rebuild the bundled Admin Web Application
- `test`: Runs all tests using the `.env` file to configure application and tests **Note:** You must have run the application at least once so that the database migration took place correctly.

**There is a lot more information about Deep Lynx, and it's capabilities in its [Wiki](https://gitlab.software.inl.gov/b650/Deep-Lynx/-/wikis/Home). We highly recommend you start there if you have questions or need to figure out how best to utilize Deep Lynx in your project.**
