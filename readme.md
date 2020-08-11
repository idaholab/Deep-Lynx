## Setup

---

**Description**

The construction of megaprojects has consistently demonstrated challenges for project managers in regard to meeting cost, schedule, and performance requirements. Megaproject construction challenges are common place within megaprojects with many active projects in the United States failing to meet cost and schedule efforts by significant margins. Currently, engineering teams operate in siloed tools and disparate teams where connections across design, procurement, and construction systems are translated manually or over brittle point-to-point integrations. The manual nature of data exchange increases the risk of silent errors in the reactor design, with each silent error cascading across the design. These cascading errors lead to uncontrollable risk during construction, resulting in significant delays and cost overruns. Deep Lynx allows for an integrated platform during design and operations of mega projects.


**Documentation**

`de-lynx` is documented in the following ways

1. `readme.md` files throughout the application. Can be found for the main application, export adapters, import adapters, and authentication levels.
2. API level documentation in the form of Postman and Swagger collections - found in `api_documentation`
3. Interactive documentation displayed as a website, found by opening `interactive_documentation/index.html`

**Requirements**

- node.js 12.x 
- Typescript ^3.5.x
- npm ^6.x
- Docker ^18.x (optional - used for reproducible builds and development)
- Docker Compose ^1.x.x (optional - used for isolation testing)

***Data Source Requirements***

