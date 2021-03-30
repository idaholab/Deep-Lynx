The construction of megaprojects has consistently demonstrated challenges for project managers in regard to meeting cost, schedule, and performance requirements. Megaproject construction challenges are common place within megaprojects with many active projects in the United States failing to meet cost and schedule efforts by significant margins. Currently, engineering teams operate in siloed tools and disparate teams where connections across design, procurement, and construction systems are translated manually or over brittle point-to-point integrations. The manual nature of data exchange increases the risk of silent errors in the reactor design, with each silent error cascading across the design. These cascading errors lead to uncontrollable risk during construction, resulting in significant delays and cost overruns. Deep Lynx allows for an integrated platform during design and operations of mega projects.

**Documentation**

`Deep Lynx` is documented in the following ways

1. [Wiki](https://github.com/idaholab/Deep-Lynx/wiki)
2. API level documentation in the form of Postman and Swagger collections - found in `api_documentation`

**Requirements**

- node.js  8.x, 10.x, 12.x, 14.x, and 15.x
- Typescript ^3.5.x
- npm ^6.x
- Docker ^18.x - *optional* - for ease of use in development
- Docker Compose ^1.x.x - *optional* - for ease of use in development
- Private RSA key. This is used for encryption of sensitive data. If you need help on generating a private key, we recommend using `openssl` to do so. Here is a [tutorial](https://www.scottbrady91.com/OpenSSL/Creating-RSA-Keys-using-OpenSSL)

***Data Source Requirements***

- **Required** - PostgreSQL ^11.x 

**Installation**

**Steps**

1. NodeJS must be installed. You can find the download for your platform here: https://nodejs.org/en/download/ **note** - Newer versions of Node may be incompatible with some of the following commands.
2. Clone the Deep Lynx [repository](https://github.com/idaholab/Deep-Lynx)
3. Run `npm upgrade && npm install` in your local Deep Lynx directory
4. Copy and rename `.env-sample` to `.env`
5. Update `.env` file. See the `readme` or comments in the file itself for details.If you are not using Docker, ensure that you update the ENCRYPTION_KEY_PATH environment variable in `.env` to reflect the absolute path of a RSA private key.
6. Run `npm run build:dev` to build the internal modules.
7. **optional** - If you would like to use Docker rather than a dedicated PostgreSQL database, please follow these steps:
   - Ensure Docker is installed. You can find the download here: https://www.docker.com/products/docker-desktop
   - Run `npm run docker:postgres:build` to create a docker image containing a Postgres data source
   - Mac users may need to create the directory to mount to the docker container at `/private/var/lib/docker/basedata`. If this directory does not exist, please create it (you may need to use `sudo` as in `sudo mkdir /private/var/lib/docker/basedata`)
   - Run `npm run docker:postgres:run` to run the created docker image (For Mac users, there is an alternative command `npm run mac:docker:postgres:run`)
8. Run `npm run migrate` to create the database and schema within a PostgreSQL database configured in the `.env` file.
9. Run `npm run watch` or `npm run start` to start the application. See the `readme` for additional details and available commands.  
**Configuration**

This application's configuration relies on environment variables of its host system. It is best to rely on your CI/CD pipeline to inject those variables into your runtime environment.

In order to facilitate local development, a method has been provided to configure the application as if you were setting environment variables on your local machine. Including a `.env` file at the projects root and using the `npm run watch`, `npm run start`, or any of the `npm run docker:*` commands will start the application loading the listed variables in that file. See the `.env-sample` file included as part of the project for a list of required variables and formatting help.

**Database Migrations**

A migration tool is provided to run SQL scripts against the configured database. You must run the migration tool at least once after installing the application. 

Run using `npm run migrate` after configuring your datasource.

**Testing**

This application uses [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/) for its unit and integration tests. Visit their respective websites and documentation to learn more about how to use and develop tests with their platforms.

**IMPORTANT NOTE**

If you decide to test graph functionality (Gremlin functionality in particular) in isolation or use something other than a CosmosDB or CosmosDB emulator you _must_ insure that the `DATA_SOURCE_GRAPHSON_V1` environment variable is left blank. Failure to do so means you might be communicating in an unsupported format, or an unsupported combination of formats.


**Available Commands**

Below is a list of all `npm run` commands as listed in the `package.json` file.

- `docker:api:build` Creates a docker image of Deep Lynx, injecting the `.env` file into it.
- `docker:api:run` Runs previously created Deep Lynx image.
- `docker:api:clean` Stops the Deep Lynx docker container run by the command above and deletes the container and image.
- `docker:postgres:build` Creates a docker image containing a Postgres 12 data source, along with all needed extensions.
- `docker:postgres:run` Runs previously created Postgres.
- `docker:postgres:clean` Stops the Postgres docker container run by the command above and deletes the container and image.
- `watch` Runs `nodemon` using the `nodemon.json` configuration file. This runs the application and automatically rebuilds it when file changes are detected.
- `start` Compiles and runs the application.
- `build:dev` Compiles the application in development mode.
- `test`: Runs all tests using the `.env` file to configure application and tests.
- `migrate`: Runs the database migration tool.


**There is a lot more information about Deep Lynx and it's capabilities in it's [Wiki](https://github.com/idaholab/Deep-Lynx/wiki). We highly recommend you start there if you have questions or need to figure out how best to utilize Deep Lynx in your project.**
