import csv
import json


def sample(path):
    # we have to first decode the raw bytes from erlang
    path = path.decode("utf8")
    data = []
    with open(path) as csvfile:
        reader = csv.reader(csvfile)
        for row in reader:
            data.append(row)

    return json.dumps({"sample": data})
