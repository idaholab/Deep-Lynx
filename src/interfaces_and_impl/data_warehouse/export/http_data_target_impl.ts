import DataTargetRecord, {HttpDataTargetConfig} from '../../../domain_objects/data_warehouse/export/data_target';
import Result from '../../../common_classes/result';
import Logger from '../../../services/logger';
import Config from '../../../services/config';
import DataTargetMapper from '../../../data_access_layer/mappers/data_warehouse/export/data_target_mapper';
import NodeRSA from 'node-rsa';
import axios, {AxiosResponse} from 'axios';
import {SuperUser, User} from '../../../domain_objects/access_management/user';
import UserRepository from '../../../data_access_layer/repositories/access_management/user_repository';
import {plainToClass} from 'class-transformer';
import {DataTarget} from './data_target';
import GraphQLRunner from '../../../graphql/schema';
import {graphql} from 'graphql';
import Cache from '../../../services/cache/cache';

const humanInterval = require('human-interval');
const buildUrl = require('build-url');

/*
 HttpImpl is a data target which polls and HTTP target for data every x seconds
 this implementation allows the user to query both basic authentication and
 bearer token secured endpoints for JSON data.
*/
export default class HttpDataTargetImpl implements DataTarget {
    DataTargetRecord?: DataTargetRecord | undefined;

    #mapper = DataTargetMapper.Instance;
    #userRepo = new UserRepository();
    decrypted = false;

    constructor(record: DataTargetRecord) {
        if (record) {
            this.DataTargetRecord = record;
        }
        this.decryptDataTargetRecord();
    }

    private decryptDataTargetRecord() {
        // if this is coming from the database it will have an id, this indicates
        // we need to decrypt certain parts of the config before working
        if (this.DataTargetRecord && this.DataTargetRecord.id && !this.decrypted) {
            const key = new NodeRSA(Config.encryption_key_secret);

            try {
                if ((this.DataTargetRecord.config as HttpDataTargetConfig).auth_method === 'basic') {
                    (this.DataTargetRecord.config as HttpDataTargetConfig).username = key.decryptPublic(
                        (this.DataTargetRecord.config as HttpDataTargetConfig).username!,
                        'utf8',
                    );
                    (this.DataTargetRecord.config as HttpDataTargetConfig).password = key.decryptPublic(
                        (this.DataTargetRecord.config as HttpDataTargetConfig).password!,
                        'utf8',
                    );
                }

                if ((this.DataTargetRecord.config as HttpDataTargetConfig).auth_method === 'token') {
                    (this.DataTargetRecord.config as HttpDataTargetConfig).token = key.decryptPublic(
                        (this.DataTargetRecord.config as HttpDataTargetConfig).token!,
                        'utf8',
                    );
                }

                this.decrypted = true;
            } catch (err) {
                Logger.error(`error while attempting to decrypt http data target config ${err}`);
                return;
            }
        }
    }

