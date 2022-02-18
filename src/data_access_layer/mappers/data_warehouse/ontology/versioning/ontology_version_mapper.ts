import Mapper from '../../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Result from '../../../../../common_classes/result';
import OntologyVersion from '../../../../../domain_objects/data_warehouse/ontology/versioning/ontology_version';

const format = require('pg-format');
const resultClass = OntologyVersion;

export default class OntologyVersionMapper extends Mapper {
    public static tableName = 'ontology_versions';

    private static instance: OntologyVersionMapper;

    public static get Instance(): OntologyVersionMapper {
        if (!OntologyVersionMapper.instance) {
            OntologyVersionMapper.instance = new OntologyVersionMapper();
        }

        return OntologyVersionMapper.instance;
    }

    public async Create(userID: string, input: OntologyVersion, transaction?: PoolClient): Promise<Result<OntologyVersion>> {
        const r = await super.run(this.createStatement(userID, input), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Retrieve(id: string): Promise<Result<OntologyVersion>> {
        return super.retrieve(this.retrieveStatement(id), {resultClass});
    }

    public async Update(userID: string, m: OntologyVersion, transaction?: PoolClient): Promise<Result<OntologyVersion>> {
        const r = await super.run(this.fullUpdateStatement(userID, m), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async Approve(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.approveStatement(id, userID));
    }

    public async RevokeApproval(id: string, statusMessage?: string): Promise<Result<boolean>> {
        return super.runStatement(this.revokeApprovalStatement(id, statusMessage));
    }

    public async SetStatus(
        id: string,
        status: 'pending' | 'approved' | 'rejected' | 'published' | 'deprecated' | 'ready' | 'error' | 'generating',
        statusMessage?: string,
    ): Promise<Result<boolean>> {
        if (status === 'published') {
            return super.runStatement(this.setPublishedStatement(id, status, statusMessage));
        }

        return super.runStatement(this.setStatusStatement(id, status, statusMessage));
    }

    public async CloneOntology(userID: string, baseVersionID: string | undefined, targetVersionID: string, transaction?: PoolClient): Promise<Result<boolean>> {
        return super.runStatement(this.cloneOntologyStatement(userID, baseVersionID, targetVersionID), {transaction});
    }

    public async Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...versions: OntologyVersion[]): string {
        const text = `INSERT INTO ontology_versions(
                        name,
                        description,
                        container_id,
                        status,
                        status_message,  
                        created_by) VALUES %L RETURNING *`;
        const values = versions.map((version) => [version.name, version.description, version.container_id, version.status, version.status_message, userID]);

        return format(text, values);
    }

    private fullUpdateStatement(userID: string, ...versions: OntologyVersion[]): string {
        const text = `UPDATE ontology_versions AS v SET
                        name = u.name,
                        description = u.description,
                        container_id = u.container_id::bigint,
                       FROM(VALUES %L) AS u(id, name, description, container_id)
                       WHERE u.id::bigint = v.id RETURNING v.*`;
        const values = versions.map((version) => [version.id, version.name, version.description, version.container_id]);

        return format(text, values);
    }

    private retrieveStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM ontology_versions WHERE id = $1`,
            values: [id],
        };
    }

    private deleteStatement(id: string): QueryConfig {
        return {
            text: `DELETE FROM ontology_versions WHERE id = $1 AND status <> 'applied'`,
            values: [id],
        };
    }

    private approveStatement(id: string, userID: string): QueryConfig {
        return {
            text: `UPDATE ontology_versions SET approved_by = $1, approved_at = NOW(), status = 'approved' WHERE id = $2`,
            values: [userID, id],
        };
    }

    private revokeApprovalStatement(id: string, statusMessage?: string): QueryConfig {
        return {
            text: `UPDATE ontology_versions SET approved_by = NULL, approved_at = NULL, status = 'rejected', status_message = $2 WHERE id = $1`,
            values: [id, statusMessage],
        };
    }

    private setStatusStatement(
        id: string,
        status: 'pending' | 'approved' | 'rejected' | 'published' | 'deprecated' | 'ready' | 'error' | 'generating',
        statusMessage?: string,
    ): QueryConfig {
        return {
            text: `UPDATE ontology_versions SET status = $2, status_message = $3 WHERE id = $1`,
            values: [id, status, statusMessage],
        };
    }

    private setPublishedStatement(
        id: string,
        status: 'pending' | 'approved' | 'rejected' | 'published' | 'deprecated' | 'ready' | 'error' | 'generating',
        statusMessage?: string,
    ): QueryConfig {
        return {
            text: `UPDATE ontology_versions SET status = $2, status_message = $3, published_at = NOW() WHERE id = $1`,
            values: [id, status, statusMessage],
        };
    }

    // this statement runs the function for cloning the ontology, requires at least a target ontology version but
    // base version could be null
    private cloneOntologyStatement(userID: string, baseOntology: string | undefined, targetOntology: string): QueryConfig {
        return {
            text: `SELECT clone_ontology($1::bigint, $2::bigint, $3::bigint);`,
            values: [userID, baseOntology, targetOntology],
        };
    }
}
