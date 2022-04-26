import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import TypeTransformation from '../../../../domain_objects/data_warehouse/etl/type_transformation';

const format = require('pg-format');
const resultClass = TypeTransformation;

/*
    TypeTransformationMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class TypeTransformationMapper extends Mapper {
    public static tableName = 'type_mapping_transformations';

    private static instance: TypeTransformationMapper;

    public static get Instance(): TypeTransformationMapper {
        if (!TypeTransformationMapper.instance) {
            TypeTransformationMapper.instance = new TypeTransformationMapper();
        }

        return TypeTransformationMapper.instance;
    }

    public async Create(userID: string, t: TypeTransformation, transaction?: PoolClient): Promise<Result<TypeTransformation>> {
        const r = await super.run(this.createStatement(userID, t), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, t: TypeTransformation[], transaction?: PoolClient): Promise<Result<TypeTransformation[]>> {
        return super.run(this.createStatement(userID, ...t), {
            transaction,
            resultClass,
        });
    }

    public async Update(userID: string, t: TypeTransformation, transaction?: PoolClient): Promise<Result<TypeTransformation>> {
        const r = await super.run(this.fullUpdateStatement(userID, t), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(userID: string, t: TypeTransformation[], transaction?: PoolClient): Promise<Result<TypeTransformation[]>> {
        return super.run(this.fullUpdateStatement(userID, ...t), {
            transaction,
            resultClass,
        });
    }

    public async Retrieve(id: string): Promise<Result<TypeTransformation>> {
        return super.retrieve<TypeTransformation>(this.retrieveStatement(id), {
            resultClass,
        });
    }

    public async ListForTypeMapping(typeMappingID: string): Promise<Result<TypeTransformation[]>> {
        return super.rows<TypeTransformation>(this.listByMapping(typeMappingID), {resultClass});
    }

    public async BulkDelete(transformations: TypeTransformation[], transaction?: PoolClient): Promise<Result<boolean>> {
        transformations.forEach((t) => {
            void this.DeleteHypertable(t.id!);
        });

        return super.runStatement(this.bulkDeleteStatement(transformations), {
            transaction,
        });
    }

    public async InUse(id: string): Promise<Result<boolean>> {
        const results = await super.rows<any>(this.inUseStatement(id));
        if (results.isError) return Promise.resolve(Result.Pass(results));

        return Promise.resolve(Result.Success(results.value.length > 0));
    }

    public async Archive(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.archiveStatement(id, userID));
    }

    public Delete(id: string): Promise<Result<boolean>> {
        // in case the hypertable didn't get dropped earlier
        void this.DeleteHypertable(id);

        return super.runStatement(this.deleteStatement(id));
    }

    public DeleteWithData(id: string): Promise<Result<boolean>> {
        // in case the hypertable didn't get dropped earlier
        void this.DeleteHypertable(id);

        return super.runAsTransaction(...this.deleteWithDataStatement(id));
    }

    // taking a time series transformation create a hypertable based on its column mapping data
    public async CreateHypertable(transformation: TypeTransformation): Promise<Result<boolean>> {
        if (!transformation.id || !transformation.keys || transformation.keys.length === 0) {
            return Result.Failure('transformation must have id and mapping keys in order to create time series table');
        }

        if (transformation.metatype_id || transformation.metatype_relationship_pair_id) {
            return Result.Failure('transformation is not a time series transformation');
        }

        return super.runAsTransaction(...this.createHypertableStatement(transformation));
    }

    public async DeleteHypertable(transformationID: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteHypertableStatement(transformationID));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...t: TypeTransformation[]): string {
        const text = `WITH ins as(INSERT INTO type_mapping_transformations(
            keys,
            type,
            type_mapping_id,
            conditions,
            metatype_id,
            metatype_relationship_pair_id,
            origin_id_key,
            origin_metatype_id,
            origin_data_source_id, 
            destination_id_key,
            destination_metatype_id,
            destination_data_source_id,
            tab_data_source_id,
            tab_metatype_id,
            tab_node_id,
            tab_node_key,
            unique_identifier_key,
            root_array,
            config,
            created_by,
            modified_by) VALUES %L RETURNING *)

        SELECT ins.*,
               mapping.container_id AS container_id,
               mapping.data_source_id as data_source_id,
               mapping.shape_hash as shape_hash,
               metatypes.name as metatype_name,
               metatype_relationship_pairs.name as metatype_relationship_pair_name
        FROM ins
            LEFT JOIN type_mappings as mapping ON ins.type_mapping_id = mapping.id
                 LEFT JOIN metatypes ON ins.metatype_id = metatypes.id
                 LEFT JOIN metatype_relationship_pairs ON ins.metatype_relationship_pair_id = metatype_relationship_pairs.id
        `;
        const values = t.map((tt) => [
            JSON.stringify(tt.keys),
            tt.type,
            tt.type_mapping_id,
            JSON.stringify(tt.conditions),
            tt.metatype_id === '' ? undefined : tt.metatype_id,
            tt.metatype_relationship_pair_id === '' ? undefined : tt.metatype_relationship_pair_id,
            tt.origin_id_key,
            tt.origin_metatype_id,
            tt.origin_data_source_id,
            tt.destination_id_key,
            tt.destination_metatype_id,
            tt.destination_data_source_id,
            tt.tab_data_source_id,
            tt.tab_metatype_id,
            tt.tab_node_id,
            tt.tab_node_key,
            tt.unique_identifier_key,
            tt.root_array,
            JSON.stringify(tt.config),
            userID,
            userID,
        ]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...t: TypeTransformation[]): string {
        const text = `WITH ins as(UPDATE type_mapping_transformations as t SET
            keys = u.keys::jsonb,
            type = u.type::varchar,
            type_mapping_id = u.type_mapping_id::bigint,
            conditions = u.conditions::jsonb,
            metatype_id = u.metatype_id::bigint,
            metatype_relationship_pair_id = u.metatype_relationship_pair_id::bigint,
            origin_id_key = u.origin_id_key,
            origin_metatype_id = u.origin_metatype_id::bigint,
            origin_data_source_id = u.origin_data_source_id::bigint,
            destination_id_key = u.destination_id_key,
            destination_metatype_id = u.destination_metatype_id::bigint,
            destination_data_source_id = u.destination_data_source_id::bigint,
            tab_data_source_id = u.tab_data_source_id::bigint,
            tab_metatype_id = u.tab_metatype_id::bigint,
            tab_node_id = u.tab_node_id::text,
            tab_node_key = u.tab_node_key::text,
            unique_identifier_key = u.unique_identifier_key,
            root_array = u.root_array,
            config = u.config::jsonb,
            modified_by = u.modified_by,
            modified_at = NOW()
            FROM (VALUES %L) as u(
                            id,
                            keys,
                            type,
                            type_mapping_id,
                            conditions,
                            metatype_id,
                            metatype_relationship_pair_id,
                            origin_id_key,
                            origin_metatype_id,
                            origin_data_source_id, 
                            destination_id_key,
                            destination_metatype_id,
                            destination_data_source_id,
                            tab_data_source_id,
                            tab_metatype_id,
                            tab_node_id,
                            tab_node_key,
                            unique_identifier_key,
                            root_array,
                            config,
                            modified_by
                          ) WHERE u.id::bigint= t.id RETURNING t.*)

        SELECT ins.*,
               mapping.container_id AS container_id,
               mapping.data_source_id as data_source_id,
               mapping.shape_hash as shape_hash,
               metatypes.name as metatype_name,
               metatype_relationship_pairs.name as metatype_relationship_pair_name
        FROM ins
                 LEFT JOIN type_mappings as mapping ON ins.type_mapping_id = mapping.id
                 LEFT JOIN metatypes ON ins.metatype_id = metatypes.id
                 LEFT JOIN metatype_relationship_pairs ON ins.metatype_relationship_pair_id = metatype_relationship_pairs.id`;
        const values = t.map((tt) => [
            tt.id,
            JSON.stringify(tt.keys),
            tt.type,
            tt.type_mapping_id,
            JSON.stringify(tt.conditions),
            tt.metatype_id === '' ? undefined : tt.metatype_id,
            tt.metatype_relationship_pair_id === '' ? undefined : tt.metatype_relationship_pair_id,
            tt.origin_id_key,
            tt.origin_metatype_id,
            tt.origin_data_source_id,
            tt.destination_id_key,
            tt.destination_metatype_id,
            tt.destination_data_source_id,
            tt.tab_data_source_id,
            tt.tab_metatype_id,
            tt.tab_node_id,
            tt.tab_node_key,
            tt.unique_identifier_key,
            tt.root_array,
            JSON.stringify(tt.config),
            userID,
            userID,
        ]);

        return format(text, values);
    }
    private retrieveStatement(transformationID: string): QueryConfig {
        return {
            text: `SELECT type_mapping_transformations.*,
                         metatypes.name as metatype_name,
                         metatype_relationship_pairs.name as metatype_relationship_pair_name,
                         metatypes.ontology_version as metatype_ontology_version,
                         metatype_relationship_pairs.ontology_version as metatype_relationship_pair_ontology_version,
                         mapping.container_id AS container_id,
                         mapping.shape_hash as shape_hash,
                         mapping.data_source_id as data_source_id
                  FROM type_mapping_transformations
                           LEFT JOIN type_mappings as mapping ON type_mapping_transformations.type_mapping_id = mapping.id
                           LEFT JOIN metatypes ON type_mapping_transformations.metatype_id = metatypes.id
                           LEFT JOIN metatype_relationship_pairs 
                               ON type_mapping_transformations.metatype_relationship_pair_id = metatype_relationship_pairs.id
                  WHERE type_mapping_transformations.id = $1`,
            values: [transformationID],
        };
    }

    private deleteStatement(exportID: string): QueryConfig {
        return {
            text: `DELETE FROM type_mapping_transformations WHERE id = $1`,
            values: [exportID],
        };
    }

    private deleteWithDataStatement(transformationID: string): QueryConfig[] {
        return [
            {
                text: `DELETE FROM nodes WHERE type_mapping_transformation_id = $1`,
                values: [transformationID],
            },
            {
                text: `DELETE FROM edges WHERE type_mapping_transformation_id = $1`,
                values: [transformationID],
            },
            {
                text: `DELETE FROM type_mapping_transformations WHERE id = $1`,
                values: [transformationID],
            },
        ];
    }

    private bulkDeleteStatement(transformations: TypeTransformation[]): string {
        const text = `DELETE FROM type_mapping_transformations WHERE id IN(%L)`;
        const values = transformations.filter((t) => t.id).map((t) => t.id as string);

        return format(text, values);
    }

    private listByMapping(typeMappingID: string): QueryConfig {
        return {
            text: `SELECT type_mapping_transformations.*,
                          metatypes.name as metatype_name,
                          metatype_relationship_pairs.name as metatype_relationship_pair_name,
                          metatypes.ontology_version as metatype_ontology_version,
                          metatype_relationship_pairs.ontology_version as metatype_relationship_pair_ontology_version,  
                          mapping.container_id AS container_id,
                          mapping.shape_hash as shape_hash,
                          mapping.data_source_id as data_source_id
                   FROM type_mapping_transformations
                            LEFT JOIN type_mappings as mapping ON type_mapping_transformations.type_mapping_id = mapping.id
                            LEFT JOIN metatypes ON type_mapping_transformations.metatype_id = metatypes.id
                            LEFT JOIN metatype_relationship_pairs 
                                ON type_mapping_transformations.metatype_relationship_pair_id = metatype_relationship_pairs.id
                   WHERE type_mapping_id = $1`,
            values: [typeMappingID],
        };
    }

    private archiveStatement(transformationID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE type_mapping_transformations 
                    SET archived = true, modified_by = $2, modified_at = NOW()
                    WHERE id = $1`,
            values: [transformationID, userID],
        };
    }

    // this statement basically checks to see if a transformation was used to generate
    // any existing nodes or edges. Generally used prior to deletion to check and
    // see if we need the "force" parameter for the delete
    private inUseStatement(transformationID: string): QueryConfig {
        return {
            text: `(SELECT n.id FROM nodes n WHERE n.type_mapping_transformation_id = $1
                        UNION ALL
                    SELECT e.id FROM edges e WHERE e.type_mapping_transformation_id = $1) LIMIT 1`,
            values: [transformationID],
        };
    }

    private createHypertableStatement(transformation: TypeTransformation): QueryConfig[] {
        let primaryTimestampColumnName = '';
        const columnStatements: string[] = transformation.keys.map((key) => {
            if (key.is_primary_timestamp) {
                primaryTimestampColumnName = key.column_name!;
            }
            // this determines the data type of the column to be created
            let type = 'text';

            switch (key.value_type) {
                case undefined: {
                    type = 'text';
                    break;
                }

                case 'number': {
                    type = 'integer';
                    break;
                }

                case 'number64': {
                    type = 'bigint';
                    break;
                }

                case 'float': {
                    type = 'numeric';
                    break;
                }
                case 'float64': {
                    type = 'numeric';
                    break;
                }

                case 'date': {
                    type = 'timestamp';
                    break;
                }

                case 'boolean': {
                    type = 'boolean';
                    break;
                }
            }

            return format('%I %I DEFAULT NULL', key.column_name, type);
        });

        const createStatement = format(
            `CREATE TABLE IF NOT EXISTS %I (
                ${columnStatements.join(',')},
                _nodes bigint[] DEFAULT NULL,
                _metadata jsonb DEFAULT NULL
                )`,
            'z_' + transformation.id!,
        );

        return [
            {
                text: format(`DROP TABLE IF EXISTS %s`, 'z_' + transformation.id!),
            },
            {
                text: createStatement,
            },
            {
                text: format(`SELECT create_hypertable(%L, %L)`, 'z_' + transformation.id!, primaryTimestampColumnName),
            },
        ];
    }

    private deleteHypertableStatement(transformationID: string): string {
        const text = `DROP TABLE IF EXISTS %s`;
        const values = ['z_' + transformationID];

        return format(text, values);
    }
}
