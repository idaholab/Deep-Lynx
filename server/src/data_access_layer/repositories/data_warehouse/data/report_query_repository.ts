import RepositoryInterface, {QueryOptions, Repository} from '../../repository';
import ReportQuery, { TS2InitialRequest } from '../../../../domain_objects/data_warehouse/data/report_query';
import Result from '../../../../common_classes/result';
import ReportQueryMapper from '../../../mappers/data_warehouse/data/report_query_mapper';
import {PoolClient} from 'pg';
import FileMapper from '../../../mappers/data_warehouse/data/file_mapper';
import File, { AzureMetadata } from '../../../../domain_objects/data_warehouse/data/file';
import { User } from '../../../../domain_objects/access_management/user';
import Report from '../../../../domain_objects/data_warehouse/data/report';
import ReportMapper from '../../../mappers/data_warehouse/data/report_mapper';
import FileRepository from './file_repository';
import { newTempToken } from '../../../../services/utilities';
import ReportRepository from './report_repository';
import Config from '../../../../services/config';
import BlobStorageProvider from '../../../../services/blob_storage/blob_storage';
import AzureBlobImpl from '../../../../services/blob_storage/azure_blob_impl';
import { processQuery, StorageType, TimeseriesQuery } from 'deeplynx';

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

    async checkTimeseries(file_ids: string[]): Promise<Result<boolean>> {
        const isTimeseries = await this.#fileRepo.checkTimeseries(file_ids);
        if (isTimeseries.isError) {
            return Result.Pass(isTimeseries);
        } else if (isTimeseries.value === false) {
            return Result.Failure(`one or more files is not timeseries compatible`);
        } else {
            return Result.Success(true);
        }
    }

    async initiateQuery(containerID: string, request: TS2InitialRequest, user: User, toJSON?: boolean): Promise<Result<string>> {
        const userID = user.id!;

        // check that all files are timeseries and return an error if not
        const isTimeseries = await this.#fileRepo.checkTimeseries(request.file_ids!);
        if (isTimeseries.isError) {return Promise.resolve(Result.Pass(isTimeseries))}

        // create a new report object
        const report = new Report({container_id: containerID});
        const reportSaved = await this.#reportMapper.Create(user.id!, report);
        if (reportSaved.isError) {return Promise.resolve(Result.Pass(reportSaved))}
        Object.assign(report, reportSaved.value);
        const reportID = report.id!

        // create a report query based on the TS2 rust module query request
        const reportQuery = new ReportQuery({query: request.query!, report_id: reportID});
        const querySaved = await this.#mapper.Create(user.id!, reportQuery);
        if (querySaved.isError) { return Promise.resolve(Result.Pass(querySaved))}
        Object.assign(reportQuery, querySaved.value);
        const queryID = reportQuery.id!

        // generate a temporary token for the TS2 rust module to return file metadata to DeepLynx
        const tokenCreated = await newTempToken(containerID, userID);
        if (tokenCreated.isError) {return Promise.resolve(Result.Failure(`unable to generate access token ${tokenCreated.error?.error}`))}
        const token = tokenCreated.value;

        // generate file metadata
        const fileInfo = await this.#fileRepo.listPathMetadata(...request.file_ids!);
        if (fileInfo.isError) {return Promise.resolve(Result.Failure('unable to find file information'))}
        const files = fileInfo.value;

        // if not a describe, ensure the query contains the table names (aka file names)
        if (request.query && !request.query.startsWith('DESCRIBE')) {
            const errorFiles: string[] = [];
            files.forEach((file) => {
                // find the file name with no extension- this will be the table name
                const lastDotIndex = file.file_name?.lastIndexOf('.');
                const fileNameNoExt = (lastDotIndex === -1) ? file.file_name! : file.file_name?.substring(0, lastDotIndex)!;
                // confirm that query contains the file name, if not return in error msg
                if (!request.query!.includes(fileNameNoExt)) {errorFiles.push(fileNameNoExt)}
            });
            if (errorFiles.length > 0) {
                return Promise.resolve(Result.Failure(`query must include the table name(s): "${errorFiles.join('", "')}"`));
            }
        }

        // if any files are azure_blob, this requires some extra metadata
        let azureMetadata: AzureMetadata | undefined;
        if (files.some(f => f.adapter === 'azure_blob')) {
            const getSAS = await (BlobStorageProvider('azure_blob') as AzureBlobImpl).generateSASToken();
            if (getSAS.isError) {
                return Promise.resolve(Result.Failure(`unable to generate SAS token ${getSAS.error?.error}`));
            }

            azureMetadata = {
                account_name: Config.azure_blob_connection_string.split(';').find(e => e.startsWith('AccountName='))?.split('=')[1]!,
                blob_endpoint: Config.azure_blob_connection_string.split(';').find(e => e.startsWith('BlobEndpoint='))?.split('=')[1]!,
                container_name: Config.azure_blob_container_name,
                sas_token: getSAS.value
            }
        }

        // set response url depending on describe query or not
        const responseUrl = (request.query && request.query.startsWith('DESCRIBE'))
            ? `${Config.root_address}/containers/${containerID}/files/timeseries/describe`
            : `${Config.root_address}/containers/${containerID}/reports/${reportID}/query/${queryID}`;

        // build baseBlobUrl for azure storage or filesystem
        const baseBlobUrl = Config.file_storage_method === 'azure_blob'
            ? `${azureMetadata?.blob_endpoint}/${azureMetadata?.container_name}/`
            : Config.filesystem_storage_directory;

        const queryResult = await processQuery({
            report_id: reportID,
            query: request.query,
            dl_token: token,
            storage_type: Config.file_storage_method === 'azure_blob' ? StorageType.azure : StorageType.filesystem,
            sas_metadata: azureMetadata,
            files,
            results_destination: `${baseBlobUrl}/containers/${containerID}/datasources/${files[0].data_source_id}`,
            deeplynx_destination: responseUrl
        });
        console.log(queryResult);

        // set report and query statuses to "processing"
        const statusMsg = `executing query ${queryID}: "${reportQuery.query}" as part of report ${reportID}`;
        let statusSet = await this.#reportRepo.setStatus(reportID, 'processing', statusMsg);
        if (statusSet.isError) {return Promise.resolve(Result.Failure(`unable to set report status`))}
        statusSet = await this.setStatus(queryID, 'processing', statusMsg);
        if (statusSet.isError) {return Promise.resolve(Result.Failure(`unable to set query status`))}

        // return report ID to the user so they can poll for results
        return Promise.resolve(Result.Success(reportID));
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
