import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import ReportQuery, { ReportQueryMetadata, TimeseriesInitialRequest } from '../../../../domain_objects/data_warehouse/data/report_query';
import Result from '../../../../common_classes/result';
import ReportQueryMapper from '../../../mappers/data_warehouse/data/report_query_mapper';
import {PoolClient} from 'pg';
import FileMapper from '../../../mappers/data_warehouse/data/file_mapper';
import File, { FileDescription } from '../../../../domain_objects/data_warehouse/data/file';
import { User } from '../../../../domain_objects/access_management/user';
import Report from '../../../../domain_objects/data_warehouse/data/report';
import ReportMapper from '../../../mappers/data_warehouse/data/report_mapper';
import FileRepository from './file_repository';
import ReportRepository from './report_repository';
import Config from '../../../../services/config';
import { processQuery, processUpload, FileMetadata } from 'deeplynx';
import Logger from '../../../../services/logger';

/*
    ReportQueryRepository contains methods for persisting and retrieving report
    queries to storage as well as managing things like validation. Users should
    interact with repositories when possible and not the mappers, as the repositories
    contain additional logic such as validation or transformation prior to storage
    or returning.
*/
export default class ReportQueryRepository extends Repository implements RepositoryInterface<ReportQuery> {
    #mapper: ReportQueryMapper = ReportQueryMapper.Instance;
    #fileMapper: FileMapper = FileMapper.Instance;
    #reportMapper: ReportMapper = ReportMapper.Instance;
    #fileRepo: FileRepository = new FileRepository();
    #reportRepo: ReportRepository = new ReportRepository();

    constructor() {
        super(ReportQueryMapper.tableName);
    }

    async findByID(id: string, transaction?: PoolClient): Promise<Result<ReportQuery>> {
        const reportQ = await this.#mapper.Retrieve(id, transaction);

        return Promise.resolve(reportQ);
    }

    setStatus(
        queryID: string,
        status: 'ready' | 'processing' | 'error' | 'completed',
        message?: string,
        transaction?: PoolClient,
    ): Promise<Result<boolean>> {
        return this.#mapper.SetStatus(queryID, status, message, transaction);
    }

    async save(rq: ReportQuery, user: User): Promise<Result<boolean>> {
        const errors = await rq.validationErrors();
        if (errors) {return Promise.resolve(Result.Failure(`query does not pass validation ${errors.join(',')}`));}

        if (rq.id) {
            // to allow partial updates we must first fetch the original object
            const original = await this.findByID(rq.id);
            if (original.isError) {return Promise.resolve(Result.Failure(`unable to fetch original for update ${original.error}`));}

            Object.assign(original.value, rq);

            const updated = await this.#mapper.Update(original.value);
            if (updated.isError) {return Promise.resolve(Result.Pass(updated));}

            Object.assign(rq, updated.value);
        } else {
            const created = await this.#mapper.Create(user.id!, rq);
            if (created.isError) {return Promise.resolve(Result.Pass(created));}

            Object.assign(rq, created.value);
        }

        return Promise.resolve(Result.Success(true));
    }

