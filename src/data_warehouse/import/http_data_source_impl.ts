import DataSourceRecord, {DataSource, HttpDataSourceConfig} from "./data_source";
import Result from "../../common_classes/result";
import Logger from "../../services/logger"
import Config from "../../services/config";
import DataSourceMapper from "../../data_access_layer/mappers/data_warehouse/import/data_source_mapper";
import ImportMapper from "../../data_access_layer/mappers/data_warehouse/import/import_mapper";
import NodeRSA from "node-rsa";
import axios, {AxiosResponse} from "axios"
import {SuperUser} from "../../access_management/user";
import UserRepository from "../../data_access_layer/repositories/access_management/user_repository";
import ImportRepository from "../../data_access_layer/repositories/data_warehouse/import/import_repository";
import StandardDataSourceImpl from "./standard_data_source_impl";
import {plainToClass} from "class-transformer";

// HttpImpl is a data source which polls and HTTP source for data every x seconds
// this implementation allows the user to query both basic authentication and
// bearer token secured endpoints for JSON data.
export default class HttpDataSourceImpl extends StandardDataSourceImpl implements DataSource {
    #mapper = DataSourceMapper.Instance
    #userRepo = new UserRepository()
    #importRepo = new ImportRepository()

    constructor(record: DataSourceRecord) {
        super(record);
        this.decryptDataSourceRecord()
    }

    private decryptDataSourceRecord() {
        // if this is coming from the database it will have an id, this indicates
        // we need to decrypt certain parts of the config before working
        if(this.DataSourceRecord && this.DataSourceRecord.id) {
            const key = new NodeRSA(Config.encryption_key_secret);

            try {
                if((this.DataSourceRecord.config as HttpDataSourceConfig).auth_method === "basic") {
                    (this.DataSourceRecord.config as HttpDataSourceConfig).username = key.decryptPublic((this.DataSourceRecord.config as HttpDataSourceConfig).username!, 'utf8');
                    (this.DataSourceRecord.config as HttpDataSourceConfig).password = key.decryptPublic((this.DataSourceRecord.config as HttpDataSourceConfig).password!, "utf8")
                }

                if((this.DataSourceRecord.config as HttpDataSourceConfig).auth_method === "token") {
                    (this.DataSourceRecord.config as HttpDataSourceConfig).token = key.decryptPublic((this.DataSourceRecord.config as HttpDataSourceConfig).token!, 'utf8');
                }
            } catch(err) {
                Logger.error(`error while attempting to decrypt http data source config ${err}`)
                return
            }
        }
    }

    // we're overriding this method to start our polling process along with the
    // actual processing loop that the parent class has. This has allowed use to
    // easily reuse the process functions that are similar to the standard class
    async Process(loopOnce?: boolean):Promise<void>{
       this.startPolling()
       return super.Process(loopOnce)
    }

