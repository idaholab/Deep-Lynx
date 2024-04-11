import NodeRSA from "node-rsa";
import DataSourceRecord, { CustomDataSourceConfig } from "../../../domain_objects/data_warehouse/import/data_source";
import { DataSource } from "./data_source";
import StandardDataSourceImpl from "./standard_data_source_impl";
import Config from "../../../services/config";
import Logger from "../../../services/logger";
import { plainToClass } from "class-transformer";

const buildUrl = require('build-url');

export default class CustomDataSourceImpl extends StandardDataSourceImpl implements DataSource {
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

            const template = (this.DataSourceRecord.config as CustomDataSourceConfig).template!;

            try {
                if (template?.custom_fields) {
                    for (const field of template.custom_fields!) {
                        if (field.encrypt === true && field.value !== undefined) {
                            field.value = key.decryptPublic(field.value!, 'utf8');
                        }
                    }
                }
            } catch (err) {
                Logger.error(`error while attempting to decrypt custom ${template.name} data source config ${err}`);
                return;
            }
        }
    };

    async ToSave(): Promise<DataSourceRecord> {
        const key = new NodeRSA(Config.encryption_key_secret);

        // we do this to avoid having to use the constructor or pollute the current record
        const output = plainToClass(DataSourceRecord, {...this.DataSourceRecord});

        if ((output.config as CustomDataSourceConfig)?.template) {
            const template = (output.config as CustomDataSourceConfig).template;

            if (template?.custom_fields) {
                for (const field of template.custom_fields!) {
                    if (field.encrypt === true && field.value !== undefined) {
                        field.value = key.encryptPrivate(field.value, 'base64');
                    }
                }
            }
        }

        return Promise.resolve(output);
    }

    ToExport(): Promise<DataSourceRecord> {
        const output = plainToClass(DataSourceRecord, {...this.DataSourceRecord});

        if ((output.config as CustomDataSourceConfig)?.template) {
            const template = (output.config as CustomDataSourceConfig).template;
            
            if (template?.custom_fields) {
                for (const field of template.custom_fields!) {
                    if (field.encrypt === true && field.value !== undefined) {
                        field.value = undefined;
                    }
                }
            }
        }

        return Promise.resolve(output);
    }
}