- PostgreSQL ^11.x **NOTE**: `de-lynx` only functions with a PostgreSQL database. No other SQL like database is currently supported.
- pg_cron PostgreSQL extension: Instructions for installation can be found [here](https://github.com/citusdata/pg_cron)

**Installation**

1. `npm upgrade && npm install`
2. Copy and rename `.env-sample` to `.env` 
3. Update `.env` file you **must** have the following variables set - everything else has default values you can find in `src/config.ts` or in the `.env-sample` file itself.
    *  `CORE_DB_CONNECTION_STRING` - your PostgreSQL database connection string. Note that `de-lynx` only works with a Postgres data source
    *  `DB_NAME` - the name of the database you would like to use. Defaults to `deep_lynx`. This must be the same name as specified in the end of the `CORE_DB_CONNECTION_STRING`.
4. Run `npm run migrate` to automatically create the application schemas in your PostgreSQL database. Scripts are run in alphanumeric order
5. Either use `npm run build:dev` and run the resulting `dist/main.js` file or use `npm run start` to initiate application.
6. At some point you must provide the application with a `.key` file in order for the encryption of data source configurations and SAML authentication to work. See the scripts located in `src/authentication` for more information. Generate and provide your secret key to the application via the environment configuration.

**Configuration**

This application's configuration relies on environment variables of its host system. It is best to rely on your CI/CD pipeline to inject those variables into your runtime environment.

In order to facilitate local development, a method has been provided to configure the application as if you were setting environment variables on your local machine. Including a `.env` file at the projects root and using the `npm run watch`, `npm run start`, or any of the `npm run docker:*` commands will start the application loading the listed variables in that file. See the `.env-sample` file included as part of the project for a list of required variables and formatting help.

**Database Migrations**

A migration tool is provided to run SQL scripts against the configured database. You must run the migration tool at least once after installing the application. 

Run using `npm run migrate` after configuring your datasource.

***Authentication***

Instructions for configuring of provided authentication methods (basic, saml etc.) can be found in the authentication readme. See [Authetication Readme](src/user_management/authentication/readme.md). 


**Testing**

This application uses [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/) for its unit and integration tests. Visit their respective websites and documentation to learn more about how to use and develop tests with their platforms. Only Gremlin functionality of the application is tested at the present time.

Currently, in order to run tests you must provide the application with a data source endpoint. The data source must be a graph database and the data source endpoint must be to a [Gremlin API](https://tinkerpop.apache.org/gremlin.html). If you do not have access to a data source and cannot set one up locally, testing commands have been provided for creating a local instance of Gremlin's in memory graph database [TinkerGraph](http://tinkerpop.apache.org/javadocs/3.2.2/full/org/apache/tinkerpop/gremlin/tinkergraph/structure/TinkerGraph.html).

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
- `gremlin:docker:up` Creates and runs a container with the TinkerGraph database and its Gremlin API endpoint exposed on port 8182.
- `gremlin:docker:down` Stops the TinkerGraph container.
- `watch` Runs `nodemon` using the `nodemon.json` configuration file. This runs the application and automatically rebuilds it when file changes are detected.
- `start` Compiles and runs the application.
- `build:dev` Compiles the application in development mode.
- `test`: Runs all tests using the `.env` file to configure application and tests.
- `generate:documentation` Generates HTML documentation.


## Development
###**Tenets**

This project has adopted a few basic tenets with regards to development.

* **Skinny API Layer:** The API layer should be as small and unobtrusive as possible. It should be fairly easy to switch out the `express.js` framework for another API framework if needed in the future. This practice also allows the use of created code to be more easily used across applications or packaged into standalone libraries.
* **Simple and Explicit:** Variable names, class names, and file names should all be explicit in their naming. While we want to avoid extremely long names, we do favor the use of a slightly longer naming if by doing so the reader can more easily grasp the functionality they're looking at. While the application is complex, the code making up each of its parts should not be. We favor simple code over elegant masterpieces as we hope to create a project that even beginners can contribute to quickly.


###**General Structure**
```shell script
    API (src/api/*.ts)
       ^
  API Handlers (src/api_handlers/*.ts)
       ^
  Data Functions (src/data_*.ts)
       ^
  Data Storage (src/data_storage/*.ts)
```
**API**

The API layer (currently) handles things like user authentication, authorization on routes and connects to either a handler or directly to the data storage layer.

**API Handlers**

When a request needs to do more than simply query the storage layer, a handler can be created. Handlers should be free to access any other part of the system - think of them as glue. We want to keep the other parts of the system pure, talking to themselves only, but with handlers we don't care if they get messy. Handlers should NOT be Express.js specific.

**Data Functions**

Data functions should contain all logic related to the importing, handling, and processing of data post-API handling.

**Data Storage**

Data storage operations should be limited to a single data type and functionality for manipulating it in storage. On creation and update routes, the storage layer also validates and sanitizes user input (we decided to move that into the storage layer in order to maintain a skinny api layer and to provide an "accept anything, return static types" mentality)


###**Data Model Patterns and `io-ts`**

[io-ts](https://github.com/gcanti/io-ts#piping) allows the use of type validation and constraints at runtime. For more information I suggest you read this [post](https://lorefnon.tech/2018/03/25/typescript-and-validations-at-runtime-boundaries/) and study the repo and documentation.

We choose to use `io-ts` over a more traditional type and class approach for a few reasons. First, we get "free" validation in that once we declare our data model, the mechanics of `io-ts`'s decoding and encoding system hands us a very robust and safe type validation at runtime. This allowed us to remove much of the validation logic from the API layer and move it closer to our storage layers. It also allowed us to more easily restrict what information can be put into the document storage database and what is shown when the record is retrieved. Second, program safety afforded by runtime type enforcement and validation gives the program a higher chance of recovering from failure and handling illegal input.

Here is the `io-ts` representation of the `Container` class.

```$ts
import * as t from 'io-ts'


const containerRequired = t.type({
    name: t.string,
    description: t.string,
});

const containerOptional= t.partial({
    _id: t.string,
});

export const container = t.exact(t.intersection([containerRequired, containerOptional]));

export type Container = t.TypeOf<typeof container>

```

`t.type` and `t.partial` allow the user to declare properties whose value is a valid `io-ts` type. The use of `t.type` and/or `t.partial` allow the user to compose other `io-ts` types into a complex data object. In this case we have created two data objects. The first, `containerRequired` is declared with the `t.type` functionality. In order for an object to be encoded or decoded with this type the object must contain all the properties specified, and their value's datatype must match the declared type. `t.partial` on the other hand performs no such check.

After we've declared the two types, one representing required properties and the other representing optional, we combine them into a single type. We also declare that type to be "exact". This means that the encoding and decoding functionality will ignore any property on the entered or resulting object that haven't been declared in the type.

The following code is equivalent to this type declaration:
```$typescript
export type Container = {
    name: string
    description: string
    _id?: string
}
```

While the `io-ts` implementation requires more code, and looks more complex, the flexibility and functionality we gain from using `io-ts` makes the higher learning curve and longer declaration worth it. Take a look at `src/data_types/metatype_keyT.ts` for an even better look at a complex data type using `io.ts`


**Payload Validation Errors**

The use of `io-ts` for payload validation produces detailed, if seemingly complex, set of validation error messages. Below is an example of what a validation error might look like. We will walk through each bit.
```$xslt
Invalid value undefined supplied to : Exact<({ name: string, description: string, originMetatypeID: string, destinationMetatypeID: string, metatypeRelationshipID: string } & Partial<{ _id: string, containerID: string }>)>
0: { name: string, description: string, originMetatypeID: string, destinationMetatypeID: string, metatypeRelationshipID: string }
name: string
```

The first line of the error message informs the user that an error occurred, the type of error, and then returns a formatted representation of the `io-ts` structured type the validation error was thrown for. This error was thrown when attempting to decode a user supplied payload into the `MetatypeRelationshipPair` type. That type is a combination of required fields, `t.exact`, and partial fields, `t.partial`. This is incredibly useful. We inform the user of the exact payload format they must follow in order to avoid errors.

The second line is a simplified expression of what the user supplied payload must look like, along with each field's expected type.

The third line informs the user of the exact field which caused the payload validation failure.


## Application

**Data storage operations and `PostgresStorage`**

TODO: fill this with the explanation of the two ways of handling data storage classes
      one being the way containers/metatypes etc are stored - meant to be thin layers
      between storage and API vs ORM like functionality for more general, internal operations
      
      
### Data Sources
Data can only be ingested through the use of Data Sources. A user must create a Data Source using the relevant endpoints before Deep Lynx can ingest data. This application comes with the ability to connect to various data sources via data source adapters. See [Data Sources](src/data_importing/readme.md).

### File Storage
Deep Lynx can accept files as part of its data ingestion functionality. See the [readme](src/file_storage/readme.md).

### Export Snapshot
This application comes with the ability to export a snapshot to various storage mediums. See [Export Adapters](src/data_exporting/readme.md). 

### Authentication
This application allows the end user to use either Bearer Token or Basic Authentication for application security. See [Authentication](src/user_management/authentication/readme.md) for more information.

### Authorization
This application uses [Casbin](https://casbin.org/) to handle user authorization.

