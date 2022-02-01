import Changelist, {ChangelistApproval} from '../../../../../domain_objects/data_warehouse/ontology/versioning/changelist';
import Mapper from '../../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Result from '../../../../../common_classes/result';

const format = require('pg-format');
const resultClass = ChangelistApproval;

export default class ChangelistApprovalMapper extends Mapper {
    public static tableName = 'changelist_approvals';

    private static instance: ChangelistApprovalMapper;

    public static get Instance(): ChangelistApprovalMapper {
        if (!ChangelistApprovalMapper.instance) {
            ChangelistApprovalMapper.instance = new ChangelistApprovalMapper();
        }

        return ChangelistApprovalMapper.instance;
    }

    public async Create(userID: string, input: ChangelistApproval, transaction?: PoolClient): Promise<Result<ChangelistApproval>> {
        const r = await super.run(this.createStatement(userID, input), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async ListForChangelist(changelistID: string): Promise<Result<ChangelistApproval[]>> {
        return super.rows<ChangelistApproval>(this.listForChangelistStatement(changelistID), {resultClass});
    }

    public async DeleteByChangelist(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteByChangelistStatement(id));
    }

    public async Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...approvals: ChangelistApproval[]): string {
        const text = `INSERT INTO changelist_approvals(
                        changelist_id,
                        approved_by,
                        approved_at
        ) VALUES %L RETURNING *`;
        const values = approvals.map((approval) => [approval.changelist_id, userID, new Date()]);

        return format(text, values);
    }

    private listForChangelistStatement(id: string): QueryConfig {
        return {
            text: `SELECT * FROM changelist_approvals WHERE changelist_id = $1`,
            values: [id],
        };
    }

    private deleteByChangelistStatement(id: string): QueryConfig {
        return {
            text: `DELETE FROM changelist_approvals WHERE changelist_id = $1`,
            values: [id],
        };
    }

    private deleteStatement(id: string): QueryConfig {
        return {
            text: `DELETE FROM changelist_approvals WHERE id = $1`,
            values: [id],
        };
    }
}
