/* eslint-disable @typescript-eslint/no-for-in-array */
import Result from '../../common_classes/result';
import Mapper, {Options} from '../mappers/mapper';
import {User} from '../../domain_objects/access_management/user';
import {PoolClient} from 'pg';
import QueryStream from 'pg-query-stream';
import {PassThrough, Readable, Transform} from 'stream';
import BlobStorageProvider from '../../services/blob_storage/blob_storage';
import File from '../../domain_objects/data_warehouse/data/file';
import FileMapper from '../mappers/data_warehouse/data/file_mapper';
import csvStringify from 'csv-stringify';
import Logger from '../../services/logger';
import fs from 'fs';

const JSONStream = require('JSONStream');
const format = require('pg-format');
const short = require('short-uuid');
const parquet = require('parquetjs');

/*
    RepositoryInterface allows us to create an expectation for how the various
    Repositories can and should be used. This interface is purposely thin so as to
    avoid pigeonholing future development
 */
export default interface RepositoryInterface<T> {
    findByID(id: string | number): Promise<Result<T>>;
    save(t: T, user?: User): Promise<Result<boolean>>;
    delete(t: T): Promise<Result<boolean>>;
}

/*
 Repository should be used as the base class so the parent can access the filter
 functions for listing and/or searching from the database. These functions are almost
 all meant to facilitate a query building pattern where the end user would chain
 methods together and then terminate with either a count() or list() call
*/
export class Repository {
    public readonly _tableName: string;
    // TODO: replace with pg_format library
    public _rawQuery: string[] = [];
    public _values: any[] = [];

    protected constructor(tableName: string, options?: ConstructorOptions) {
        this._tableName = tableName;

        if (options && options.distinct) {
            this._rawQuery.push(`SELECT DISTINCT * FROM ${this._tableName}`);
        } else {
            this._rawQuery.push(`SELECT * FROM ${this._tableName}`);
        }
    }

    where() {
        this._rawQuery.push('WHERE');
        return this;
    }

    and() {
        this._rawQuery.push('AND');
        return this;
    }

    or() {
        this._rawQuery.push('OR');
        return this;
    }

    queryJsonb(key: string, fieldName: string, operator: string, value: any, dataType?: string) {
        this._rawQuery.push(`(${fieldName}`);

        // the key can be a dot.notation nested set of keys
        const keys = key.split('.');
        const finalKey = keys.pop();

        for (const i in keys) {
            keys[i] = `'${keys[i]}'`;
        }

        if (keys.length > 0) {
            this._rawQuery.push(`-> ${keys.join('->')}`);
        }

        // this determines how we cast the value extracted from the jsonb payload - normally they come out as text so
        // default to it in all cases - string is obviously not a part of the switch statement below as it's the default
        let typeCast = 'text';

        switch (dataType) {
            case undefined: {
                typeCast = 'text';
                break;
            }

            case 'number': {
                typeCast = 'integer';
                break;
            }

            case 'number64': {
                typeCast = 'bigint';
                break;
            }

            case 'float': {
                typeCast = 'numeric';
                break;
            }
            case 'float64': {
                typeCast = 'numeric';
                break;
            }

            case 'date': {
                typeCast = 'timestamp(0)';
                break;
            }
        }

        // note we only type cast the eq, neq, <. and > operators. in and like rely on the data being strings
        switch (operator) {
            case 'eq': {
                this._values.push(value);
                this._rawQuery.push(`->> '${finalKey}')::${typeCast} = $${this._values.length}::${typeCast}`);
                break;
            }
            case 'neq': {
                this._values.push(value);
                this._rawQuery.push(`->> '${finalKey}')::${typeCast} <> $${this._values.length}::${typeCast}`);
                break;
            }
            case '<': {
                this._values.push(value);
                this._rawQuery.push(`->> '${finalKey}')::${typeCast} < $${this._values.length}::${typeCast}`);
                break;
            }
            case '>': {
                this._values.push(value);
                this._rawQuery.push(`->> '${finalKey}')::${typeCast} > $${this._values.length}::${typeCast}`);
                break;
            }
            case 'like': {
                this._values.push(value);
                this._rawQuery.push(`->> '${finalKey}') ILIKE $${this._values.length}`);
                break;
            }
            case 'in': {
                let values: any[] = [];
                if (!Array.isArray(value)) {
                    values = `${value}`.split(','); // support comma separated lists
                } else {
                    values = value;
                }

                const output: string[] = [];

                values.forEach((v) => {
                    output.push(`'${v}'`);
                });

                this._rawQuery.push(`->> '${finalKey}') IN (${output.join(',')})`);
                break;
            }
        }

        return this;
    }

