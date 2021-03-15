import {DataSource} from "./data_source";
import Result from "../../result";
import {
    httpConfigT,
    HttpConfigT,
} from "../../types/import/httpConfigT";

import {objectToShapeHash, onDecodeError} from "../../utilities";
import Logger from "../../services/logger"
import Config from "../../services/config";
import {DataSourceT} from "../../types/import/dataSourceT";
import DataSourceStorage from "../../data_access_layer/mappers/data_warehouse/import/data_source_storage";
import ImportStorage from "../../data_access_layer/mappers/data_warehouse/import/import_storage";

import {pipe} from "fp-ts/lib/pipeable";
import {fold} from "fp-ts/lib/Either";
import NodeRSA from "node-rsa";
import axios, {AxiosResponse} from "axios"
import DataStagingStorage from "../../data_access_layer/mappers/data_warehouse/import/data_staging_storage";
import {TypeMappingT} from "../../types/import/typeMappingT";
import TypeMappingStorage from "../../data_access_layer/mappers/data_warehouse/etl/type_mapping_storage";

// HttpImpl is a data source which polls and HTTP source for data every x seconds
// this implementation allows the user to query both basic authentication and
// bearer token secured endpoints for JSON data.
export class HttpImpl implements DataSource {
    public dataSourceT: DataSourceT = {} as DataSourceT; // encrypted record
    private config: HttpConfigT = {} as HttpConfigT; // unencrypted record

    // update the HTTP configuration type in storage.
    SetConfiguration(userID:string, config:any): Promise<Result<boolean>> {
        const importAdapterStorage = DataSourceStorage.Instance;

        return new Promise(resolve => {
            const onSuccess = (res: (r:any) => void): (c: HttpConfigT) => void => {
                return async (co: HttpConfigT) => {
                    // encrypt the configuration prior to storage
                    const key = new NodeRSA(Config.encryption_key_secret);

                    if(co.auth_method === "basic") {
                        co.username = key.encryptPrivate(co.username!, "base64");
                        co.password = key.encryptPrivate(co.password!, "base64")
                    }

                    if(co.auth_method === "token") {
                        co.token = key.encryptPrivate(co.token!, "base64");
                    }

                    const updated = await importAdapterStorage.Update(this.dataSourceT.id!, userID, {
                        config: co
                    });

                    resolve(updated)
                }
            };


            pipe(httpConfigT.decode(config), fold(onDecodeError(resolve), onSuccess(resolve)))
        })
    }

    // because the class depends on unencrypted credentials to function you must
    // declare the class with a valid http config file in place
    constructor(config: HttpConfigT ) {
       this.config = config
    }

    public static async New(containerID: string, userID: string, name:string, config: any | HttpConfigT, active: boolean): Promise<Result<HttpImpl>> {
        if(!httpConfigT.is(config)) return new Promise(resolve => resolve(Result.Failure('unable to validate configuration')));

        const dataSourceStorage = DataSourceStorage.Instance;
        const instance = new HttpImpl(config);

        // encrypt credentials prior to storage
        const key = new NodeRSA(Config.encryption_key_secret);

        if(config.auth_method === "basic") {
            config.username = key.encryptPrivate(config.username!, "base64");
            config.password = key.encryptPrivate(config.password!, "base64")
        }

        if(config.auth_method === "token") {
            config.token = key.encryptPrivate(config.token!, "base64");
        }

        const dataSourceRecord = await dataSourceStorage.Create(containerID, userID, {
            config,
            adapter_type:"http",
            name,
            active
       });

        return new Promise(resolve => {
           if(dataSourceRecord.isError) resolve(Result.Pass(dataSourceRecord));

           // wipe the values so that outside code doesn't have access to even
           // the unencrypted data.
           config.username = "";
           config.password = "";
           config.token = "";

           dataSourceRecord.value.config = config;
           instance.dataSourceT = dataSourceRecord.value; // persist encrypted record to the instance

           resolve(Result.Success(instance))
        })

    }

    // Creates a new HttpImpl from only the import adapter id. Will also decrypt
    // the user credentials as other functionality of the class depends on it.
    public static async NewFromDataSourceID(importAdapterID: string): Promise<Result<HttpImpl>> {
        const dataSourceStorage = DataSourceStorage.Instance;

        const imp = await dataSourceStorage.Retrieve(importAdapterID);
        if(imp.isError) return new Promise(resolve => resolve(Result.Pass(imp)));

        // decrypt the configuration
        const key = new NodeRSA(Config.encryption_key_secret);

        const config = imp.value.config as HttpConfigT;

        if(config.auth_method === "basic") {
            config.username = key.decryptPublic(config.username!, 'utf8');
            config.password = key.decryptPublic(config.password!, "utf8")
        }

        if(config.auth_method === "token") {
            config.token = key.decryptPublic(config.token!, 'utf8');
        }

        const instance = new HttpImpl(config);

        // blank encrypted data back out before setting
        config.username = "";
        config.password= "";
        config.token = "";
        imp.value.config = config;

        instance.dataSourceT = imp.value;

        return new Promise(resolve => resolve(Result.Success(instance)))
    }

    public static async NewFromDataSourceRecord(dataSource: DataSourceT): Promise<Result<HttpImpl>> {
        // decrypt the configuration
        const key = new NodeRSA(Config.encryption_key_secret);

        const config = dataSource.config as HttpConfigT;

        if(config.auth_method === "basic") {
            try{
                config.username = key.decryptPublic(config.username!, 'utf8');
                config.password = key.decryptPublic(config.password!, "utf8")
            } catch (err) {
                Logger.error(`error when attempting to decrypt data source ${err}`)

                return new Promise(resolve => resolve(Result.Failure('unable to decrypt data source basic auth credentials')))
            }

        }

        if(config.auth_method === "token") {
            try {
                config.token = key.decryptPublic(config.token!, 'utf8');
            } catch (err) {
                Logger.error(`error when attempting to decrypt data source ${err}`)

                return new Promise(resolve => resolve(Result.Failure('unable to decrypt data source token credentials')))
            }
        }

        const instance = new HttpImpl(config);

        // blank encrypted data back out before setting
        config.username = "";
        config.password= "";
        config.token = "";
        dataSource.config = config;

        instance.dataSourceT = dataSource;

        return new Promise(resolve => resolve(Result.Success(instance)))
    }

