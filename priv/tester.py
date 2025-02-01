from nptdms import TdmsFile
import duckdb
import pandas as pd


def tdms_test(incoming):
    file = TdmsFile.open(incoming.decode("utf8"))
    df = file.as_dataframe(time_index=True, absolute_time=True)
    df.reset_index(inplace=True)

    new_columns = list(
        map(
            lambda c: c.split("/")[-1].replace(" ", "_").replace("'", "").lower(),
            df.columns[1:],
        )
    )

    df.columns = pd.Index([df.columns[0]] + new_columns)

    con = duckdb.connect("test_db.duckdb")

    con.sql("DROP TABLE IF EXISTS daq1")

    con.sql(
        "CREATE TABLE daq1 AS SELECT epoch_ns(index) as index, * EXCLUDE(index) FROM df LIMIT 100000"
    )


def duckdb_test():
    con = duckdb.connect(":memory:")
    con.sql("select * from duckdb_settings();")
