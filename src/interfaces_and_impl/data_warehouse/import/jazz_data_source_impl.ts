import DataSourceRecord, {JazzDataSourceConfig} from '../../../domain_objects/data_warehouse/import/data_source';
import Result, {ErrorNotFound} from '../../../common_classes/result';
import Logger from '../../../services/logger';
import Config from '../../../services/config';
import DataSourceMapper from '../../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import ImportMapper from '../../../data_access_layer/mappers/data_warehouse/import/import_mapper';
import NodeRSA from 'node-rsa';
import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';
import {SuperUser} from '../../../domain_objects/access_management/user';
import UserRepository from '../../../data_access_layer/repositories/access_management/user_repository';
import ImportRepository from '../../../data_access_layer/repositories/data_warehouse/import/import_repository';
import StandardDataSourceImpl from './standard_data_source_impl';
import {plainToClass} from 'class-transformer';
import * as https from 'https';
import {PoolClient} from 'pg';
import {Readable} from 'stream';
import Import from '../../../domain_objects/data_warehouse/import/import';
import {DataSource} from './data_source';

const parser = require('fast-xml-parser');
const buildUrl = require('build-url');

/*
 HttpImpl is a data source which polls and HTTP source for data every x seconds
 this implementation allows the user to query both basic authentication and
 bearer token secured endpoints for JSON data.
*/
export default class JazzDataSourceImpl extends StandardDataSourceImpl implements DataSource {
    #mapper = DataSourceMapper.Instance;
    #userRepo = new UserRepository();
    #importRepo = new ImportRepository();
    decrypted = false;

    constructor(record: DataSourceRecord) {
        super(record);
        this.decryptDataSourceRecord();
    }

    private decryptDataSourceRecord() {
        // if this is coming from the database it will have an id, this indicates
        // we need to decrypt certain parts of the config before working
        if (this.DataSourceRecord && this.DataSourceRecord.id && !this.decrypted) {
            const key = new NodeRSA(Config.encryption_key_secret);

            try {
                (this.DataSourceRecord.config as JazzDataSourceConfig).token = key.decryptPublic(
                    (this.DataSourceRecord.config as JazzDataSourceConfig).token!,
                    'utf8',
                );

                this.decrypted = true;
            } catch (err) {
                Logger.error(`error while attempting to decrypt http data source config ${err}`);
                return;
            }
        }
    }

    // Poll for data. Data is stored in the imports table
    // processing the data is not the responsibility of this portion of the application
    async Run(): Promise<void> {
        if (!this.DataSourceRecord) {
            Logger.error(`unable to start jazz data source process, no record present`);
            return Promise.resolve();
        }

        if (this.DataSourceRecord.status === 'polling') {
            Logger.debug('data source already polling, aborting poll attempt');
            return Promise.resolve();
        }

        let set = await this.#mapper.SetStatus(this.DataSourceRecord.id!, 'system', 'polling');
        if (set.isError) Logger.error(`unable to update data source status:${set.error?.error}`);

        // because the user could have either set the source to inactive or modified
        // the configuration since this last ran, update the current data source record
        // with the most recent version
        const retrievedSource: Result<DataSourceRecord> = await this.#mapper.Retrieve(this.DataSourceRecord.id!);
        if (retrievedSource.isError) {
            Logger.error(`unable to retrieve latest data source record for processing ${retrievedSource.error?.error}`);
            return Promise.resolve(); // break completely if we don't have a source
        }

        this.DataSourceRecord = retrievedSource.value;
        // since we pulled this from the database, we need to decrypt prior to poll
        this.decrypted = false;
        this.decryptDataSourceRecord();

        // cut if we're no longer set to active
        if (!this.DataSourceRecord.active) {
            set = await this.#mapper.SetStatus(this.DataSourceRecord.id!, 'system', 'ready');
            if (set.isError) Logger.error(`unable to update data source status:${set.error?.error}`);

            return Promise.resolve();
        }

        // let's give the config an easier way of being referenced
        const config = this.DataSourceRecord.config as JazzDataSourceConfig;

        // we start a transaction so that we can lock the previous and new import
        // rows while we attempt to poll new data
        const pollTransaction = await DataSourceMapper.Instance.startTransaction();
        if (pollTransaction.isError) {
            Logger.error(`unable to initiate db transaction ${pollTransaction.error}`);
            return Promise.resolve();
        }

        // fetch last import, include time as url param - we lock the record on
        // retrieval because if we can successfully lock it it means that it's
        // not currently being processed or another export polling function is
        // acting on it
        const lastImport = await this.#importRepo.findLastAndLock(this.DataSourceRecord.id!, pollTransaction.value);

        // for the query param which dictates the time period to fetch from
        let modifiedSince = '';

        // if this isn't a not found error it means we couldn't lock the record
        // which means it's being processed
        if (lastImport.isError && lastImport.error !== ErrorNotFound) {
            await ImportMapper.Instance.completeTransaction(pollTransaction.value);
            return Promise.resolve();
        }

        if (lastImport.value && lastImport.value.modified_at) {
            modifiedSince = lastImport.value.modified_at.toISOString();
            const nextRunTime = new Date(lastImport.value.modified_at.getTime() + config.poll_interval * 60000);

            // if we haven't reached the next poll time, intelligently sleep
            // only the amount of time remaining
            if (nextRunTime.getTime() <= new Date().getTime()) {
                // terminate the transaction so we're not holding the connection open
                await ImportMapper.Instance.completeTransaction(pollTransaction.value);
                return Promise.resolve();
            }
        }

        // create http request
        Logger.debug(`data source ${this.DataSourceRecord.id} jazz data source polling for data`);
        const endpoint = buildUrl(`${config.endpoint}`, {
            path: 'rm/publish/text',
            queryParams: {
                size: config.limit ? config.limit : undefined,
                projectName: config.project_name,
                modifiedSince, // this allows us to limit the return value to only changed records
                typeName: config.artifact_types.join(','),
            },
        });

        // send the request
        const result = await this.requestData(config, pollTransaction.value, endpoint);
        // if we fail for any reason, you'll need rollback the transaction
        if (result.isError) {
            await ImportMapper.Instance.rollbackTransaction(pollTransaction.value);

            set = await this.#mapper.SetStatus(this.DataSourceRecord.id!, 'system', 'error', result.error?.error);
            if (set.isError) Logger.error(`unable to update data source status:${set.error?.error}`);
        } else {
            // we shouldn't run into issue of a poller double polling even after terminating
            // because we will have created a new import with the current time as the modified_at field
            // that should should up on the find last and lock call
            await ImportMapper.Instance.completeTransaction(pollTransaction.value);

            set = await this.#mapper.SetStatus(this.DataSourceRecord.id!, 'system', 'ready');
            if (set.isError) Logger.error(`unable to update data source status:${set.error?.error}`);
        }

        return Promise.resolve();
    }

