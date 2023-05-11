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
    public _tableName: string;
    public _tableAlias: string;

    public _query: {
        SELECT: string[]; // select-list
        FROM: string; // base table(s) to pull from
        DISTINCT?: string[]; // distinct columns
        JOINS?: string[]; // table(s) to join to
        WHERE?: string[]; // query conditions
        GROUPBY?: string[]; // grouping for distinct/aggregates
        ORDERBY?: string[]; // sorting columns (add to options)
        OPTIONS?: string[]; // orderby, limit, offset, etc
        VALUES: any[]; // values to sub in for $# (for backwards compatibility)
    } = {SELECT: [], FROM: '', VALUES: []};

    public _aliasMap = new Map<string, string>();

    // objects to store select-field replacements
    private _selectRoot = 'SELECT';
    // private _selectToReplace: {[key: string]: any}[] = [];

    constructor(tableName: string, options?: ConstructorOptions) {
        this._tableName = tableName;
        this._tableAlias = '';

        if (this._tableName !== '') {
            if (this._aliasMap.has(this._tableName)) {
                this._tableAlias = this._aliasMap.get(this._tableName)!;
            } else {
                this._tableAlias = this._setAlias(this._tableName);
            }
        }

        this._query.SELECT = [format(`%s.*`, this._tableAlias)];
        this._query.FROM = format(`FROM %s %s`, this._tableName, this._tableAlias);

        if (options && options.distinct_on) {
            this._selectRoot = format(`SELECT DISTINCT ON (%s.%s)`, this._tableAlias, options.distinct_on);
        } else if (options && options.distinct) {
            this._selectRoot = 'SELECT DISTINCT';
        } else {
            this._selectRoot = 'SELECT';
        }
    }

    reset(tableName: string, options?: ConstructorOptions) {
        this._tableName = tableName;
        this._tableAlias = '';

        if (this._tableName !== '') {
            if (this._aliasMap.has(this._tableName)) {
                this._tableAlias = this._aliasMap.get(this._tableName)!;
            } else {
                this._tableAlias = this._setAlias(this._tableName);
            }
        }

        this._query.SELECT = [format(`%s.*`, this._tableAlias)];
        this._query.FROM = format(`FROM %s %s`, this._tableName, this._tableAlias);

        if (options && options.distinct_on) {
            this._selectRoot = format(`SELECT DISTINCT ON (%s.%s)`, this._tableAlias, options.distinct_on);
        } else if (options && options.distinct) {
            this._selectRoot = 'SELECT DISTINCT';
        } else {
            this._selectRoot = 'SELECT';
        }
    }

    // access function used to clear the select root for special repos that
    // will never be using distinct/distinct on, such as node_leaf
    // putting this in a function prevents accidental overwriting of select root
    _noSelectRoot() {
        this._selectRoot = '';
    }

    // Used to completely override the default select * statement. If you are looking
    // to add fields, instead use the addFields function.
    select(fields: string | string[] | {[field: string]: string}, tableName?: string) {
        // assign default table if none specified
        let table = '';
        if (tableName) {
            table = this._aliasMap.has(tableName) ? this._aliasMap.get(tableName)! : tableName;
        } else {
            table = this._tableAlias;
        }

        // clear out the old select statement
        this._query.SELECT = [];

        if (typeof fields === 'string') {
            const field = this._qualifyField(fields, table);
            this._query.SELECT.push(format(`%s`, field));
        } else if (Array.isArray(fields)) {
            fields.forEach((field) => {
                field = this._qualifyField(field, table);
                this._query.SELECT.push(format(`%s`, field));
            });
        } else {
            Object.entries(fields).forEach((entry) => {
                const field = this._qualifyField(entry[0], table);
                const alias = entry[1];

                this._query.SELECT.push(format(`%s AS %s`, field, alias));
            });
        }

        return this;
    }

    // Used to select which fields will be added to the query by the join, otherwise no fields will be
    // added. Param options are a singular field, a list of fields, or an object of fields and aliases.
    addFields(fields: string | string[] | {[field: string]: string}, tableName?: string) {
        // assign default table if none specified
        let table = '';
        if (tableName) {
            table = this._aliasMap.has(tableName) ? this._aliasMap.get(tableName)! : tableName;
        } else {
            table = this._tableAlias;
        }

        // add the field or fields to the existing select-list
        if (typeof fields === 'string') {
            const field = this._qualifyField(fields, table);
            this._query.SELECT.push(format(`%s`, field));
        } else if (Array.isArray(fields)) {
            fields.forEach((field) => {
                field = this._qualifyField(field, table);
                this._query.SELECT.push(format(`%s`, field));
            });
        } else {
            Object.entries(fields).forEach((entry) => {
                const field = this._qualifyField(entry[0], table);
                const alias = entry[1];

                this._query.SELECT.push(format(`%s AS %s`, field, alias));
            });
        }

        return this;
    }

    distinctOn(fields: string | string[], tableName?: string) {
        if (!this._query.DISTINCT) {
            this._query.DISTINCT = [];
        }

        let table = '';
        if (tableName) {
            table = this._aliasMap.has(tableName) ? this._aliasMap.get(tableName)! : tableName;
        } else {
            table = this._tableAlias;
        }

        if (typeof fields === 'string') {
            const field = this._qualifyField(fields, table);
            this._query.DISTINCT.push(format(`%s`, field));
        } else if (Array.isArray(fields)) {
            fields.forEach((field) => {
                field = this._qualifyField(field, table);
                this._query.DISTINCT?.push(format(`%s`, field));
            });
        }

        return this;
    }

    // Used to overwrite constructor settings with a new table name. This should be applied
    // before other functions to ensure that they maintain this table name and alias.
    from(tableName: string, tableAlias?: string) {
        this._tableName = tableName;

        // we don't want to override the select statement unless it's the default
        // so we need to check before we overwrite this._tableAlias
        let overrideSelect = false;

        if (this._query.SELECT.length === 1 && this._query.SELECT[0] === `${this._tableAlias}.*`) {
            overrideSelect = true;
        }

        // reassign table alias now that select has been safely checked
        if (tableAlias) {
            this._tableAlias = tableAlias;
            this._aliasMap.set(this._tableName, tableAlias);
        } else if (this._aliasMap.has(this._tableName)) {
            this._tableAlias = this._aliasMap.get(this._tableName)!;
        } else {
            this._tableAlias = this._setAlias(this._tableName);
        }

        // only override select if it has not already been altered
        if (overrideSelect === true) {
            this._query.SELECT = [format(`%s.*`, this._tableAlias)];
        }

        this._query.FROM = format(`FROM %s %s`, this._tableName, this._tableAlias);

        return this;
    }

    // join to another table
    join(destination: string, conditions: JoinConditions | JoinConditions[], options?: JoinOptions) {
        if (this._query.JOINS === undefined) {
            this._query.JOINS = [];
        }

        const join_type = options && options.join_type ? options.join_type : 'LEFT';
        const origin = options && options.origin ? options.origin : this._tableName;

        let destination_alias: string;
        if (options && options.destination_alias) {
            destination_alias = options.destination_alias;
            // set the destination alias for future joins
            this._aliasMap.set(destination, destination_alias);
        } else if (this._aliasMap.has(destination)) {
            destination_alias = this._aliasMap.get(destination)!;
        } else {
            destination_alias = this._setAlias(destination);
        }

        let originAlias: string;
        if (origin === this._tableName) {
            originAlias = this._tableAlias;
        } else {
            if (this._aliasMap.has(origin)) {
                originAlias = this._aliasMap.get(origin)!;
            } else {
                originAlias = origin;
            }
        }

        const onClause: string[] = ['ON'];

        if (Array.isArray(conditions)) {
            conditions.forEach((condition, index) => {
                const operator = condition?.operator ? condition.operator : '=';
                const values = [originAlias, condition?.origin_col, operator, destination_alias, condition?.destination_col];
                if (index === 0) {
                    // first value
                    // origin.column operator destination.column
                    onClause.push(format(`%s.%s %s %s.%s`, ...values));
                } else {
                    // every other join condition added with AND
                    // origin.column operator destination.column
                    onClause.push(format(`AND %s.%s %s %s.%s`, ...values));
                }
            });
        } else {
            const operator = conditions.operator ? conditions.operator : '=';
            const values = [originAlias, conditions.origin_col, operator, destination_alias, conditions.destination_col];
            // origin.column operator destination.column
            onClause.push(format(`%s.%s %s %s.%s`, ...values));
        }

        const values = [join_type, destination, destination_alias, onClause.join(' ')];

        const current_joins = this._query.JOINS.join(' ');
        const search = new RegExp(`.* JOIN .* ${destination_alias!} ON`, 'g');
        // only add join if table isn't already joined under alias
        if (!current_joins.match(search)) {
            this._query.JOINS?.push(format(`%s JOIN %s %s %s`, ...values));
        }

        return this;
    }

    // In the event of multiple nested conditions being needed in the WHERE clause, it is
    // possible that there will be a need for parentheses immediately after the where keyword.
    // In this case a query can be passed in, much like in the AND or OR clauses.
    where(repo?: Repository) {
        // check if there is already a where clause;
        // if there is wrap existing statements and add AND
        let whereStatement = 'WHERE';
        if (this._query.WHERE) {
            const existing = this._query.WHERE.slice(1).join(' ');
            // save the existing where clause to be inserted later
            whereStatement = format('WHERE (%s) AND', existing);
            // we can now clear the existing where clause
            this._query.WHERE = [];
        }

        // if nested repo supplied, wrap statement in parentheses
        if (repo?._query.WHERE) {
            let query = repo._query.WHERE.join(' ');
            // replacing any table aliases from new repo with the alias found in this repo
            query = query.replace(new RegExp(repo._tableAlias, 'g'), this._tableAlias);
            this._query.WHERE = [format(`%s ( %s )`, whereStatement, query)];
        } else {
            this._query.WHERE = [format(`%s`, whereStatement)];
        }
        return this;
    }

    // AND now has the capability for nested query conditions. If no condition is supplied,
    // functionality will continue as expected. If a query is passed into and(), behavior is
    // changed to return AND ( x ). If chaining with further conditions, another and() or or()
    // is necessary.
    and(repo?: Repository) {
        // check if there is a where clause yet;
        // if there is not, use WHERE instead of AND
        const conjunction = (this._query.WHERE?.length === 0) ? 'WHERE' : 'AND';

        if (repo?._query.WHERE) {
            let query = repo._query.WHERE.join(' ');
            // replacing any table aliases from new repo with the alias found in this repo
            query = query.replace(new RegExp(repo._tableAlias, 'g'), this._tableAlias);
            this._query.WHERE?.push(format(`%s ( %s )`, conjunction, query));
        } else {
            this._query.WHERE?.push(format('%s', conjunction));
        }
        return this;
    }

    // OR now has the capability for nested query conditions. If no condition is supplied,
    // functionality will continue as expected. If a query is passed into or(), behavior is
    // changed to return OR ( x ). If chaining with further conditions, another and() or or()
    // is necessary.
    or(repo?: Repository) {
        // check if there is a where clause yet;
        // if there is not, use WHERE instead of OR
        const conjunction = (this._query.WHERE?.length === 0) ? 'WHERE' : 'OR';

        if (repo?._query.WHERE) {
            let query = repo._query.WHERE.join(' ');
            // replacing any table aliases from new repo with the alias found in this repo
            query = query.replace(new RegExp(repo._tableAlias, 'g'), this._tableAlias);
            this._query.WHERE?.push(format(`%s ( %s )`, conjunction, query));
        } else {
            this._query.WHERE?.push(format('%s', conjunction));
        }
        return this;
    }

    // create a subquery. Note that when joining to a subquery, you must use the `destination_alias` join option.
    subquery(repo: Repository, options?: QueryOptions) {
        // ensure options are applied
        repo.options(options);

        // prepare subquery for return
        const query = [
            repo._selectRoot,
            repo._query.SELECT.join(', '),
            repo._query.FROM,
            repo._query.JOINS?.join(' '),
            repo._query.WHERE?.join(' '),
            repo._query.OPTIONS?.join(' '),
        ].join(' ');
        return format(`( %s )`, query);
    }

    queryJsonb(key: string, fieldName: string, operator: string, value: any, conditions?: QueryConditions) {
        if (!this._query.WHERE) {
            this._query.WHERE = [];
        }

        let table = '';
        if (conditions?.tableAlias) {
            table = conditions.tableAlias;
        } else if (conditions?.tableName) {
            table = this._aliasMap.has(conditions.tableName) ? this._aliasMap.get(conditions.tableName)! : conditions.tableName;
        } else {
            table = this._tableAlias;
        }

        fieldName = this._qualifyField(fieldName, table);

        this._query.WHERE?.push(format(`(%s`, fieldName));

        // the key can be a dot.notation nested set of keys
        const keys = key.split('.');
        const finalKey = keys.pop();

        for (const i in keys) {
            keys[i] = `'${keys[i]}'`;
        }

        if (keys.length > 0) {
            this._query.WHERE?.push(`-> ${keys.join('->')}`);
        }

        // this determines how we cast the value extracted from the jsonb payload - normally they come out as text so
        // default to it in all cases - string is obviously not a part of the switch statement below as it's the default
        let typeCast = 'text';
        let dataType;
        if (conditions?.dataType) {
            dataType = conditions.dataType;
        }

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
                this._query.WHERE?.push(format(`->> '%s')::${typeCast} = %L::${typeCast}`, finalKey, value));
                break;
            }
            case 'neq': {
                this._query.WHERE?.push(format(`->> '%s')::${typeCast} <> %L::${typeCast}`, finalKey, value));
                break;
            }
            case '==': {
                this._query.WHERE?.push(format(`->> '%s')::${typeCast} = %L::${typeCast}`, finalKey, value));
                break;
            }
            case '!=': {
                this._query.WHERE?.push(format(`->> '%s')::${typeCast} <> %L::${typeCast}`, finalKey, value));
                break;
            }
            case '<': {
                this._query.WHERE?.push(format(`->> '%s')::${typeCast} < %L::${typeCast}`, finalKey, value));
                break;
            }
            case '>': {
                this._query.WHERE?.push(format(`->> '%s')::${typeCast} > %L::${typeCast}`, finalKey, value));
                break;
            }
            case 'like': {
                this._query.WHERE?.push(format(`->> '%s') ILIKE %L`, finalKey, value));
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

                this._query.WHERE?.push(format(`->> '%s') IN (%s)`, finalKey, output.join(',')));

                break;
            }
        }

        return this;
    }

    query(fieldName: string, operator: string, value?: any, conditions?: QueryConditions) {
        if (!this._query.WHERE) {
            this._query.WHERE = [];
        }

        let table = '';
        if (conditions?.tableAlias) {
            table = conditions.tableAlias;
        } else if (conditions?.tableName) {
            table = this._aliasMap.has(conditions.tableName) ? this._aliasMap.get(conditions.tableName)! : conditions.tableName;
        } else {
            table = this._tableAlias;
        }

        fieldName = this._qualifyField(fieldName, table);

        let typeCast = 'text';
        let dataType;
        if (conditions?.dataType) {
            dataType = conditions.dataType;
        }

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
                this._query.WHERE?.push(format(`%s = %L`, fieldName, value));
                break;
            }
            case 'neq': {
                this._query.WHERE?.push(format(`%s <> %L`, fieldName, value));
                break;
            }
            case '==': {
                this._query.WHERE?.push(format(`%s = %L`, fieldName, value));
                break;
            }
            case '!=': {
                this._query.WHERE?.push(format(`%s <> %L`, fieldName, value));
                break;
            }
            case 'like': {
                this._query.WHERE?.push(format(`%s ILIKE %L`, fieldName, value));
                break;
            }
            case '<': {
                this._query.WHERE?.push(format(`%s::${typeCast} < %L::${typeCast}`, fieldName, value));
                break;
            }
            case '>': {
                this._query.WHERE?.push(format(`%s::${typeCast} > %L::${typeCast}`, fieldName, value));
                break;
            }
            case '%': {
                if (!value || value === '' || value.length === 0) break;
                if (Array.isArray(value)) {
                    this._query.WHERE?.push(format(`%s %% %L`, fieldName, value.join('|')));
                } else {
                    this._query.WHERE?.push(format(`%s %% %L`, fieldName, value));
                }
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

                this._query.WHERE?.push(format(`%s IN (%s)`, fieldName, output.join(',')));
                break;
            }
            case 'not in': {
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

                this._query.WHERE?.push(format(`%s NOT IN (%s)`, fieldName, output.join(',')));
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

                this._query.WHERE?.push(format(`%s BETWEEN %L::${typeCast} AND %L::${typeCast}`, fieldName, values[0], values[1]));
                break;
            }
            // is null/is not null completely ignores the value because for some reason the formatting library will
            // does not like us including null on queries
            case 'is null': {
                this._query.WHERE?.push(format(`%s IS NULL`, fieldName));
                break;
            }

            case 'is not null': {
                this._query.WHERE?.push(format(`%s IS NOT NULL`, fieldName));
                break;
            }
        }

        return this;
    }

    // function to enhance grouping capabilities beyond the simple mechanic of the queryOptions groupby
    groupBy(fields: string | string[], tableName?: string | null) {
        if (!this._query.GROUPBY) {
            this._query.GROUPBY = [];
        }

        let table = '';
        if (tableName === null) {
            table = ''; // supply null to avoid qualifying the table at all
        } else if (tableName) {
            table = this._aliasMap.has(tableName) ? this._aliasMap.get(tableName)! : tableName;
        } else {
            table = this._tableAlias;
        }

        if (typeof fields === 'string') {
            const field = this._qualifyField(fields, table);
            this._query.GROUPBY.push(format(`%s`, field));
        } else if (Array.isArray(fields)) {
            fields.forEach((field) => {
                field = this._qualifyField(field, table);
                this._query.GROUPBY?.push(format(`%s`, field));
            });
        }

        return this;
    }

    sortBy(fields: string | string[], tableName?: string | null, sortDesc?: boolean) {
        if (!this._query.ORDERBY) {
            this._query.ORDERBY = [];
        }

        let table = '';
        if (tableName === null) {
            table = ''; // supply null to avoid qualifying the table at all
        } else if (tableName) {
            table = this._aliasMap.has(tableName) ? this._aliasMap.get(tableName)! : tableName;
        } else {
            table = this._tableAlias;
        }

        const desc = sortDesc === true ? 'DESC' : 'ASC';

        if (typeof fields === 'string') {
            const field = this._qualifyField(fields, table);
            this._query.ORDERBY.push(format(`%s %s`, field, desc));
        } else if (Array.isArray(fields)) {
            fields.forEach((field) => {
                field = this._qualifyField(field, table);
                this._query.ORDERBY?.push(format(`%s %s`, field, desc));
            });
        }

        return this;
    }

    // popping this out of list function for accessibility by subquery function since it doesn't call `list()`
    // if "count" is specified as true, skip the 'distinct' option
    options(queryOptions?: QueryOptions, count?: boolean) {
        if (queryOptions || this._query.GROUPBY || this._query.ORDERBY) {
            this._query.OPTIONS = [];
        }

        if (queryOptions && queryOptions.groupBy) {
            if (!this._query.GROUPBY) {
                this._query.GROUPBY = [];
            }

            // qualify groupby with table name to avoid errors
            let table: string;
            // specifically do not use any table alias if null
            if (queryOptions.tableName === null) {
                table = '';
            } else if (queryOptions.tableName && this._aliasMap.has(queryOptions.tableName)) {
                table = this._aliasMap.get(queryOptions.tableName)!;
            } else if (queryOptions.tableName) {
                table = queryOptions.tableName;
            } else {
                table = this._tableAlias;
            }

            // if there is a list of groupBy columns, qualify each with table name
            const groupByParts = queryOptions.groupBy.split(',');
            groupByParts.forEach((part) => {
                this._query.GROUPBY?.push(this._qualifyField(part, table));
            });
        }

        // separate all groupby fields with a comma and push to main query
        if (this._query.GROUPBY) {
            this._query.OPTIONS?.push(format(`GROUP BY %s`, this._query.GROUPBY.join(', ')));
        }

        if (queryOptions && queryOptions.sortBy) {
            if (!this._query.ORDERBY) {
                this._query.ORDERBY = [];
            }

            // qualify order by with table name to avoid errors
            let table: string;
            // specifically do not use any table alias if null
            if (queryOptions.tableName === null) {
                table = '';
            } else if (queryOptions.tableName && this._aliasMap.has(queryOptions.tableName)) {
                table = this._aliasMap.get(queryOptions.tableName)!;
            } else if (queryOptions.tableName) {
                table = queryOptions.tableName;
            } else {
                table = this._tableAlias;
            }

            // if there is a list of order by columns, qualify each with table name
            const sortByParts = queryOptions.sortBy.split(',');
            sortByParts.forEach((part) => {
                const desc = queryOptions.sortDesc === true ? 'DESC' : 'ASC';
                this._query.ORDERBY?.push(format(`%s %s`, this._qualifyField(part, table), desc));
            });
        }

        if (this._query.ORDERBY) {
            this._query.OPTIONS?.push(format(`ORDER BY %s`, this._query.ORDERBY.join(', ')));
        }

        if (queryOptions && queryOptions.limit) {
            this._query.OPTIONS?.push(format(`LIMIT %L`, queryOptions.limit));
        }

        if (queryOptions && queryOptions.offset) {
            this._query.OPTIONS?.push(format(`OFFSET %L`, queryOptions.offset));
        }

        // allow a user to specify a column to select distinct on
        if (this._query.DISTINCT && this._query.DISTINCT.length > 0 && !count) {
            this._selectRoot = format(`SELECT DISTINCT ON (%s)`, this._query.DISTINCT.join(', '));
        } else if (queryOptions && queryOptions?.distinct && !count) {
            this._selectRoot = 'SELECT DISTINCT';
        }

        return this;
    }

    // we accept limited query options here
    count(transaction?: PoolClient, queryOptions?: QueryOptions): Promise<Result<number>> {
        const storage = new Mapper();

        // set query options and skip distinct
        this.options(queryOptions, true);

        // modify the original query to be SELECT COUNT(*)
        this._selectRoot = 'SELECT';
        this._query.SELECT = [`COUNT(*)`];

        const text = [
            this._selectRoot,
            this._query.SELECT.join(', '),
            this._query.FROM,
            this._query.JOINS?.join(' '),
            this._query.WHERE?.join(' '),
            this._query.OPTIONS?.join(' '),
        ].join(' ');

        const query = {text, values: this._query.VALUES};

        // reset the filter
        this._selectRoot = 'SELECT';
        this._query = {
            SELECT: [format(`%s.*`, this._tableAlias)],
            FROM: format(`FROM %s %s`, this._tableName, this._tableAlias),
            VALUES: [],
        };
        this._aliasMap.clear();

        return storage.count(query, transaction);
    }

    findAll<T>(queryOptions?: QueryOptions, options?: Options<T>): Promise<Result<T[]>> {
        const storage = new Mapper();

        // set query options (group by, order by, offset, limit, distinct)
        this.options(queryOptions);

        const text = [
            this._selectRoot,
            this._query.SELECT.join(', '),
            this._query.FROM,
            this._query.JOINS?.join(' '),
            this._query.WHERE?.join(' '),
            this._query.OPTIONS?.join(' '),
        ].join(' ');

        const query = {text, values: this._query.VALUES};

        // reset the filter
        this._selectRoot = 'SELECT';
        this._query = {
            SELECT: [format(`%s.*`, this._tableAlias)],
            FROM: format(`FROM %s %s`, this._tableName, this._tableAlias),
            VALUES: [],
        };
        this._aliasMap.clear();

        return storage.rows<T>(query, options);
    }

    findAllStreaming(queryOptions?: QueryOptions, options?: Options<any>): Promise<QueryStream> {
        const storage = new Mapper();

        // set query options (group by, order by, offset, limit, distinct)
        this.options(queryOptions);

        const text = [
            this._selectRoot,
            this._query.SELECT.join(', '),
            this._query.FROM,
            this._query.JOINS?.join(' '),
            this._query.WHERE?.join(' '),
            this._query.OPTIONS?.join(' '),
        ].join(' ');

        const query = {text, values: this._query.VALUES};

        // reset the filter
        this._selectRoot = 'SELECT';
        this._query = {
            SELECT: [format(`%s.*`, this._tableAlias)],
            FROM: format(`FROM %s %s`, this._tableName, this._tableAlias),
            VALUES: [],
        };
        this._aliasMap.clear();

        return storage.rowsStreaming(query, options);
    }

    async findAllToFile(fileOptions: FileOptions, queryOptions?: QueryOptions, options?: Options<any>): Promise<Result<File>> {
        const storage = new Mapper();

        // set query options (group by, order by, offset, limit, distinct)
        this.options(queryOptions);

        const text = [
            this._selectRoot,
            this._query.SELECT.join(', '),
            this._query.FROM,
            this._query.JOINS?.join(' '),
            this._query.WHERE?.join(' '),
            this._query.OPTIONS?.join(' '),
        ].join(' ');

        const query = {text, values: this._query.VALUES};

        // reset the filter
        this._selectRoot = 'SELECT';
        this._query = {
            SELECT: [format(`%s.*`, this._tableAlias)],
            FROM: format(`FROM %s %s`, this._tableName, this._tableAlias),
            VALUES: [],
        };
        this._aliasMap.clear();

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

    // used to return random table alias
    private _setAlias(table: string): string {
        const num = Math.floor(Math.random() * 1000);
        const alias = `x${num}_${table}`;
        this._aliasMap.set(table, alias);
        return alias;
    }

    // used to add table name to fields if not already specified
    private _qualifyField(field: string, table: string): string {
        let qualifiedField;

        if (field.includes('.') || table === '') {
            // if column is already qualified in dot notation,
            // qualifying it again will cause an error
            qualifiedField = field;
        } else if (field.includes('(')) {
            // if parentheses detected, assume this is an aggregate function
            // and qualify the column within parentheses
            const fieldParts = field.split('(');
            qualifiedField = fieldParts.join(`(${table}.`);
        } else {
            qualifiedField = format(`%s.%s`, table, field);
        }

        return qualifiedField;
    }
}

export type QueryOptions = {
    limit?: number | undefined;
    offset?: number | undefined;
    sortBy?: string | undefined;
    sortDesc?: boolean | undefined;
    // generally used if we have a complicated set of joins
    groupBy?: string | undefined;
    distinct?: boolean | undefined;
    // used to specify distinction
    distinct_on?: {table: string; column: string} | undefined;
    // used to qualify groupBy column
    tableName?: string | null | undefined;
    // load from a materialized view if one is present
    loadFromView?: boolean;
    print?: boolean;
};

export type JoinOptions = {
    destination_alias?: string | undefined;
    join_type?: 'INNER' | 'RIGHT' | 'LEFT' | 'FULL OUTER' | undefined;
    origin?: string | undefined;
};

export type JoinConditions = {
    origin_col: string | undefined;
    operator?: '=' | '<>' | undefined;
    destination_col: string | undefined;
};

export type QueryConditions = {
    dataType?: string | undefined;
    tableName?: string | undefined;
    tableAlias?: string | undefined;
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
    user?: User;
};

export type ConstructorOptions = {
    distinct?: boolean;
    distinct_on?: string | undefined; // for the constructor, only select distinct on native table columns
};