    // Poll for data. Data is stored in the exports table
    // processing the data is not the responsibility of this portion of the application
    async Run(): Promise<void> {
        if (!this.DataTargetRecord) {
            Logger.error(`unable to start http data target process, no record present`);
            return;
        }

        // let's give the config an easier way of being referenced
        const config = this.DataTargetRecord.config as HttpDataTargetConfig;

        // check cache if resource is being used and lock if it's not
        const key = `dataTargetLock${this.DataTargetRecord.id}`;

        const cachedValue = await Cache.get(key);
        if (cachedValue !== undefined) {
            return Promise.resolve();
        }

        // create cache variable to lock resource
        const item = {value: null};

        try {
            await Cache.set(key, item, 30);
        } catch (error) {
            Logger.error('unable to cache dataTarget for resource locking', error);
        }

        let set = await this.#mapper.SetStatus(this.DataTargetRecord.id!, 'system', 'polling');
        if (set.isError) {
            Logger.error(`unable to update data target status:${set.error?.error}`);
        }

        // because the user could have either set the target to inactive or modified
        // the configuration since this last ran, update the current data target record
        // with the most recent version
        const retrievedTarget: Result<DataTargetRecord> = await this.#mapper.Retrieve(this.DataTargetRecord.id!);
        if (retrievedTarget.isError) {
            Logger.error(`unable to retrieve latest data target record for processing ${retrievedTarget.error?.error}`);
            return Promise.resolve(); // break completely if we don't have a target
        }

        this.DataTargetRecord = retrievedTarget.value;
        // since we pulled this from the database, we need to decrypt prior to poll
        this.decrypted = false;
        this.decryptDataTargetRecord();

        // cut if we're no longer set to active
        if (!this.DataTargetRecord.active) {
            set = await this.#mapper.SetStatus(this.DataTargetRecord.id!, 'system', 'ready');
            if (set.isError) {
                Logger.error(`unable to update data target status:${set.error?.error}`);
            }
            try {
                await Cache.del(key);
            } catch (error) {
                Logger.error('cached data target could not be deleted', error);
            }
            return Promise.resolve();
        }

        if (this.DataTargetRecord.last_run_at !== null) {
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            const nextRunTime = new Date(this.DataTargetRecord.last_run_at?.getTime() + humanInterval(config.poll_interval));
            // if we haven't reached the next poll time, then return
            if (nextRunTime.getTime() >= new Date().getTime()) {
                return Promise.resolve();
            }
        }

        // query graph for data
        const generator = new GraphQLRunner();
        let data: any;

        try {
            Logger.debug(`data target ${this.DataTargetRecord.id} http polling for data`);
            const schemaResult = await generator.ForContainer(this.DataTargetRecord.container_id!, {});

            if (schemaResult.isError) {
                Logger.error(`Error while generating schema for data target id ${this.DataTargetRecord?.id}`);
                return;
            }

            data = await graphql({
                schema: schemaResult.value,
                source: config.graphql_query!,
            });
        } catch (error) {
            Logger.error(`Schema generation failed for data target ${this.DataTargetRecord?.id}`, error);
        }

        // create http request
        const endpoint = buildUrl(config.endpoint);

        // configure and send http request
        let resp: AxiosResponse<any>;
        const httpConfig: {[key: string]: any} = {};

        switch (config.auth_method) {
            case 'basic': {
                httpConfig.auth = {
                    username: config.username!,
                    password: config.password!,
                };
            }

            case 'token': {
                if (config.token) {
                    httpConfig.headers.Authorization = `Bearer ${config.token}`;
                }
            }
        }

        try {
            resp = await axios.post(endpoint, data, httpConfig);
            if (resp.status > 299 || resp.status < 200) {
                Logger.debug(`data target ${this.DataTargetRecord.id} post failed`);
            } else {
                let reference = '';
                if ('Reference' in resp.headers) {
                    reference = resp.headers.Reference;
                }

                // set to super user if we don't know who's running the target
                let user = SuperUser;
                const retrievedUser = await this.#userRepo.findByID(this.DataTargetRecord.created_by!);
                if (!retrievedUser.isError) {
                    user = retrievedUser.value;
                }
            }
        } catch (err) {
            Logger.error(`data target ${this.DataTargetRecord.id} post failed ${err}`);
        }

        const setLastRunAt = await this.#mapper.SetLastRunAt(this.DataTargetRecord.id!);
        if (setLastRunAt.isError) {
            Logger.error(`unable to update data target last_run_at${setLastRunAt.error?.error}`);
        }

        set = await this.#mapper.SetStatus(this.DataTargetRecord.id!, 'system', 'ready');
        if (set.isError) {
            Logger.error(`unable to update data target status:${set.error?.error}`);
        }

        // delete the cached value used for locking, if this fails the cache auto-deletes after 30sec

        try {
            await Cache.del(key);
        } catch (error) {
            Logger.error('cached data target could not be deleted', error);
        }

        return Promise.resolve();
    }

    // we'll need to encrypt the config prior to saving
    async ToSave(): Promise<DataTargetRecord> {
        const key = new NodeRSA(Config.encryption_key_secret);

        const output = plainToClass(DataTargetRecord, {}); // we do this to avoid having to use the constructor or pollute current record
        Object.assign(output, this.DataTargetRecord);

        if ((output.config as HttpDataTargetConfig).auth_method === 'basic') {
            (output.config as HttpDataTargetConfig).username = key.encryptPrivate((output.config as HttpDataTargetConfig).username!, 'base64');
            (output.config as HttpDataTargetConfig).password = key.encryptPrivate((output.config as HttpDataTargetConfig).password!, 'base64');
        }

        if ((output.config as HttpDataTargetConfig).auth_method === 'token') {
            (output.config as HttpDataTargetConfig).token = key.encryptPrivate((output.config as HttpDataTargetConfig).token!, 'base64');
        }

        return Promise.resolve(output);
    }
}
