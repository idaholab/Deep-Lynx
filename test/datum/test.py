from nptdms import TdmsFile
import duckdb


def tdms_test(incoming):
    file = TdmsFile.open(incoming.decode("utf8"))
    df = file.as_dataframe(time_index=True, absolute_time=True)
    df.reset_index(inplace=True)
    con = duckdb.connect("test_db.duckdb")

    con.sql(
        "CREATE TABLE my_table AS SELECT epoch_ns(index) as index, * EXCLUDE(index) FROM df LIMIT 100000"
    )


def duckdb_test():
    con = duckdb.connect(":memory:")
    con.sql("select * from duckdb_settings();")