    // Use the HTTP data source and poll for data. Data is stored in the imports table
    // processing the data is not the responsibility of this portion of the application
    public async Poll(): Promise<void> {
        while(true) {
            // check if source is active
            const active = await DataSourceStorage.Instance.IsActive(this.dataSourceT.id!)

            if(active.isError || !active.value) break;


            // we start a transaction so that we can lock the previous and new import
            // rows while we attempt to poll new data
            const pollTransaction = await DataSourceStorage.Instance.startTransaction()
            if(pollTransaction.isError) {
                Logger.error(`unable to initiate db transaction ${pollTransaction.error}`);

                (this.config.poll_interval) ?  await this.delay((this.config.poll_interval! * 1000)) : await this.delay(1000)
                continue
            }

            // fetch last import, include time as url param - we lock the record on
            // retrieval because if we can successfully lock it it means that it's
            // not currently being processed or another export polling function is
            // acting on it
            const lastImport = await ImportStorage.Instance.RetrieveLastAndLock(this.dataSourceT.id!, pollTransaction.value);
            if(lastImport.isError) {
                Logger.error(`unable to retrieve and lock last import ${lastImport.error}`);
                (this.config.poll_interval) ?  await this.delay((this.config.poll_interval! * 1000)) : await this.delay(1000)
                await ImportStorage.Instance.completeTransaction(pollTransaction.value)

                continue
            }

            let lastImportTime = "";
            if(!lastImport.isError && lastImport.value.status === "completed") {
                lastImportTime = (lastImport.value.modified_at as Date).toUTCString()
            }

            if(lastImport.value && lastImport.value.status !== "completed") {
                (this.config.poll_interval) ?  await this.delay((this.config.poll_interval! * 1000)) : await this.delay(1000)
                await ImportStorage.Instance.completeTransaction(pollTransaction.value)

                continue;
            }

            // create http request
            Logger.debug(`data source ${this.dataSourceT.id} http polling for data`);
            const endpoint = `${this.config.endpoint}?lastImport=${lastImportTime}`;

            // configure and send http request
            let resp: AxiosResponse<any>;
            const config: {[key:string]:any} = {};

            if(lastImport.value && lastImport.value.reference) config.headers.Reference = lastImport.value.reference

            switch(this.config.auth_method) {
                case "basic": {
                    config.auth = {
                        username: this.config.username!,
                        password: this.config.password!
                    }
                }

                case "token": {
                    if(this.config.token) config.headers.Authorization = `Bearer ${this.config.token}`;
                }
            }

            try {
                resp = await axios.get(endpoint, config);
                if(resp.status > 299 || resp.status < 200 || !resp.data) {
                    Logger.debug(`data source ${this.dataSourceT.id} poll failed or had no data`)
                } else {
                    let reference = ""
                    if("Reference" in resp.headers) reference = resp.headers.Reference

                    if(!Array.isArray(resp.data)) {
                        Logger.error(`response from http importer must be an array of JSON objects`)
                        await ImportStorage.Instance.completeTransaction(pollTransaction.value)

                        continue
                    }

                    // create json import record
                    const importRecord = await ImportStorage.Instance.InitiateImport(this.dataSourceT.id!, "polling system", reference)
                    if(importRecord.isError) {
                        Logger.error(`error creating import ${importRecord.error}`)
                        await ImportStorage.Instance.completeTransaction(pollTransaction.value)

                        continue
                    }

                    const lockNewImport = await ImportStorage.Instance.RetrieveAndLock(importRecord.value, pollTransaction.value, true)
                    if(lockNewImport.isError) {
                        Logger.error(`unable to retrieve and lock new import ${lockNewImport.error}`)
                        await ImportStorage.Instance.completeTransaction(pollTransaction.value)

                        continue
                    }


                    for(const data of resp.data) {
                        const shapeHash = objectToShapeHash(data)

                        let mapping: TypeMappingT

                        const retrieved = await TypeMappingStorage.Instance.RetrieveByShapeHash(this.dataSourceT.id!, shapeHash)
                        if(retrieved.isError) {
                            const newMapping = await TypeMappingStorage.Instance.Create(this.dataSourceT.container_id!, this.dataSourceT.id!, shapeHash, data)

                            if(newMapping.isError) {
                                Logger.error(`unable to create new type mapping for imported data ${newMapping.error}`)
                                continue
                            }

                            mapping = newMapping.value
                        } else {
                            mapping = retrieved.value
                        }

                        const inserted = await DataStagingStorage.Instance.Create(this.dataSourceT.id!, importRecord.value, mapping.id, data)
                        if(inserted.isError) {
                            Logger.error(`error inserting data for import ${inserted}`)
                        }
                    }
                }
            } catch (err) {
                Logger.error(`data source ${this.dataSourceT} poll failed ${err}`)
            }

            // sleep for poll interval
            (this.config.poll_interval) ?  await this.delay((this.config.poll_interval! * 1000)) : await this.delay(1000)

            // call the transaction complete after the delay interval so that there is no way another export
            // function could possibly run an import while still in its cool-down
            await ImportStorage.Instance.completeTransaction(pollTransaction.value)
        }

        return Promise.resolve()
    }

    private delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }
}
