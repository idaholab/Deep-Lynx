import DataSourceRecord, {DataSource, JazzDataSourceConfig} from './data_source';
import Result, {ErrorNotFound} from '../../common_classes/result';
import Logger from '../../services/logger';
import Config from '../../services/config';
import DataSourceMapper from '../../data_access_layer/mappers/data_warehouse/import/data_source_mapper';
import ImportMapper from '../../data_access_layer/mappers/data_warehouse/import/import_mapper';
import NodeRSA from 'node-rsa';
import axios, {AxiosRequestConfig, AxiosResponse} from 'axios';
import {SuperUser} from '../../access_management/user';
import UserRepository from '../../data_access_layer/repositories/access_management/user_repository';
import ImportRepository from '../../data_access_layer/repositories/data_warehouse/import/import_repository';
import StandardDataSourceImpl from './standard_data_source_impl';
import {plainToClass} from 'class-transformer';
import * as https from 'https';
const xml2js = require('xml2js');

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

    // we're overriding this method to run our polling process first then the
    // actual processing loop that the parent class has. This has allowed use to
    // easily reuse the process functions that are similar to the standard class
    async Process(): Promise<Result<boolean>> {
        // we won't stop on error because we need to get the process loop no matter what
        // the poll function will handle logging its own errors
        await this.poll();
        return super.Process();
    }

    // Use the HTTP data source and poll for data. Data is stored in the imports table
    // processing the data is not the responsibility of this portion of the application
    private async poll(): Promise<void> {
        if (!this.DataSourceRecord) {
            Logger.error(`unable to start jazz data source process, no record present`);
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
        Logger.debug(`data source ${this.DataSourceRecord.id} http polling for data`);
        const endpoint = buildUrl(`${config.endpoint}`, {
            path: 'rm/publish/modules',
            queryParams: {
                projectName: config.project_name,
                modifiedSince, // this allows us to limit the return value to only changed records
            },
        });

        // configure and send http request
        let resp: AxiosResponse<any>;
        const httpConfig: AxiosRequestConfig = {};
        httpConfig.headers = {};

        if (lastImport.value && lastImport.value.reference) httpConfig.headers.Reference = lastImport.value.reference;

        if (config.token) httpConfig.headers.Authorization = `Bearer ${config.token}`;

        try {
            // we were running into issues with self-signed certificates, while
            // not recommended this isn't as dangerous as accepting expired or incorrect ones
            if (config.secure) {
                httpConfig.httpsAgent = new https.Agent({rejectUnauthorized: false});
            }

            resp = await axios.get(endpoint, httpConfig);
            if (resp.status > 299 || resp.status < 200 || !resp.data) {
                Logger.debug(`data source ${this.DataSourceRecord.id} poll failed or had no data`);
            } else {
                let reference = '';
                if ('Reference' in resp.headers) reference = resp.headers.Reference;

                // TODO:convert this all to streams with the rest of the system
                // these options allow us to do a lot of trimming before hand
                const parser = new xml2js.Parser({
                    trim: true,
                    normalize: true,
                    normalizeTags: true,
                    mergeAttrs: true,
                    explicitArray: false,
                });

                // this data shaping will need to be moved once we incorporate streams
                const results = await parser.parseStringPromise(resp.data);
                if (results['ds:datasource'] && results['ds:datasource']['rrm:totalCount'] === '0') {
                    Logger.debug(`jazz data response indicates no changes since last poll`);
                    await ImportMapper.Instance.completeTransaction(pollTransaction.value);

                    return Promise.resolve();
                }

                if (!results['ds:datasource'] || !results['ds:datasource']['ds:artifact']) {
                    Logger.error(`jazz data response lacking required fields`);
                    await ImportMapper.Instance.completeTransaction(pollTransaction.value);

                    return Promise.resolve();
                }

                if (!Array.isArray(results['ds:datasource']['ds:artifact'])) {
                    // TODO: move this once we convert to streams
                    Logger.error(`response from http importer must be an array of JSON objects`);
                    await ImportMapper.Instance.completeTransaction(pollTransaction.value);

                    return Promise.resolve();
                }

                // set to super user if we don't know who's running the source
                let user = SuperUser;
                const retrievedUser = await this.#userRepo.findByID(this.DataSourceRecord.created_by!);
                if (!retrievedUser.isError) user = retrievedUser.value;

                const received = await this.ReceiveData(results['ds:datasource']['ds:artifact'], user, {transaction: pollTransaction.value});
                if (received.isError) {
                    Logger.error(`unable to process data received from http data source ${received.error?.error}`);
                }
            }
        } catch (err) {
            Logger.error(`data source ${this.DataSourceRecord.id} poll failed ${err}`);
        }

        // we shouldn't run into issue of a poller double polling even after terminating
        // because we will have created a new import with the current time as the modified_at field
        // that should should up on the find last and lock call
        await ImportMapper.Instance.completeTransaction(pollTransaction.value);

        set = await this.#mapper.SetStatus(this.DataSourceRecord.id!, 'system', 'ready');
        if (set.isError) Logger.error(`unable to update data source status:${set.error?.error}`);

        return Promise.resolve();
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
