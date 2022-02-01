import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import {ContainerAlert} from '../../../../domain_objects/data_warehouse/ontology/container';

const format = require('pg-format');
const resultClass = ContainerAlert;

/*
    ContainerAlertMapper extends the Postgres database Mapper class and allows
    the user to map a data structure to and from the attached database. The mappers
    are designed to be as simple as possible and should not contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also
    try to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class ContainerAlertMapper extends Mapper {
    public static tableName = 'container_alerts';

    private static instance: ContainerAlertMapper;

    public static get Instance(): ContainerAlertMapper {
        if (!ContainerAlertMapper.instance) {
            ContainerAlertMapper.instance = new ContainerAlertMapper();
        }

        return ContainerAlertMapper.instance;
    }

    public async Create(userID: string, c: ContainerAlert, transaction?: PoolClient): Promise<Result<ContainerAlert>> {
        const r = await super.run(this.createStatement(userID, c), {
            transaction,
            resultClass,
        });
        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    public async BulkCreate(userID: string, c: ContainerAlert[] | ContainerAlert, transaction?: PoolClient): Promise<Result<ContainerAlert[]>> {
        if (!Array.isArray(c)) c = [c];

        return super.run(this.createStatement(userID, ...c), {
            transaction,
            resultClass,
        });
    }

    public async ListForContainer(containerID: string): Promise<Result<ContainerAlert[]>> {
        return super.rows(this.listForContainerStatement(containerID), {resultClass});
    }

    public async ListUnacknowledgedForContainer(containerID: string): Promise<Result<ContainerAlert[]>> {
        return super.rows(this.listUnacknowledgedForContainerStatement(containerID), {resultClass});
    }

    public async SetAcknowledged(id: string, userID: string): Promise<Result<boolean>> {
        return super.runStatement(this.setAcknowledgedStatement(id, userID));
    }

    public async Delete(id: string): Promise<Result<boolean>> {
        return super.runStatement(this.deleteStatement(id));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private createStatement(userID: string, ...alerts: ContainerAlert[]): string {
        const text = `INSERT INTO container_alerts(
                       container_id,
                       type, 
                       message,
                       created_by) VALUES %L RETURNING *`;
        const values = alerts.map((alert) => [alert.container_id, alert.type, alert.message, userID]);

        return format(text, values);
    }

    private setAcknowledgedStatement(alertID: string, userID: string): QueryConfig {
        return {
            text: `UPDATE container_alerts SET acknowledged_at = NOW(), acknowledged_by = $2 WHERE id = $1`,
            values: [alertID, userID],
        };
    }

    private deleteStatement(alertID: string): QueryConfig {
        return {
            text: `DELETE FROM container_alerts WHERE id = $1`,
            values: [alertID],
        };
    }

    private listForContainerStatement(containerID: string): QueryConfig {
        return {
            text: `SELECT *
                    FROM container_alerts
                    WHERE container_id = $1`,
            values: [containerID],
        };
    }

    private listUnacknowledgedForContainerStatement(containerID: string): QueryConfig {
        return {
            text: `SELECT *
                    FROM container_alerts
                    WHERE container_id = $1
                    AND acknowledged_at IS NULL`,
            values: [containerID],
        };
    }
}
