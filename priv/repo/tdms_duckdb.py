import nptdms
import duckdb
import os
import json


def sample(path):
    path = path.decode("utf-8")
    dirname = os.path.expanduser("~")

    with nptdms.TdmsFile.open(path) as tdms_file:
        df = tdms_file.as_dataframe(time_index=True, absolute_time=True)
        df = df.sample(frac=0.01).sort_index()
        df.reset_index(inplace=True)

        db_name = os.path.join(dirname, "deeplynx", "duckdbs", "general.duckdb")

        if "_th" in path:
            db_name = os.path.join(dirname, "deeplynx", "duckdbs", "th.duckdb")
        elif "_acc" in path:
            db_name = os.path.join(dirname, "deeplynx", "duckdbs", "acc.duckdb")
        elif "_eh" in path:
            db_name = os.path.join(dirname, "deeplynx", "duckdbs", "eh.duckdb")

        with duckdb.connect(db_name) as conn:
            conn.sql(
                "CREATE OR REPLACE TABLE data AS SELECT epoch_ns(index), * EXCLUDE(index) FROM df"
            )
    return json.dumps([[]])
