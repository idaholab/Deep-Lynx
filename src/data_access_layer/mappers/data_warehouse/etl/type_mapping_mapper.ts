import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import TypeMapping from '../../../../domain_objects/data_warehouse/etl/type_mapping';

const format = require('pg-format');
const resultClass = TypeMapping;

/*
    TypeMappingMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class TypeMappingMapper extends Mapper {
    public static tableName = 'type_mappings';

    private static instance: TypeMappingMapper;

    public static get Instance(): TypeMappingMapper {
        if (!TypeMappingMapper.instance) {
            TypeMappingMapper.instance = new TypeMappingMapper();
        }

        return TypeMappingMapper.instance;
    }

    public async CreateOrUpdate(userID: string, t: TypeMapping, transaction?: PoolClient): Promise<Result<TypeMapping>> {
        const r = await super.run(this.createOrUpdateStatement(userID, t), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreateOrUpdate(userID: string, t: TypeMapping[], transaction?: PoolClient): Promise<Result<TypeMapping[]>> {
        return super.run(this.createOrUpdateStatement(userID, ...t), {
            transaction,
            resultClass,
        });
    }

    public async Update(userID: string, t: TypeMapping, transaction?: PoolClient): Promise<Result<TypeMapping>> {
        const r = await super.run(this.fullUpdateStatement(userID, t), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(userID: string, t: TypeMapping[], transaction?: PoolClient): Promise<Result<TypeMapping[]>> {
        return super.run(this.fullUpdateStatement(userID, ...t), {
            transaction,
            resultClass,
        });
    }

    public async Retrieve(id: string): Promise<Result<TypeMapping>> {
        return super.retrieve<TypeMapping>(this.retrieveStatement(id), {
            resultClass,
        });
    }

    // since the combination shape hash, data source, and container are a unique set
    // we can confidently request a single object
    public async RetrieveByShapeHash(dataSourceID: string, shapeHash: string): Promise<Result<TypeMapping>> {
        return super.retrieve<TypeMapping>(this.retrieveByShapeHashStatement(dataSourceID, shapeHash), {resultClass});
    }

    public List(containerID: string, dataSourceID: string, offset: number, limit: number, sortBy?: string, sortDesc?: boolean): Promise<Result<TypeMapping[]>> {
        if (limit === -1) {
            return super.rows<TypeMapping>(this.listAllStatement(containerID, dataSourceID), {resultClass});
        }

        return super.rows<TypeMapping>(this.listStatement(containerID, dataSourceID, offset, limit, sortBy, sortDesc), {resultClass});
    }

    public ListNoTransformations(
        containerID: string,
        dataSourceID: string,
        offset: number,
        limit: number,
        sortBy?: string,
        sortDesc?: boolean,
    ): Promise<Result<TypeMapping[]>> {
        if (limit === -1) {
            return super.rows<TypeMapping>(this.listAllNoTransformationsStatement(containerID, dataSourceID), {resultClass});
        }

        return super.rows<TypeMapping>(this.listNoTransformationsStatement(containerID, dataSourceID, offset, limit, sortBy, sortDesc), {
            resultClass,
        });
    }

    public ListByDataSource(dataSourceID: string, offset: number, limit: number): Promise<Result<TypeMapping[]>> {
        return super.rows<TypeMapping>(this.listByDataSourceStatement(dataSourceID, offset, limit), {resultClass});
    }

    public async SetActive(id: string): Promise<Result<boolean>> {
        return super.runAsTransaction(this.setActiveStatement(id));
    }

    public async SetInactiveForContainer(containerID: string): Promise<Result<boolean>> {
        return super.runAsTransaction(this.setInactiveForContainerStatement(containerID));
    }

    public async SetInActive(id: string): Promise<Result<boolean>> {
        return super.runAsTransaction(this.setInactiveStatement(id));
    }

    public async Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    public async Count(dataSourceID: string): Promise<Result<number>> {
        return super.count(this.countStatement(dataSourceID));
    }

    public async CountNoTransformation(dataSourceID: string): Promise<Result<number>> {
        return super.count(this.countNoTransformationStatement(dataSourceID));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.

    // this allows us to more quickly process incoming data. By not trying to fetch
    // a mapping first we can blindly insert based on shape_hash and data source and
    // be assured we're getting the right ID back without changes. We do set the modified_at
    // time however so that the system knows the last time the mapping was used
    private createOrUpdateStatement(userID: string, ...mappings: TypeMapping[]): string {
        const text = `INSERT INTO type_mappings(
            container_id,
            data_source_id,
            shape_hash,
            active,
            sample_payload,
            created_by,
            modified_by) VALUES %L
        ON CONFLICT (shape_hash, data_source_id, container_id)
        DO
        UPDATE SET
            modified_at = NOW()
        RETURNING *`;
        const values = mappings.map((imp) => [
            imp.container_id,
            imp.data_source_id,
            imp.shape_hash,
            imp.active,
            JSON.stringify(imp.sample_payload),
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...mappings: TypeMapping[]): string {
        const text = `UPDATE type_mappings as t SET
            container_id = u.container_id::bigint,
                               data_source_id = u.data_source_id::bigint,
                               shape_hash = u.shape_hash,
                               active = u.active::boolean,
                               sample_payload = u.sample_payload::jsonb,
                               modified_by = u.modified_by,
                               modified_at = NOW() FROM(VALUES %L) as u(
                          id,
                          container_id,
                          data_source_id,
                          shape_hash,
                          active,
                          sample_payload,
                          modified_by)
                           WHERE u.id::bigint = t.id RETURNING t.*`;
        const values = mappings.map((imp) => [
            imp.id,
            imp.container_id,
            imp.data_source_id,
            imp.shape_hash,
            imp.active,
            JSON.stringify(imp.sample_payload),
            userID,
        ]);

        return format(text, values);
    }

    private retrieveStatement(exportID: string): QueryConfig {
        return {
            text: `SELECT * FROM type_mappings WHERE id = $1`,
            values: [exportID],
        };
    }

    private retrieveByShapeHashStatement(dataSourceID: string, shapeHash: string): QueryConfig {
        return {
            text: `SELECT * FROM type_mappings WHERE data_source_id = $1 AND shape_hash = $2`,
            values: [dataSourceID, shapeHash],
        };
    }

    private deleteStatement(exportID: string): QueryConfig {
        return {
            text: `DELETE FROM type_mappings WHERE id = $1`,
            values: [exportID],
        };
    }

    private listStatement(containerID: string, dataSourceID: string, offset: number, limit: number, sortBy?: string, sortDesc?: boolean): QueryConfig {
        if (sortDesc && sortBy) {
            return {
                text: `SELECT * FROM type_mappings WHERE container_id = $1 AND data_source_id = $4 ORDER BY "${sortBy}" DESC OFFSET $2 LIMIT $3`,
                values: [containerID, offset, limit, dataSourceID],
            };
        } else if (sortBy) {
            return {
                text: `SELECT * FROM type_mappings WHERE container_id = $1 AND data_source_id = $4 ORDER BY "${sortBy}" ASC OFFSET $2 LIMIT $3`,
                values: [containerID, offset, limit, dataSourceID],
            };
        } else {
            return {
                text: `SELECT * FROM type_mappings WHERE container_id = $1 AND data_source_id = $4 OFFSET $2 LIMIT $3`,
                values: [containerID, offset, limit, dataSourceID],
            };
        }
    }

    private listNoTransformationsStatement(
        containerID: string,
        dataSourceID: string,
        offset: number,
        limit: number,
        sortBy?: string,
        sortDesc?: boolean,
    ): QueryConfig {
        if (sortDesc && sortBy) {
            return {
                text: `SELECT * FROM type_mappings
                       WHERE container_id = $1 AND data_source_id = $4
                       AND NOT EXISTS (SELECT 1 FROM type_mapping_transformations 
                       WHERE type_mapping_transformations.type_mapping_id = type_mappings.id)
                       ORDER BY "${sortBy}" DESC OFFSET $2 LIMIT $3`,
                values: [containerID, offset, limit, dataSourceID],
            };
        } else if (sortBy) {
            return {
                text: `SELECT * FROM type_mappings
                       WHERE container_id = $1 AND data_source_id = $4
                       AND NOT EXISTS (SELECT 1 FROM type_mapping_transformations 
                       WHERE type_mapping_transformations.type_mapping_id = type_mappings.id)
                       ORDER BY "${sortBy}" ASC OFFSET $2 LIMIT $3`,
                values: [containerID, offset, limit, dataSourceID],
            };
        } else {
            return {
                text: `SELECT * FROM type_mappings
                       WHERE container_id = $1 AND data_source_id = $4
                         AND NOT EXISTS (SELECT 1 FROM type_mapping_transformations 
                         WHERE type_mapping_transformations.type_mapping_id = type_mappings.id)
                       OFFSET $2 LIMIT $3`,
                values: [containerID, offset, limit, dataSourceID],
            };
        }
    }

    private listAllStatement(containerID: string, dataSourceID: string): QueryConfig {
        return {
            text: `SELECT * FROM type_mappings WHERE container_id = $1 AND data_source_id = $2`,
            values: [containerID, dataSourceID],
        };
    }

    private listAllNoTransformationsStatement(containerID: string, dataSourceID: string): QueryConfig {
        return {
            text: `SELECT * FROM type_mappings
                   WHERE container_id = $1 AND data_source_id = $2
                     AND NOT EXISTS (SELECT 1 FROM type_mapping_transformations 
                     WHERE type_mapping_transformations.type_mapping_id = type_mappings.id)`,
            values: [containerID, dataSourceID],
        };
    }

    private listByDataSourceStatement(dataSourceID: string, offset: number, limit: number): QueryConfig {
        return {
            text: `SELECT * FROM type_mappings WHERE data_source_id = $1 OFFSET $2 LIMIT $3`,
            values: [dataSourceID, offset, limit],
        };
    }

    private setActiveStatement(typeMappingID: string): QueryConfig {
        return {
            text: `UPDATE type_mappings SET active = true, modified_at = NOW() WHERE id = $1`,
            values: [typeMappingID],
        };
    }

    private setInactiveStatement(typeMappingID: string): QueryConfig {
        return {
            text: `UPDATE type_mappings SET active = false, modified_at = NOW() WHERE id = $1`,
            values: [typeMappingID],
        };
    }

    private setInactiveForContainerStatement(containerID: string): QueryConfig {
        return {
            text: `UPDATE type_mappings SET active = false, modified_at = NOW() WHERE container_id = $1`,
            values: [containerID],
        };
    }

    private countStatement(dataSourceID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM type_mappings WHERE data_source_id = $1`,
            values: [dataSourceID],
        };
    }

    private countNoTransformationStatement(dataSourceID: string): QueryConfig {
        return {
            text: `SELECT COUNT(*) FROM type_mappings
                   WHERE data_source_id = $1
                     AND NOT EXISTS (SELECT 1 FROM type_mapping_transformations 
                     WHERE type_mapping_transformations.type_mapping_id = type_mappings.id )`,
            values: [dataSourceID],
        };
    }
}
