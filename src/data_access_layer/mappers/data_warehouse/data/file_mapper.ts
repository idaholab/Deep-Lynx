import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import {QueueProcessor} from '../../../../domain_objects/event_system/processor';
import Event from '../../../../domain_objects/event_system/event';
import File from '../../../../domain_objects/data_warehouse/data/file';
import uuid from 'uuid';

const format = require('pg-format');
const resultClass = File;

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
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        QueueProcessor.Instance.emit(
            new Event({
                sourceID: f.data_source_id!,
                sourceType: 'data_source',
                type: 'file_created',
                data: r.value[0].id,
            }),
        );

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, f: File[], transaction?: PoolClient): Promise<Result<File[]>> {
        const r = await super.run(this.createStatement(userID, ...f), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        r.value.forEach((file) => {
            QueueProcessor.Instance.emit(
                new Event({
                    sourceID: file.data_source_id!,
                    sourceType: 'data_source',
                    type: 'file_created',
                    data: file.id,
                }),
            );
        });

        return Promise.resolve(Result.Success(r.value));
    }

    public async BulkUpdate(userID: string, f: File[], transaction?: PoolClient): Promise<Result<File>> {
        const r = await super.run(this.fullUpdateStatement(userID, ...f), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        r.value.forEach((file) => {
            QueueProcessor.Instance.emit(
                new Event({
                    sourceID: file.data_source_id!,
                    sourceType: 'data_source',
                    type: 'file_modified',
                    data: file.id,
                }),
            );
        });

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Update(userID: string, f: File, transaction?: PoolClient): Promise<Result<File>> {
        const r = await super.run(this.fullUpdateStatement(userID, f), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        QueueProcessor.Instance.emit(
            new Event({
                sourceID: f.data_source_id!,
                sourceType: 'data_source',
                type: 'file_modified',
                data: f.id,
            }),
        );

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Retrieve(id: string): Promise<Result<File>> {
        return super.retrieve<File>(this.retrieveStatement(id), {
            resultClass,
        });
    }

    public async DomainRetrieve(id: string, containerID: string): Promise<Result<File>> {
        return super.retrieve<File>(this.domainRetrieveStatement(id, containerID), {resultClass});
    }

    public async ListFromIDs(ids: string[]): Promise<Result<File[]>> {
        return super.rows<File>(this.listFromIDsStatement(ids), {
            resultClass,
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
                  id,
                  container_id,
                  file_name,
                  file_size,
                  adapter_file_path,
                  adapter,
                  metadata,
                  data_source_id,
                  md5hash,
                  created_by,
                  modified_by) VALUES %L RETURNING *`;
        const values = files.map((file) => [
            uuid.v4(),
            file.container_id,
            file.file_name,
            file.file_size,
            file.adapter_file_path,
            file.adapter,
            JSON.stringify(file.metadata),
            file.data_source_id,
            file.md5hash,
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...files: File[]): string {
        const text = `UPDATE files as f set
                  container_id = u.container_id::uuid,
                  file_name = u.file_name,
                  file_size = u.file_size::float8,
                  adapter_file_path = u.adapter_file_path,
                  adapter = u.adapter::file_upload_adapters,
                  metadata = u.metadata::jsonb,
                  data_source_id = u.data_source_id::uuid,
                  md5hash = u.md5hash,
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
                  modified_by)
                  WHERE u.id::uuid = f.id RETURNING f.*`;
        const values = files.map((file) => [
            uuid.v4(),
            file.container_id,
            file.file_name,
            file.file_size,
            file.adapter_file_path,
            file.adapter,
            JSON.stringify(file.metadata),
            file.data_source_id,
            file.md5hash,
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
}
