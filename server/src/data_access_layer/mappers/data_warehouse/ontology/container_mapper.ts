import Container, {DataSourceTemplate} from '../../../../domain_objects/data_warehouse/ontology/container';
import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';

const format = require('pg-format');

/*
    ContainerMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class ContainerMapper extends Mapper {
    public resultClass = Container;
    public static tableName = 'containers';

    private static instance: ContainerMapper;

    public static get Instance(): ContainerMapper {
        if (!ContainerMapper.instance) {
            ContainerMapper.instance = new ContainerMapper();
        }

        return ContainerMapper.instance;
    }

    public async Create(userID: string, c: Container, transaction?: PoolClient): Promise<Result<Container>> {
        const r = await super.run(this.createStatement(userID, c), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, c: Container[] | Container, transaction?: PoolClient): Promise<Result<Container[]>> {
        if (!Array.isArray(c)) c = [c];

        return super.run(this.createStatement(userID, ...c), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async Retrieve(id: string): Promise<Result<Container>> {
        return super.retrieve(this.retrieveStatement(id), {
            resultClass: this.resultClass,
        });
    }

    public async Update(userID: string, c: Container, transaction?: PoolClient): Promise<Result<Container>> {
        const r = await super.run(this.fullUpdateStatement(userID, c), {
            transaction,
            resultClass: this.resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkUpdate(userID: string, c: Container[], transaction?: PoolClient): Promise<Result<Container[]>> {
        return super.run(this.fullUpdateStatement(userID, ...c), {
            transaction,
            resultClass: this.resultClass,
        });
    }

    public async List(): Promise<Result<Container[]>> {
        return super.rows(this.listStatement(), {resultClass: Container});
    }

    public async ListFromIDs(ids: string[]): Promise<Result<Container[]>> {
        return super.rows(this.listFromIDsStatement(ids), {resultClass: this.resultClass});
    }

    public async ListForServiceUser(userID: string): Promise<Result<Container[]>> {
        return super.rows(this.listForServiceUserStatement(userID), {resultClass: this.resultClass});
    }

    public async Archive(containerID: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.archiveStatement(containerID, userID));
    }

    public async SetActive(containerID: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.setActiveStatement(containerID, userID));
    }

    public async Delete(containerID: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(containerID));
    }

    // try to open an advisory lock on the container, will wait until the lock is available
    // we need to run this in a transaction so we hold a connection open throughout the processes that
    // use it, the pool will close otherwise - will return false if it cannot pull the lock
    // https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS
    public async AdvisoryLockContainer(containerID: string, transaction: PoolClient): Promise<boolean> {
        const r = await super.retrieve<{[key: string]: any}>(this.lockContainerStatement(containerID), {
            transaction,
        });

        if (r.isError) return Promise.resolve(false);

        return Promise.resolve(r.value.lock);
    }

    public async CreateDataSourceTemplate(template: DataSourceTemplate, containerID: string, transaction?: PoolClient): Promise<Result<DataSourceTemplate[]>> {
        const r = await super.run(this.createDataSourceTemplateStatement([template], containerID), {
            transaction,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        // we have to convert the returned object into an array of DataSourceTemplates;
        // unfortunately the class conversion in the root mapper doesn't work since
        // the SQL returns the results as a single field
        const resultsArray: DataSourceTemplate[] = (r.value[0] as {data_source_templates: any}).data_source_templates;

        return Promise.resolve(Result.Success(resultsArray));
    }

    public async BulkCreateDataSourceTemplates(
        templates: DataSourceTemplate[],
        containerID: string,
        transaction?: PoolClient,
    ): Promise<Result<DataSourceTemplate[]>> {
        const r = await super.run(this.createDataSourceTemplateStatement(templates, containerID), {
            transaction,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        // we have to convert the returned object into an array of DataSourceTemplates;
        // unfortunately the class conversion in the root mapper doesn't work since
        // the SQL returns the results as a single field
        const resultsArray: DataSourceTemplate[] = (r.value[0] as {data_source_templates: any}).data_source_templates;

        return Promise.resolve(Result.Success(resultsArray));
    }

    public async RetrieveDataSourceTemplateByID(templateID: string, containerID: string): Promise<Result<DataSourceTemplate>> {
        const r = await super.retrieve(this.retrieveDataSourceTemplateByIDStatement(templateID, containerID));
        if (r.isError) return Promise.resolve(Result.Pass(r));

        // we have to convert the returned object into a proper DataSourceTemplate;
        // unfortunately the class conversion in the root mapper doesn't work since
        // the SQL returns the results as a single field
        let result: DataSourceTemplate | undefined;
        try {
            result = (r.value as object)['jsonb_agg' as keyof object][0];
        } catch {
            return Promise.resolve(Result.Failure(`data source template ${templateID} not found`, 404));
        }

        return Promise.resolve(Result.Success(result));
    }

    public async RetrieveDataSourceTemplateByName(templateName: string, containerID: string): Promise<Result<DataSourceTemplate>> {
        const r = await super.retrieve(this.retrieveDataSourceTemplateByNameStatement(templateName, containerID));
        if (r.isError) return Promise.resolve(Result.Pass(r));

        // we have to convert the returned object into a proper DataSourceTemplate;
        // unfortunately the class conversion in the root mapper doesn't work since
        // the SQL returns the results as a single field
        let result: DataSourceTemplate | undefined;
        try {
            result = (r.value as object)['jsonb_agg' as keyof object][0];
        } catch {
            return Promise.resolve(Result.Failure(`data source template ${templateName} not found`, 404));
        }

        return Promise.resolve(Result.Success(result));
    }

    public async ListDataSourceTemplates(containerID: string): Promise<Result<DataSourceTemplate[]>> {
        const r = await super.retrieve(this.listDataSourceTemplatesStatement(containerID));
        if (r.isError) return Promise.resolve(Result.Pass(r));

        // we have to convert the returned object into an array of DataSourceTemplates;
        // unfortunately the class conversion in the root mapper doesn't work since
        // the SQL returns the results as a single field
        const resultsArray = JSON.parse((r.value as object)['data_source_templates' as keyof object]);

        return Promise.resolve(Result.Success(resultsArray));
    }

    public async UpdateDataSourceTemplate(template: DataSourceTemplate, containerID: string, transaction?: PoolClient): Promise<Result<DataSourceTemplate[]>> {
        const r = await super.run(this.updateDataSourceTemplateStatement(template, containerID), {
            transaction,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        // we have to convert the returned object into an array of DataSourceTemplates;
        // unfortunately the class conversion in the root mapper doesn't work since
        // the SQL returns the results as a single field
        const resultsArray: DataSourceTemplate[] = JSON.parse((r.value[0] as {data_source_templates: string}).data_source_templates);

        return Promise.resolve(Result.Success(resultsArray));
    }

    public async DeleteDataSourceTemplate(templateID: string, containerID: string, transaction?: PoolClient): Promise<Result<DataSourceTemplate[]>> {
        const r = await super.run(this.deleteDataSourceTemplateStatement([templateID], containerID), {
            transaction,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        // we have to convert the returned object into an array of DataSourceTemplates;
        // unfortunately the class conversion in the root mapper doesn't work since
        // the SQL returns the results as a single field
        const resultsArray: DataSourceTemplate[] = JSON.parse((r.value[0] as {data_source_templates: string}).data_source_templates);

        return Promise.resolve(Result.Success(resultsArray));
    }

    public async BulkDeleteDataSourceTemplates(templateIDs: string[], containerID: string, transaction?: PoolClient): Promise<Result<DataSourceTemplate[]>> {
        const r = await super.run(this.deleteDataSourceTemplateStatement(templateIDs, containerID), {
            transaction,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        // we have to convert the returned object into an array of DataSourceTemplates;
        // unfortunately the class conversion in the root mapper doesn't work since
        // the SQL returns the results as a single field
        const resultsArray: DataSourceTemplate[] = JSON.parse((r.value[0] as {data_source_templates: string}).data_source_templates);

        return Promise.resolve(Result.Success(resultsArray));
    }

    public async AuthorizeDataSourceTemplate(templateName: string, containerID: string, transaction?: PoolClient): Promise<Result<DataSourceTemplate[]>> {
        const r = await super.run(this.authorizeDataSourceTemplateStatement(templateName, containerID), {
            transaction,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        // we have to convert the returned object into an array of DataSourceTemplates;
        // unfortunately the class conversion in the root mapper doesn't work since
        // the SQL returns the results as a single field
        const resultsArray: DataSourceTemplate[] = JSON.parse((r.value[0] as {data_source_templates: string}).data_source_templates);

        return Promise.resolve(Result.Success(resultsArray));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...containers: Container[]): string {
        const text = `INSERT INTO containers(name,
                                             description,
                                             config,
                                             created_by,
                                             modified_by)
        VALUES
        %L RETURNING *`;
        const values = containers.map((container) => [container.name, container.description, container.config, userID, userID]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...containers: Container[]): string {
        const text = `UPDATE containers AS c
                      SET name        = u.name,
                          description = u.description,
                          config      = u.config::jsonb,
                          modified_by = u.modified_by,
                          modified_at = NOW()
                      FROM (VALUES %L) AS u(id, name, description, config, modified_by)
                      WHERE u.id::bigint = c.id
                      RETURNING c.*`;
        const values = containers.map((container) => [container.id, container.name, container.description, container.config, userID]);

        return format(text, values);
    }

    private archiveStatement(containerID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE containers
                   SET deleted_at  = NOW(),
                       modified_by = $2
                   WHERE id = $1`,
            values: [containerID, userID],
        };
    }

    private setActiveStatement(containerID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE containers
                   SET modified_at = NOW(),
                       modified_by = $2
                   WHERE id = $1`,
            values: [containerID, userID],
        };
    }

    private deleteStatement(containerID: string): QueryConfig {
        return {
            text: `DELETE
                   FROM containers
                   WHERE id = $1`,
            values: [containerID],
        };
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT c.*
                   FROM containers c
                   WHERE c.id = $1`,
            values: [id],
        };
    }

    private listStatement(): QueryConfig {
        return {
            text: `SELECT c.*
                   FROM containers c`,
        };
    }

    private lockContainerStatement(containerID: string): QueryConfig {
        return {text: `SELECT pg_try_advisory_xact_lock($1) as lock;`, values: [containerID]};
    }

    private listFromIDsStatement(ids: string[]): string {
        const text = `SELECT c.*
                      FROM containers c
                      WHERE c.id IN (%L)`;

        return format(text, ids);
    }

    private listForServiceUserStatement(userID: string): QueryConfig {
        return {
            text: `SELECT c.*
                   FROM container_service_users cs
                            JOIN containers c ON cs.container_id = c.id
                   WHERE cs.user_id = $1`,
            values: [userID],
        };
    }

    // add a new template to data_source_templates, or create the array if not exists
    // only return the recently created data source template(s) for use in the repository
    private createDataSourceTemplateStatement(templates: DataSourceTemplate[], containerID: string): QueryConfig {
        const templateIDs = templates.map((t) => t.id);
        return {
            text: `UPDATE containers AS c
                   SET config = jsonb_set(config, '{data_source_templates}',
                                          CASE
                                              WHEN config -> 'data_source_templates' IS NULL THEN $1::jsonb
                                              ELSE config -> 'data_source_templates' || $1::jsonb
                                              END
                                )
                   WHERE c.id = $2
                   RETURNING (SELECT jsonb_agg(e)
                              FROM jsonb_array_elements(c.config -> 'data_source_templates') AS e
                              WHERE e ->> 'id' = ANY ($3)) AS data_source_templates`,
            values: [JSON.stringify(templates), containerID, templateIDs],
        };
    }

    private retrieveDataSourceTemplateByIDStatement(templateID: string, containerID: string): QueryConfig {
        return {
            text: `SELECT jsonb_agg(e)
                   FROM containers c,
                        jsonb_array_elements(c.config -> 'data_source_templates') AS e
                   WHERE e ->> 'id' = $1
                     AND c.id = $2`,
            values: [templateID, containerID],
        };
    }

    private retrieveDataSourceTemplateByNameStatement(templateName: string, containerID: string): QueryConfig {
        return {
            text: `SELECT jsonb_agg(e)
                   FROM containers c,
                        jsonb_array_elements(c.config -> 'data_source_templates') AS e
                   WHERE e ->> 'name' = $1
                     AND c.id = $2`,
            values: [templateName, containerID],
        };
    }

    private listDataSourceTemplatesStatement(containerID: string): QueryConfig {
        return {
            text: `SELECT c.config ->> 'data_source_templates' AS data_source_templates
                   FROM containers c
                   WHERE c.id = $1`,
            values: [containerID],
        };
    }

    // This is good enough for singular updates, but for bulk updates it is more straightforward
    // to do a bulk delete followed by a bulk insert. The alternative is a very complex CTE or
    // repeating this call (n) times. Bulk updates are performed in this manner in the repository
    // layer, within a transaction.
    private updateDataSourceTemplateStatement(template: DataSourceTemplate, containerID: string): QueryConfig {
        return {
            text: `UPDATE containers AS c
                   SET config = jsonb_set(config, '{data_source_templates}', (SELECT jsonb_agg(
                                                                                             CASE
                                                                                                 WHEN e ->> 'id' = $1 THEN $2::jsonb
                                                                                                 ELSE e
                                                                                                 END
                                                                                     )
                                                                              FROM jsonb_array_elements(c.config -> 'data_source_templates') AS e))
                   WHERE c.id = $3
                   RETURNING c.config ->> 'data_source_templates' AS data_source_templates`,
            values: [template.id!, JSON.stringify(template), containerID],
        };
    }

    // if all items are deleted, set the array to an empty array instead of null
    private deleteDataSourceTemplateStatement(templateIDs: string[], containerID: string): QueryConfig {
        return {
            text: `UPDATE containers AS c
                   SET config = jsonb_set(config, '{data_source_templates}', (SELECT CASE
                                                                                         WHEN COUNT(e) = 0 THEN '[]'::jsonb
                                                                                         ELSE jsonb_agg(e)
                                                                                         END
                                                                              FROM jsonb_array_elements(c.config -> 'data_source_templates') AS e
                                                                              WHERE e ->> 'id' <> ALL ($1)))
                   WHERE c.id = $2
                   RETURNING c.config ->> 'data_source_templates' AS data_source_templates`,
            values: [templateIDs, containerID],
        };
    }

    private authorizeDataSourceTemplateStatement(templateName: string, containerID: string): QueryConfig {
        return {
            text: `UPDATE containers AS c
                   SET config = jsonb_set(config, '{data_source_templates}', (SELECT jsonb_agg(
                                                                                             CASE
                                                                                                 WHEN e ->> 'name' = $1
                                                                                                     THEN jsonb_set(e, '{authorized}', 'true'::jsonb)
                                                                                                 ELSE e
                                                                                                 END
                                                                                     )
                                                                              FROM jsonb_array_elements(c.config -> 'data_source_templates') AS e))
                   WHERE c.id = $2
                   RETURNING c.config ->> 'data_source_templates' AS data_source_templates`,
            values: [templateName, containerID],
        };
    }
}
