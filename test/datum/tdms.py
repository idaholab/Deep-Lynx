from nptdms import TdmsFile
import duckdb


def read(b):
    file = TdmsFile.open(b.decode("utf8"))
    df = file.as_dataframe(time_index=True, absolute_time=True)
    df.reset_index(inplace=True)
    con = duckdb.connect("file.db")

    con.sql("CREATE TABLE my_table AS SELECT epoch_ns(index), * EXCLUDE(index) FROM df")

    return True