    // Use the HTTP data source and poll for data. Data is stored in the imports table
    // processing the data is not the responsibility of this portion of the application
    private async startPolling(): Promise<void> {
        if(!this.DataSourceRecord) {
            Logger.error(`unable to start http data source process, no record present`)
            return
        }

        while(true) {
            // because the user could have either set the source to inactive or modified
            // the configuration since this last ran, update the current data source record
            // with the most recent version
            const retrievedSource: Result<DataSourceRecord> = await this.#mapper.Retrieve(this.DataSourceRecord!.id!)
            if(retrievedSource.isError) {
                Logger.error(`unable to retrieve latest data source record for processing ${retrievedSource.error?.error}`)
                return // break completely if we don't have a source
            }

            this.DataSourceRecord = retrievedSource.value

            // cut if we're no longer set to active
            if(!this.DataSourceRecord!.active)  break;

            // let's give the config an easier way of being referenced
            const config = this.DataSourceRecord.config as HttpDataSourceConfig

            // we start a transaction so that we can lock the previous and new import
            // rows while we attempt to poll new data
            const pollTransaction = await DataSourceMapper.Instance.startTransaction()
            if(pollTransaction.isError) {
                Logger.error(`unable to initiate db transaction ${pollTransaction.error}`);

                (config.poll_interval) ?  await this.delay((config.poll_interval! * 1000)) : await this.delay(1000)
                continue
            }

            // fetch last import, include time as url param - we lock the record on
            // retrieval because if we can successfully lock it it means that it's
            // not currently being processed or another export polling function is
            // acting on it
            const lastImport = await this.#importRepo.findLastAndLock(this.DataSourceRecord.id!, pollTransaction.value);
            if(lastImport.isError) {
                Logger.error(`unable to retrieve and lock last import ${lastImport.error}`);
                (config.poll_interval) ?  await this.delay((config.poll_interval! * 1000)) : await this.delay(1000)
                await ImportMapper.Instance.completeTransaction(pollTransaction.value)

                continue
            }

            let lastImportTime = "";
            if(!lastImport.isError && lastImport.value.status === "completed") {
                lastImportTime = (lastImport.value.modified_at as Date).toUTCString()
            }

            if(lastImport.value && lastImport.value.status !== "completed") {
                (config.poll_interval) ?  await this.delay((config.poll_interval! * 1000)) : await this.delay(1000)
                await ImportMapper.Instance.completeTransaction(pollTransaction.value)

                continue;
            }

            // create http request
            Logger.debug(`data source ${this.DataSourceRecord.id} http polling for data`);
            const endpoint = `${config.endpoint}?lastImport=${lastImportTime}`;

            // configure and send http request
            let resp: AxiosResponse<any>;
            const httpConfig: {[key:string]:any} = {};

            if(lastImport.value && lastImport.value.reference) httpConfig.headers.Reference = lastImport.value.reference

            switch(config.auth_method) {
                case "basic": {
                    httpConfig.auth = {
                        username: config.username!,
                        password: config.password!
                    }
                }

                case "token": {
                    if(config.token) httpConfig.headers.Authorization = `Bearer ${config.token}`;
                }
            }

            try {
                resp = await axios.get(endpoint, httpConfig);
                if(resp.status > 299 || resp.status < 200 || !resp.data) {
                    Logger.debug(`data source ${this.DataSourceRecord.id} poll failed or had no data`)
                } else {
                    let reference = ""
                    if("Reference" in resp.headers) reference = resp.headers.Reference

                    if(!Array.isArray(resp.data)) {
                        Logger.error(`response from http importer must be an array of JSON objects`)
                        await ImportMapper.Instance.completeTransaction(pollTransaction.value)

                        continue
                    }

                    // set to super user if we don't know who's running the source
                    let user = SuperUser
                    const retrievedUser = await this.#userRepo.findByID(this.DataSourceRecord.created_by!)
                    if(!retrievedUser.isError) user = retrievedUser.value

                    const received = await this.ReceiveData(resp.data, user, pollTransaction.value)
                    if(received.isError) {
                        Logger.error(`unable to process data received from http data source ${received.error?.error}`)
                    }
                }
            } catch (err) {
                Logger.error(`data source ${this.DataSourceRecord.id} poll failed ${err}`)
            }

            // sleep for poll interval
            (config.poll_interval) ?  await this.delay((config.poll_interval! * 1000)) : await this.delay(1000)

            // call the transaction complete after the delay interval so that there is no way another import
            // function could possibly run an import while still in its cool-down
            await ImportMapper.Instance.completeTransaction(pollTransaction.value)
        }

        return Promise.resolve()
    }

    // we'll need to encrypt the config prior to saving
    async ToSave(): Promise<DataSourceRecord> {
        const key = new NodeRSA(Config.encryption_key_secret);

        const output = plainToClass(DataSourceRecord, {}) // we do this to avoid having to use the constructor or pollute current record
        Object.assign(output, this.DataSourceRecord);

        if((output.config as HttpDataSourceConfig).auth_method === "basic") {
            (output.config as HttpDataSourceConfig).username = key.encryptPrivate((output.config as HttpDataSourceConfig).username!, 'base64');
            (output.config as HttpDataSourceConfig).password = key.encryptPrivate((output.config as HttpDataSourceConfig).password!, 'base64')
        }

        if((output.config as HttpDataSourceConfig).auth_method === "token") {
            (output.config as HttpDataSourceConfig).token = key.encryptPrivate((output.config as HttpDataSourceConfig).token!, 'base64');
        }

        return Promise.resolve(output)
    }
}