    // perform all necessary checks before kicking off the query including verifying
    // all files are timeseries and checking for previously executed/select * queries
    async initiateQuery(containerID: string, dataSourceID: string, request: TimeseriesInitialRequest, user: User, describe: boolean): Promise<Result<string>> {
        // check that all files exist and are timeseries, return an error if not
        const isTimeseries = await this.#fileRepo.checkTimeseries(request.file_ids!);
        if (isTimeseries.isError) {return Promise.resolve(Result.Pass(isTimeseries))}

        // formulate query if describe, check for presence of table name if regular query
        if (describe) {
            const describeQueries: string[] = [];
            request.file_ids?.forEach((id => describeQueries.push(`DESCRIBE table_${id}`)));
            request.query = describeQueries.join(";");
        } else {
            const errorFiles: string[] = [];
            request.file_ids?.forEach((id => {
                if (!request.query!.includes(`table_${id}`)) {errorFiles.push(`table_${id}`)}
            }));
            if (errorFiles.length > 0) {
                return Promise.resolve(Result.Failure(`query must include the table name(s): "${errorFiles.join('", "')}"`));
            }
        }

        // create a new report object to return the ID if a SELECT * or repeated query is found
        const reportSaved = await this.#reportMapper.Create(user.id!, new Report({container_id: containerID}));
        if (reportSaved.isError) {return Promise.resolve(Result.Pass(reportSaved))}
        const reportID = reportSaved.value.id!

        // check if the query text was already successfully used in a previous query
        // if so return the result file from that original query
        const previousQueryResults = await this.#mapper.CheckQueryExists(request.query!);
        // if an error is found, simply log and move on
        if (previousQueryResults.isError) {
            Logger.error(previousQueryResults.error.error);
        }

        if (previousQueryResults.value) {
            // grab and use the previous status message for this report
            void this.#reportRepo.setStatus(reportID, 'completed', previousQueryResults.value.status_message);

            return Promise.resolve(Result.Success(reportID));
        }

        // create a query object if a previous query was not found
        const reportQuery = new ReportQuery({query: request.query!, report_id: reportID});
        const querySaved = await this.#mapper.Create(user.id!, reportQuery);
        if (querySaved.isError) { return Promise.resolve(Result.Pass(querySaved))}
        const queryID = querySaved.value.id!

        // check if the query is a SELECT * query; if so return original file instead of querying
        // verify there's only one file being queried
        if (request.file_ids!.length === 1) {
            const fileID = request.file_ids![0];
            // trim and case densensitize query to eliminate any syntax variance
            const normalizedQuery = request.query?.trim().replace(/\s+/g, ' ').replace(';', '').toLowerCase();
            if (normalizedQuery === `select * from table_${fileID}`) {
                // set the original file as the report file and return report ID
                const resultSet = await this.setResultFile(reportID, queryID, fileID);
                if (resultSet.isError) {
                    const errorMessage = `error attaching record to report ${reportID}: ${resultSet.error.error}`;
                    void this.#reportRepo.setStatus(reportID, 'error', errorMessage);
                    Logger.error(errorMessage);
                }

                // if everything was successful, set the report status to completed
                const successMessage = `results now available. Download them at "/containers/${containerID}/files/${fileID}/download"`;
                void this.#reportRepo.setStatus(reportID, 'completed', successMessage);
                return Promise.resolve(Result.Success(reportID));
            }
        }

        const queryMetadata: ReportQueryMetadata = {
            container_id: containerID,
            data_source_id: dataSourceID,
            request: request,
            user: user,
            report_id: reportID,
            query: reportQuery,
            query_id: queryID
        }

        // kickoff the query itself if there are no early return scenarios
        return this.kickoffQuery(queryMetadata, describe);
    }

    // create a connection string based on the type of storage being used
    async createConnectionString(containerID: string, dataSourceID: string): Promise<Result<string>> {
        const uploadPath = `containers/${containerID}/datasources/${dataSourceID}`;
        let storageConnection: string;
        if (Config.file_storage_method === 'filesystem') {
            // if a relative path is used, go two directories deeper to account for Rust's location within DL
            const rootFilePath = (Config.filesystem_storage_directory.startsWith('./')) ? `${Config.filesystem_storage_directory}` : Config.filesystem_storage_directory;
            storageConnection = `provider=filesystem;uploadPath=${uploadPath};rootFilePath=${rootFilePath};`;
        } else if (Config.file_storage_method === 'azure_blob') {
            const accountName = Config.azure_blob_connection_string.split(';').find(e => e.startsWith('AccountName='))?.split('AccountName=')[1];
            const accountKey = Config.azure_blob_connection_string.split(';').find(e => e.startsWith('AccountKey='))?.split('AccountKey=')[1];
            const containerName = Config.azure_blob_container_name;

            // set blobEndpoint
            let blobEndpoint: string = '';
            // check for presence of EndpointSuffix; if so we need to construct the BlobEndpoint
            if (Config.azure_blob_connection_string.includes('EndpointSuffix=')) {
                const protocol = Config.azure_blob_connection_string.split(';').find(e => e.startsWith('DefaultEndpointsProtocol='))?.split('DefaultEndpointsProtocol=')[1];
                const suffix = Config.azure_blob_connection_string.split(';').find(e => e.startsWith('EndpointSuffix='))?.split('EndpointSuffix=')[1];
                blobEndpoint = `${protocol}://${accountName}.blob.${suffix}`
            } // otherwise we need to remove accountName from the end of the BlobEndpoint
            else if (Config.azure_blob_connection_string.includes('BlobEndpoint=')) {
                blobEndpoint = Config.azure_blob_connection_string.split(';').find(e => e.startsWith('BlobEndpoint='))?.split('BlobEndpoint=')[1].split(`/${accountName}`)[0]!;
            } // return an error if BlobEndpoint is unable to be constructed
            else {
                return Promise.resolve(Result.Failure(`error: unable to construct BlobEndpoint`));
            }

            storageConnection = `provider=azure_blob;uploadPath=${uploadPath};blobEndpoint=${blobEndpoint};accountName=${accountName};accountKey='${accountKey}';containerName=${containerName};`;
        } else {
            return Promise.resolve(Result.Failure(`error: unsupported or unimplemented file storage method being used`));
        }

        return Promise.resolve(Result.Success(storageConnection));
    }

