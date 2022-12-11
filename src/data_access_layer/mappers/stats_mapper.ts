import Result from '../../common_classes/result';
import Mapper from './mapper';
import {FullStatistics, LongRunningTransactions, MeanExecutionTime, Statistics} from '../../domain_objects/stats';
import Logger from '../../services/logger';

const format = require('pg-format');

export default class StatsMapper extends Mapper {
    private static instance: StatsMapper;

    public static get Instance(): StatsMapper {
        if (!StatsMapper.instance) {
            StatsMapper.instance = new StatsMapper();
        }

        return StatsMapper.instance;
    }

    public async FullStatistics(): Promise<Result<FullStatistics>> {
        const mean_execution_time = await this.MeanExecutionTime();
        const long_running_queries = await this.LongRunningQueries();
        const statistics = await this.Statistics();

        const full = new FullStatistics();

        if (!mean_execution_time.isError) full.mean_execution_time = mean_execution_time.value;
        else Logger.error(statistics.error);
        if (!long_running_queries.isError) full.long_running_transactions = long_running_queries.value;
        else Logger.error(statistics.error);
        if (!statistics.isError) full.statistics = statistics.value;
        else Logger.error(statistics.error);

        return Promise.resolve(Result.Success(full));
    }

    public async MeanExecutionTime(): Promise<Result<MeanExecutionTime[]>> {
        return super.run(this.mean_execution_time(), {
            resultClass: MeanExecutionTime,
        });
    }

    public async LongRunningQueries(): Promise<Result<LongRunningTransactions[]>> {
        return super.run(this.long_running_transaction(), {
            resultClass: LongRunningTransactions,
        });
    }

    public async Statistics(): Promise<Result<Statistics>> {
        const r = await super.run(this.statistics(), {
            resultClass: Statistics,
        });

        if (r.isError) return Promise.resolve(Result.Pass(r));

        return Promise.resolve(Result.Success(r.value[0]));
    }

    // Below are a set of query building functions. So far they're very simple
    // and the return value is something that the postgres-node driver can understand
    // My hope is that this method will allow us to be flexible and create more complicated
    // queries more easily.
    private mean_execution_time(): string {
        const text = `SELECT userid::regrole, dbid, query, mean_exec_time
                      FROM pg_stat_statements
                      ORDER BY mean_exec_time
                              DESC LIMIT 5;`;

        return format(text);
    }

    private long_running_transaction(): string {
        const text = `
            SELECT pid, usename, datname, query, now() - xact_start as duration
            FROM pg_stat_activity
            WHERE pid <> pg_backend_pid() and state IN ('idle in transaction', 'active')
            ORDER BY duration DESC;`;

        return format(text);
    }

    private statistics(): string {
        const text = `
            SELECT (SELECT COUNT(*) FROM edge_queue_items WHERE attempts < 11) as edge_queue_items,
                   (SELECT COUNT(*) FROM containers)                           as containers,
                   (SELECT COUNT(*) FROM metatypes)                            as metatypes,
                   (SELECT COUNT(*) FROM metatype_keys)                        as metatype_keys,
                   (SELECT COUNT(*) FROM metatype_relationships)               as metatype_relationships,
                   (SELECT COUNT(*) FROM metatype_relationship_keys)           as metatype_relationship_keys,
                   (SELECT COUNT(*) FROM metatype_relationship_pairs)          AS metatype_relationship_pairs,
                   (SELECT COUNT(*) FROM nodes)                                as nodes,
                   (SELECT COUNT(*) FROM current_nodes)                        as current_nodes,
                   (SELECT COUNT(*) FROM edges)                                as edges,
                   (SELECT COUNT(*) FROM current_edges)                        as current_edges,
                   (SELECT COUNT(*) FROM data_staging)                         as data_staging,
                   (SELECT COUNT(*) FROM files)                                as files,
                   (SELECT ARRAY_AGG(name) FROM migrations)                    as migrations`;

        return format(text);
    }
}