    // request data is the actual Jazz server request - we're writing it this way so that we can recursively call this
    // function in order to paginate Jazz server results, passing it an import adds the data from the call to an existing
    // import instead of creating a new one and including a URL will override whatever generated URL we use for that one
    // this is useful because Jazz, when paging results, returns a prebuilt URL you must use to fetch the next page of
    // results and Jazz will continue to return a URL to call until all results have been fetched
    // Note: you do not need to set the modifiedSince query parameter in subsequent paging calls, it will be set automatically
    private async requestData(config: JazzDataSourceConfig, pollTransaction: PoolClient, url: string, importID?: string): Promise<Result<any>> {
        let resp: AxiosResponse<any>;
        const httpConfig: AxiosRequestConfig = {};
        httpConfig.headers = {};

        if (config.token) httpConfig.headers.Authorization = `Bearer ${config.token}`;
        try {
            // we were running into issues with self-signed certificates, while
            // not recommended this isn't as dangerous as accepting expired or incorrect ones
            if (config.secure) {
                httpConfig.httpsAgent = new https.Agent({rejectUnauthorized: false});
            }

            resp = await axios.get(url, httpConfig);
            if (resp.status > 299 || resp.status < 200 || !resp.data) {
                Logger.debug(`data source ${this.DataSourceRecord!.id} poll failed or had no data`);
                return Promise.resolve(Result.Failure(`data source ${this.DataSourceRecord!.id} poll failed or had no data`));
            } else {
                let reference = '';
                if ('Reference' in resp.headers) reference = resp.headers.Reference;

                // Unfortunately because we need information from the payload we cannot stream convert this xml to
                // valid JSON - these options allow us to do a lot of trimming beforehand however, and should minimize
                // the memory footprint. If we start to run into issues with response size, we should rethink either the
                // adapter or the data source's limit configuration. I've attempted to write this as streams, but due to
                // the recursive nature of needing to call out to the server again for pagination we risk holding many
                // http responses open and swamping memory and the external adapter anyway
                const options = {
                    attrNodeName: 'attr', // default is 'false'
                    textNodeName: '#text',
                    ignoreAttributes: false,
                    ignoreNameSpace: true,
                    allowBooleanAttributes: false,
                    parseNodeValue: true,
                    parseAttributeValue: false,
                    trimValues: true,
                    cdataTagName: '__cdata', // default is 'false'
                    cdataPositionChar: '\\c',
                    parseTrueNumberOnly: false,
                    arrayMode: false,
                    stopNodes: ['richTextBody'], // if we let the parser attempt to parse this we got a horrible object
                };

                // this data shaping will need to be moved once we incorporate streams
                const results = parser.parse(resp.data, options);

                if (results.dataSource && results.dataSource.attr['@_totalCount'] === '0') {
                    Logger.debug(`jazz data response indicates no changes since last poll`);

                    return Promise.resolve(Result.Success(true));
                }

                if (!results.dataSource || !results.dataSource.artifact) {
                    Logger.error(`jazz data response lacking required fields`);

                    return Promise.resolve(Result.Failure(`jazz data response lacking required fields`));
                }

                if (!Array.isArray(results.dataSource.artifact)) {
                    results.dataSource.artifact = [results.dataSource.artifact];
                }

                /*
                we're going to build a custom Reader so that we can avoid having to loop over the data twice
                this transform stream is for aggregating the custom attributes and converting them from an array to
                an object - this is necessary so that the type mapping can more easily function for jazz specific
                adapters

                this is the response body's nesting attribute names - I don't like hardcoding these as if the response
                body changes so to will this code, but the other option is that we have a very large, convoluted configuration
                object that the lay user will have no idea how to deal with - considering how set in stone the return
                structure is I'm not too worried.

                artifact - collaboration - attributes - objectType - customAttribute[array] -> attr -> @_datatype e.g http://www.w3.org/2001/XMLSchema#int
                                                                                                @_name
                                                                                                @_value
                */
                const reader = new Readable({
                    read() {
                        if (results.dataSource.artifact.length === 0) this.push(null);
                        else {
                            const artifact = results.dataSource.artifact.shift();

                            // ?. lets us safely access nested object properties even if something in the chain doesn't exist
                            if (Array.isArray(artifact?.collaboration?.attributes?.objectType?.customAttribute)) {
                                const transformed: {[key: string]: any} = {};

                                // loop through the custom attributes and build out the transformed object
                                artifact.collaboration.attributes.objectType.customAttribute.forEach((custom: {[key: string]: any}) => {
                                    switch (custom.attr['@_datatype']) {
                                        case 'http://www.w3.org/2001/XMLSchema#int': {
                                            const int = parseInt(custom.attr['@_value'], 10); // we assume we're using base10
                                            isNaN(int)
                                                ? (transformed[custom.attr['@_name']] = custom.attr['@_value'])
                                                : (transformed[custom.attr['@_name']] = int);
                                            break;
                                        }

                                        case 'http://www.w3.org/2001/XMLSchema#double' ||
                                            'http://www.w3.org/2001/XMLSchema#float' ||
                                            'http://www.w3.org/2001/XMLSchema#decimal': {
                                            const float = parseFloat(custom.attr['@_value']);
                                            isNaN(float)
                                                ? (transformed[custom.attr['@_name']] = custom.attr['@_value'])
                                                : (transformed[custom.attr['@_name']] = float);
                                            break;
                                        }

                                        // default to whatever value xml has, typically a string
                                        default: {
                                            transformed[custom.attr['@_name']] = custom.attr['@_value'];
                                        }
                                    }
                                });

                                artifact.collaboration.attributes.objectType.customAttribute = transformed;

                                // we also cleanup the rich text body by stripping out the HTML
                                if (artifact.content?.text?.richTextBody) {
                                    artifact.content.text.richTextBody = artifact.content.text.richTextBody.replace(/<\/?[^>]+(>|$)/g, '').trim();
                                }
                            }

                            this.push(artifact);
                        }
                    },
                    objectMode: true,
                });

                // set to super user if we don't know who's running the source
                let user = SuperUser;
                const retrievedUser = await this.#userRepo.findByID(this.DataSourceRecord!.created_by!);
                if (!retrievedUser.isError) user = retrievedUser.value;

                const received = await this.ReceiveData(reader, user, {
                    importID: importID ? importID : undefined,
                    transaction: pollTransaction,
                    overrideJsonStream: true,
                });
                if (received.isError) {
                    Logger.error(`unable to process data received from http data source ${received.error?.error}`);

                    return Promise.resolve(Result.Failure(`unable to process data received from http data source ${received.error?.error}`));
                }
                // href potentially has an already formatted URL for pagination
                // contains all previously passed params for fetching next page
                if (results.dataSource.attr['@_href']) {
                    Logger.debug('jazz data source responded with paginated content, attempting to call pagination url');

                    // set the pagination url and clean up from the fact xml screwed up the URL encoding somehow
                    const paginationURL = results.dataSource.attr['@_href'].replace(/&amp;/g, '&');

                    const result = await this.requestData(config, pollTransaction, paginationURL, (received.value as Import).id);
                    if (result.isError) {
                        return Promise.resolve(Result.Pass(result));
                    }
                }
            }
        } catch (err) {
            Logger.error(`data source ${this.DataSourceRecord!.id} poll failed ${err}`);
        }

        return Promise.resolve(Result.Success(true));
    }

    // we'll need to encrypt the config prior to saving
    async ToSave(): Promise<DataSourceRecord> {
        const key = new NodeRSA(Config.encryption_key_secret);

        const output = plainToClass(DataSourceRecord, {}); // we do this to avoid having to use the constructor or pollute current record
        Object.assign(output, this.DataSourceRecord);

        (output.config as JazzDataSourceConfig).token = key.encryptPrivate((output.config as JazzDataSourceConfig).token!, 'base64');

        return Promise.resolve(output);
    }
}