    query(fieldName: string, operator: string, value?: any, dataType?: string) {
        let typeCast = 'text';

        switch (dataType) {
            case undefined: {
                typeCast = 'text';
                break;
            }

            case 'number': {
                typeCast = 'integer';
                break;
            }

            case 'number64': {
                typeCast = 'bigint';
                break;
            }

            case 'float': {
                typeCast = 'numeric';
                break;
            }
            case 'float64': {
                typeCast = 'numeric';
                break;
            }

            case 'date': {
                typeCast = 'timestamp(0)';
                break;
            }
        }

        switch (operator) {
            case 'eq': {
                this._values.push(value);
                this._rawQuery.push(`${fieldName} = $${this._values.length}`);
                break;
            }
            case 'neq': {
                this._values.push(value);
                this._rawQuery.push(`${fieldName} <> $${this._values.length}`);
                break;
            }
            case 'like': {
                this._values.push(value);
                this._rawQuery.push(`${fieldName} ILIKE $${this._values.length}`);
                break;
            }
            case '<': {
                this._values.push(value);
                this._rawQuery.push(`${fieldName}::${typeCast} < $${this._values.length}::${typeCast}`);
                break;
            }
            case '>': {
                this._values.push(value);
                this._rawQuery.push(`${fieldName}::${typeCast} > $${this._values.length}::${typeCast}`);
                break;
            }
            case 'in': {
                let values: any[] = [];
                if (!Array.isArray(value)) {
                    values = `${value}`.split(','); // support comma separated lists
                } else {
                    values = value;
                }

                const output: string[] = [];

                values.forEach((v) => {
                    output.push(`'${v}'`);
                });

                this._rawQuery.push(`${fieldName} IN (${output.join(',')})`);
                break;
            }
            case 'between': {
                let values: any[] = [];
                if (!Array.isArray(value)) {
                    values = `${value}`.split(','); // support comma separated lists
                } else {
                    values = value;
                }

                if (values.length !== 2) {
                    return this;
                }

                this._rawQuery.push(format(`%s BETWEEN %L::${typeCast} AND %L::${typeCast}`, fieldName, values[0], values[1]));
                break;
            }
            // is null/is not null completely ignores the value because for some reason the formatting library will
            // does not like us including null on queries
            case 'is null': {
                this._rawQuery.push(`${fieldName} IS NULL`);
                break;
            }

            case 'is not null': {
                this._rawQuery.push(`${fieldName} IS NOT NULL`);
                break;
            }
        }

        return this;
    }

    findAll<T>(queryOptions?: QueryOptions, options?: Options<T>): Promise<Result<T[]>> {
        const storage = new Mapper();

        if (queryOptions && queryOptions.groupBy) {
            this._rawQuery.push(`GROUP BY ${queryOptions.groupBy}`);
        }

        if (queryOptions && queryOptions.sortBy) {
            if (queryOptions.sortDesc) {
                this._rawQuery.push(`ORDER BY "${queryOptions.sortBy}" DESC`);
            } else {
                this._rawQuery.push(`ORDER BY "${queryOptions.sortBy}" ASC`);
            }
        }

        if (queryOptions && queryOptions.offset) {
            this._values.push(queryOptions.offset);
            this._rawQuery.push(`OFFSET $${this._values.length}`);
        }

        if (queryOptions && queryOptions.limit) {
            this._values.push(queryOptions.limit);
            this._rawQuery.push(`LIMIT $${this._values.length}`);
        }

        const query = {
            text: this._rawQuery.join(' '),
            values: this._values,
        };

        // reset the filter
        this._rawQuery = [`SELECT * FROM ${this._tableName}`];
        this._values = [];

        return storage.rows<T>(query, options);
    }

    findAllStreaming(queryOptions?: QueryOptions, options?: Options<any>): Promise<QueryStream> {
        const storage = new Mapper();

        if (queryOptions && queryOptions.groupBy) {
            this._rawQuery.push(`GROUP BY ${queryOptions.groupBy}`);
        }

        if (queryOptions && queryOptions.sortBy) {
            if (queryOptions.sortDesc) {
                this._rawQuery.push(`ORDER BY "${queryOptions.sortBy}" DESC`);
            } else {
                this._rawQuery.push(`ORDER BY "${queryOptions.sortBy}" ASC`);
            }
        }

        if (queryOptions && queryOptions.offset) {
            this._values.push(queryOptions.offset);
            this._rawQuery.push(`OFFSET $${this._values.length}`);
        }

        if (queryOptions && queryOptions.limit) {
            this._values.push(queryOptions.limit);
            this._rawQuery.push(`LIMIT $${this._values.length}`);
        }

        const query = {
            text: this._rawQuery.join(' '),
            values: this._values,
        };

        // reset the filter
        this._rawQuery = [`SELECT * FROM ${this._tableName}`];
        this._values = [];

        return storage.rowsStreaming(query, options);
    }

