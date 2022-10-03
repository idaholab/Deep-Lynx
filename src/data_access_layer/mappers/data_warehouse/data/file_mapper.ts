import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import File, {DataStagingFile} from '../../../../domain_objects/data_warehouse/data/file';

const format = require('pg-format');

/*
    FileMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class FileMapper extends Mapper {
    public resultClass = File;
    public static tableName = 'files';

    private static instance: FileMapper;

    public static get Instance(): FileMapper {
        if (!FileMapper.instance) {
            FileMapper.instance = new FileMapper();
        }

        return FileMapper.instance;
    }

    public async Create(userID: string, f: File, transaction?: PoolClient): Promise<Result<File>> {
        const r = await super.run(this.createStatement(userID, f), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, f: File[], transaction?: PoolClient): Promise<Result<File[]>> {
        const r = await super.run(this.createStatement(userID, ...f), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value));
    }

    public async BulkUpdate(userID: string, f: File[], transaction?: PoolClient): Promise<Result<File>> {
        const r = await super.run(this.fullUpdateStatement(userID, ...f), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Update(userID: string, f: File, transaction?: PoolClient): Promise<Result<File>> {
        const r = await super.run(this.fullUpdateStatement(userID, f), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Retrieve(id: string): Promise<Result<File>> {
        return super.retrieve<File>(this.retrieveStatement(id), {
            resultClass: this.resultClass,
        });
    }

    public async DomainRetrieve(id: string, containerID: string): Promise<Result<File>> {
        return super.retrieve<File>(this.domainRetrieveStatement(id, containerID), {resultClass: this.resultClass});
    }

    public async ListFromIDs(ids: string[]): Promise<Result<File[]>> {
        return super.rows<File>(this.listFromIDsStatement(ids), {
            resultClass: this.resultClass,
        });
    }

    public async ListForNode(nodeID: string): Promise<Result<File[]>> {
        return super.rows<File>(this.filesForNodeStatement(nodeID), {
            resultClass: this.resultClass,
        });
    }

    public async ListForEdge(edgeID: string): Promise<Result<File[]>> {
        return super.rows<File>(this.filesForEdgeStatement(edgeID), {
            resultClass: this.resultClass,
        });
    }

    public async ListForReport(reportID: string): Promise<Result<File[]>> {
        return super.rows<File>(this.filesForReportStatement(reportID), {
            resultClass: this.resultClass,
        });
    }

    public async ListForReportQuery(queryID: string): Promise<Result<File[]>> {
        return super.rows<File>(this.filesForReportQueryStatement(queryID), {
            resultClass: this.resultClass,
        });
    }

    public async ListForDataStaging(...stagingID: string[]): Promise<Result<File[]>> {
        return super.rows<File>(this.filesForDataStagingStatement(stagingID), {
            resultClass: this.resultClass,
        });
    }

    public async ListForDataStagingRaw(...stagingID: string[]): Promise<Result<DataStagingFile[]>> {
        return super.rows<DataStagingFile>(this.filesForDataStagingStatementRaw(stagingID), {
            resultClass: DataStagingFile,
        });
    }

    public async Delete(fileID: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(fileID));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...files: File[]): string {
        const text = `INSERT INTO files(
                  container_id,
                  file_name,
                  file_size,
                  adapter_file_path,
                  adapter,
                  metadata,
                  data_source_id,
                  md5hash,
                  short_uuid,
                  created_by,
                  modified_by) VALUES %L RETURNING *`;
        const values = files.map((file) => [
            file.container_id,
            file.file_name,
            file.file_size,
            file.adapter_file_path,
            file.adapter,
            JSON.stringify(file.metadata),
            file.data_source_id,
            file.md5hash,
            file.short_uuid,
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...files: File[]): string {
        const text = `UPDATE files as f set
                  container_id = u.container_id::bigint,
                  file_name = u.file_name,
                  file_size = u.file_size::float8,
                  adapter_file_path = u.adapter_file_path,
                  adapter = u.adapter,
                  metadata = u.metadata::jsonb,
                  data_source_id = u.data_source_id::bigint,
                  md5hash = u.md5hash,
                  short_uuid = u.short_uuid
                  modified_by = u.modified_by,
                  modified_at = NOW()
                  FROM(VALUES %L) AS u(
                  id,
                  container_id,
                  file_name,
                  file_size,
                  adapter_file_path,
                  adapter,
                  metadata,
                  data_source_id,
                  md5hash,
                  short_uuid,
                  modified_by)
                  WHERE u.id::bigint = f.id RETURNING f.*`;
        const values = files.map((file) => [
            file.id,
            file.container_id,
            file.file_name,
            file.file_size,
            file.adapter_file_path,
            file.adapter,
            JSON.stringify(file.metadata),
            file.data_source_id,
            file.md5hash,
            file.short_uuid,
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private deleteStatement(containerID: string): QueryConfig {
        return {
            text: `DELETE FROM files WHERE id = $1`,
            values: [containerID],
        };
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM files WHERE id = $1`,
            values: [id],
        };
    }

    private domainRetrieveStatement(id: string, containerID: string): QueryConfig {
        return {
            text: `SELECT * FROM files WHERE id = $1 AND container_id = $2`,
            values: [id, containerID],
        };
    }

    private listFromIDsStatement(ids: string[]): QueryConfig {
        // have to add the quotations in order for postgres to treat the uuid correctly
        ids.map((id) => `'${id}'`);

        return {
            text: `SELECT * FROM files WHERE id IN($1)`,
            values: ids,
        };
    }

    private filesForNodeStatement(nodeID: string): QueryConfig {
        return {
            text: `SELECT files.* FROM node_files LEFT JOIN files ON files.id = node_files.file_id WHERE node_id = $1`,
            values: [nodeID],
        };
    }

    private filesForEdgeStatement(edgeID: string): QueryConfig {
        return {
            text: `SELECT files.* FROM edge_files LEFT JOIN files ON files.id = edge_files.file_id WHERE edge_id = $1`,
            values: [edgeID],
        };
    }

    private filesForReportStatement(reportID: string): QueryConfig {
        return {
            text: `SELECT f.* FROM report_query_files rqf
                    LEFT JOIN files f ON f.id = rqf.file_id
                    WHERE rqf.report_id = $1`,
            values: [reportID],
        };
    }

    private filesForReportQueryStatement(queryID: string): QueryConfig {
        return {
            text: `SELECT f.* FROM report_query_files rqf
                    LEFT JOIN files f ON f.id = rqf.file_id
                    WHERE rqf.query_id = $1`,
            values: [queryID],
        };
    }

    private filesForDataStagingStatement(dataStagingID: string[]): QueryConfig {
        const text = `SELECT files.* 
                        FROM data_staging_files 
                        LEFT JOIN files ON files.id = data_staging_files.file_id 
                        WHERE data_staging_id IN (%L)`;
        const values = dataStagingID;

        return format(text, values);
    }

    private filesForDataStagingStatementRaw(dataStagingID: string[]): QueryConfig {
        const text = `SELECT * 
                        FROM data_staging_files 
                        WHERE data_staging_id IN (%L)`;
        const values = dataStagingID;

        return format(text, values);
    }
}
