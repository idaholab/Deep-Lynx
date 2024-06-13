const packageJson = require('../../package.json');

export class MeanExecutionTime {
    user_id?: string;
    dbid?: string;
    query?: string;
    mean_exec_time?: any;
}

export class LongRunningTransactions {
    pid?: string;
    usename?: string;
    datname?: string;
    query?: string;
    duration?: any;
}

export class Statistics {
    containers?: string;
    metatypes?: string;
    metatype_keys?: string;
    metatype_relationships?: string;
    metatype_relationship_keys?: string;
    metatype_relationship_pairs?: string;
    nodes?: string;
    edges?: string;
    current_nodes?: string;
    current_edges?: string;
    data_staging?: string;
    files?: string;
    migrations?: string[];
}

export class FullStatistics {
    mean_execution_time?: MeanExecutionTime[];
    long_running_transactions?: LongRunningTransactions[];
    statistics?: Statistics;
    version? = packageJson.version;
}