    async kickoffQuery(queryMetadata: ReportQueryMetadata, describe: boolean): Promise<Result<string>> {
        // fetch file metadata
        const fileInfo = await this.#fileRepo.listPathMetadata(...queryMetadata.request.file_ids!);
        if (fileInfo.isError) {return Promise.resolve(Result.Pass(fileInfo))}
        const files = fileInfo.value;

        const getConnString = await this.createConnectionString(queryMetadata.container_id, queryMetadata.data_source_id);
        if (getConnString.isError) {return Promise.resolve(Result.Pass(getConnString))}
        const storageConnection = getConnString.value;

        // set report status to "processing"
        let statusSet = await this.#reportRepo.setStatus(
            queryMetadata.report_id, 'processing',
            `executing query ${queryMetadata.query_id}: "${queryMetadata.query.query}" as part of report ${queryMetadata.report_id}`
        );
        if (statusSet.isError) {return Promise.resolve(Result.Failure(`unable to set report status`))}

        // kick off the describe or query process
        if (describe) {
            this.processDescribe(
                queryMetadata.report_id, 
                queryMetadata.request.query!, 
                storageConnection, 
                files as FileMetadata[]);
        } else {
            this.processQuery(
                queryMetadata.report_id,
                queryMetadata.request.query!,
                storageConnection,
                files as FileMetadata[],
                queryMetadata.query_id,
                queryMetadata.user
            );
        }