    async findAllToFile(fileOptions: FileOptions, queryOptions?: QueryOptions, options?: Options<any>): Promise<Result<File>> {
        const storage = new Mapper();

        if (queryOptions && queryOptions.groupBy) {
            this._rawQuery.push(`GROUP BY ${queryOptions.groupBy}`);
        }

        if (queryOptions && queryOptions.sortBy) {
            if (queryOptions.sortDesc) {
                this._rawQuery.push(`ORDER BY "${queryOptions.sortBy}" DESC`);
            } else {
                this._rawQuery.push(`ORDER BY "${queryOptions.sortBy}" ASC`);
            }
        }

        if (queryOptions && queryOptions.offset) {
            this._values.push(queryOptions.offset);
            this._rawQuery.push(`OFFSET $${this._values.length}`);
        }

        if (queryOptions && queryOptions.limit) {
            this._values.push(queryOptions.limit);
            this._rawQuery.push(`LIMIT $${this._values.length}`);
        }

        const query = {
            text: this._rawQuery.join(' '),
            values: this._values,
        };

        // reset the filter
        this._rawQuery = [`SELECT * FROM ${this._tableName}`];
        this._values = [];

        try {
            // blob storage will pick the proper provider based on environment variable, no need to specify here unless
            // fileOptions contains a provider
            const fileMapper = new FileMapper();
            let contentType = '';
            const blob = BlobStorageProvider(fileOptions.blob_provider);
            let stream: Readable = await storage.rowsStreaming(query, options);

            if (fileOptions.transformStreams && fileOptions.transformStreams.length > 0) {
                for (const pipe of fileOptions.transformStreams) {
                    stream = stream.pipe(pipe);
                }
            }

            // pass through stream needed in order to pipe the results through transformative streams prior to piping
            // them to the blob storage
            const pass = new PassThrough({objectMode: fileOptions.file_type === ('parquet' as 'json' | 'csv' | 'parquet' | string)});
            const fileName = fileOptions.file_name ? fileOptions.file_name : `${short.generate()}-${new Date().toDateString()}`;

            switch (fileOptions.file_type) {
                case 'json': {
                    stream.pipe(JSONStream.stringify()).pipe(pass);
                    contentType = 'application/json';
                    break;
                }

                case 'csv': {
                    stream.pipe(csvStringify({header: true})).pipe(pass);
                    contentType = 'text/csv';
                    break;
                }

                case 'parquet': {
                    if (!fileOptions.parquet_schema) return Promise.resolve(Result.Failure('unable to output to parquet, no schema provided'));

                    const schema = new parquet.ParquetSchema(fileOptions.parquet_schema);
                    const writer = await parquet.ParquetWriter.openFile(schema, fileName + '.parquet');

                    pass.on('data', (chunk: object) => {
                        writer.appendRow({...chunk}).catch((e: any) => Logger.error(`unable to write parquet row ${e}`));
                    });

                    pass.on('end', () => {
                        writer.close();
                    });

                    stream.pipe(pass);
                    break;
                }

                default: {
                    return Promise.resolve(Result.Failure('no file type specified, aborting'));
                }
            }

            if (blob) {
                const result = await blob?.uploadPipe(
                    `containers/${fileOptions.containerID}/queryResults`,
                    fileName,
                    fileOptions.file_type === ('parquet' as 'json' | 'csv' | 'parquet' | string) ? fs.createReadStream(fileName + '.parquet') : pass,
                    contentType,
                    'utf8',
                );

                // must delete the interim file
                if (fileOptions.file_type === 'parquet') {
                    fs.unlinkSync(fileName + '.parquet');
                }

                const file = new File({
                    file_name: fileName,
                    file_size: result.value.size,
                    md5hash: result.value.md5hash,
                    adapter_file_path: result.value.filepath,
                    adapter: blob.name(),
                    metadata: result.value.metadata,
                    container_id: fileOptions.containerID,
                });

                return fileMapper.Create(fileOptions.userID ? fileOptions.userID : 'system', file);
            } else {
                return Promise.resolve(Result.Failure('unable to initialize blob storage client'));
            }
        } catch (e: any) {
            return Promise.resolve(Result.Error(e));
        }
    }

    // we accept limited query options here
    count(transaction?: PoolClient, queryOptions?: QueryOptions): Promise<Result<number>> {
        const storage = new Mapper();

        // modify the original query to be count
        this._rawQuery[0] = `SELECT COUNT(*) FROM ${this._tableName}`;

        if (queryOptions && queryOptions.offset) {
            this._values.push(queryOptions.offset);
            this._rawQuery.push(`OFFSET $${this._values.length}`);
        }

        if (queryOptions && queryOptions.limit) {
            this._values.push(queryOptions.limit);
            this._rawQuery.push(`LIMIT $${this._values.length}`);
        }

        const query = {
            text: this._rawQuery.join(' '),
            values: this._values,
        };

        // reset the filter
        this._rawQuery = [`SELECT * FROM ${this._tableName}`];
        this._values = [];

        return storage.count(query, transaction);
    }
}

export type QueryOptions = {
    limit?: number | undefined;
    offset?: number | undefined;
    sortBy?: string | undefined;
    sortDesc?: boolean | undefined;
    // generally used if we have a complicated set of joins
    groupBy?: string | undefined;
};

export type FileOptions = {
    containerID: string;
    file_type: 'json' | 'csv' | 'parquet' | string;
    blob_provider?: 'azure_blob' | 'filesystem' | 'largeobject';
    file_name?: string;
    userID?: string;
    parquet_schema?: {[key: string]: any};
    transformStreams?: Transform[]; // streams to pipe to, prior to piping to the file, allows manipulation of the object
};

export type DeleteOptions = {
    force?: boolean;
    removeData?: boolean;
};

export type ConstructorOptions = {
    distinct?: boolean;
};
