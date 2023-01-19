import StandardDataSourceImpl from "./standard_data_source_impl";
import DataSourceRecord, { P6DataSourceConfig } from "../../../domain_objects/data_warehouse/import/data_source";
import { DataSource } from "./data_source";
import NodeRSA from "node-rsa";
import Logger from '../../../services/logger';
import Config from '../../../services/config';
import { plainToClass } from "class-transformer";
import { KeyPair, User } from "../../../domain_objects/access_management/user";
import Result from '../../../common_classes/result';
import KeyPairMapper from "../../../data_access_layer/mappers/access_management/keypair_mapper";
import KeyPairRepository from "../../../data_access_layer/repositories/access_management/keypair_repository";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

const buildUrl = require('build-url');

export default class P6DataSourceImpl extends StandardDataSourceImpl implements DataSource {
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
                (this.DataSourceRecord.config as P6DataSourceConfig).password = key.decryptPublic(
                    (this.DataSourceRecord.config as P6DataSourceConfig).password!,
                    'utf8',
                );

                this.decrypted = true;
            } catch (err) {
                Logger.error(`error while attempting to decrypt http data source config ${err}`);
                return;
            }
        }
    }

    async ToSave(): Promise<DataSourceRecord> {
        const key = new NodeRSA(Config.encryption_key_secret);

        const output = plainToClass(DataSourceRecord, {}); // we do this to avoid having to use the constructor or pollute current record
        Object.assign(output, this.DataSourceRecord);

        (output.config as P6DataSourceConfig).password = key.encryptPrivate((output.config as P6DataSourceConfig).password!, 'base64');

        return Promise.resolve(output);
    }
}