        // return report ID to the user so they can poll for results
        return Promise.resolve(Result.Success(queryMetadata.report_id));
    }

    async processQuery(
        reportID: string,
        query: string,
        storageConnection: string,
        files: FileMetadata[],
        queryID: string,
        user: User
    ): Promise<void> {
        try {
            const results = await processQuery(reportID, query, storageConnection, files);
            const parsedResults = JSON.parse(results);

            // extract containerID from file_path
            const containerID = parsedResults.file_path.split('containers/')[1].split('/')[0];

            if (parsedResults.adapter === 'filesystem') {
                parsedResults.file_path = `${Config.filesystem_storage_directory}${parsedResults.file_path}`;
            }

            // create a file record in the DB
            const file = new File({
                container_id: containerID,
                file_name: parsedResults.file_name.split(parsedResults.uuid)[1],
                file_size: parsedResults.file_size,
                adapter: parsedResults.adapter,
                adapter_file_path: parsedResults.file_path,
                short_uuid: parsedResults.uuid,
                timeseries: true
            });

            const fileCreated = await this.#fileMapper.Create(user.id!, file);

            // if there's an error with file record creation, set report status to "error"
            if (fileCreated.isError) {
                const errorMessage = `error creating file record for report ${reportID}: ${fileCreated.error.error}`;
                void this.#reportRepo.setStatus(reportID, 'error', errorMessage);
                Logger.error(errorMessage);
            }

            // set the file record as the resultFile for the given query
            const resultSet = await this.setResultFile(reportID, queryID, fileCreated.value.id!);
            if (resultSet.isError) {
                const errorMessage = `error attaching record to report ${reportID}: ${resultSet.error.error}`;
                void this.#reportRepo.setStatus(reportID, 'error', errorMessage);
                Logger.error(errorMessage);
            }

            // if everything was successful, set the report status to completed
            const successMessage = `results now available. Download them at "/containers/${containerID}/files/${fileCreated.value.id}/download"`;
            void this.#reportRepo.setStatus(reportID, 'completed', successMessage);
        } catch (e) {
            // set report status to "error"
            const errorMessage = `error processing query for report ${reportID}: ${(e as Error).message}`;
            void this.#reportRepo.setStatus(reportID, 'error', errorMessage);
            Logger.error(errorMessage);
        }
    }

    async processDescribe(reportID: string, query: string, storageConnection: string, files: FileMetadata[]): Promise<void> {
        try {
            const results = await processUpload(reportID, query, storageConnection, files);

            // since we have a nested json we need to do some initial parsing before loading data into the DB
            const descriptionsList = JSON.parse(results)['descriptions'];
            descriptionsList.map((o: {[key: string]: any}) => o.description = JSON.parse(o['description']) as FileDescription);
            const described = await this.#fileRepo.setDescriptions(descriptionsList as FileDescription[]);

            // if there is an error describing, set report status to "error"
            if (described.isError) {
                const errorMessage = `error describing files for report ${reportID}: ${described.error.error}`;
                void this.#reportRepo.setStatus(reportID, 'error', errorMessage);
                Logger.error(errorMessage);
            }

            // if everything was successful, set the report status to completed
            const successMessage = `successfully uploaded description(s) for files ${files.map(f => f.id).join()}`;
            void this.#reportRepo.setStatus(reportID, 'completed', successMessage);
        } catch (e) {
            // set report status to "error"
            const errorMessage = `error describing files for report ${reportID}: ${(e as Error).message}`;
            void this.#reportRepo.setStatus(reportID, 'error', errorMessage);
            Logger.error(errorMessage);
        }
    }

    async setResultFile(reportID: string, queryID: string, fileID: string): Promise<Result<boolean>> {
        const set = await this.#mapper.SetResultFile(queryID, fileID);
        if (set.isError) {return Promise.resolve(Result.Failure(`unable to attach result file to report query ${queryID}`))}

        const statusMsg = `query ${queryID} is complete. The results were uploaded as file ID ${fileID}`;
        let statusUpdated = await this.#reportRepo.setStatus(reportID, 'completed', statusMsg);
        if (statusUpdated.isError) {return Promise.resolve(Result.Failure(`unable to update status for report query ${queryID}`))}
        statusUpdated = await this.setStatus(queryID, 'completed', statusMsg);
        if (statusUpdated.isError) {return Promise.resolve(Result.Failure(`unable to update status for report query ${queryID}`))}

        return set;
    }

    addFile(query: ReportQuery, fileID: string): Promise<Result<boolean>> {
        if (!query.id) {
            return Promise.resolve(Result.Failure('report query must have id'));
        }

        return this.#mapper.AddFile(query.id, fileID);
    }

    bulkAddFiles(query: ReportQuery, fileIDs: string[]): Promise<Result<boolean>> {
        if (!query.id) {
            return Promise.resolve(Result.Failure('report query must have id'));
        }

        return this.#mapper.BulkAddFiles(query.id, fileIDs);
    }

    removeFile(query: ReportQuery, fileID: string): Promise<Result<boolean>> {
        if (!query.id) {
            return Promise.resolve(Result.Failure('report query must have id'));
        }

        return this.#mapper.RemoveFile(query.id, fileID);
    }

    listFiles(query: ReportQuery): Promise<Result<File[]>> {
        if (!query.id) {
            return Promise.resolve(Result.Failure('report query must have id'));
        }

        return this.#fileMapper.ListForReportQuery(query.id)
    }

    delete(rq: ReportQuery): Promise<Result<boolean>> {
        if (rq.id) {
            return this.#mapper.Delete(rq.id);
        }

        return Promise.resolve(Result.Failure(`file must have id`));
    }

    id(operator: string, value: any) {
        super.query('id', operator, value);
        return this;
    }

    reportID(operator: string, value: any) {
        super.query('report_id', operator, value);
        return this;
    }

    status(operator: string, value: any) {
        super.query('status', operator, value);
        return this;
    }

    statusMessage(operator: string, value: any) {
        super.query('status_message', operator, value);
        return this;
    }

    async count(transaction?: PoolClient, queryOptions?: QueryOptions): Promise<Result<number>> {
        const results = await super.count(transaction, queryOptions);

        if (results.isError) {return Promise.resolve(Result.Pass(results));}
        return Promise.resolve(Result.Success(results.value));
    }

    async list(queryOptions?: QueryOptions, transaction?: PoolClient): Promise<Result<ReportQuery[]>> {
        const results = await super.findAll<ReportQuery>(queryOptions, {
            transaction,
            resultClass: ReportQuery
        });

        if (results.isError) { return Promise.resolve(Result.Pass(results)); }

        return Promise.resolve(Result.Success(results.value));
    }
}
