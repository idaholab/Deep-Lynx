// Types
import { NextRequest, NextResponse } from "next/server";

import axios from "axios";

const base = process.env.AIRFLOW_URL!;
const token = process.env.TOKEN!;

export const GET = async (req: NextRequest, res: NextResponse) => {
  const { searchParams } = new URL(req.url);

  const containerId = searchParams.get("containerId");
  const dataSourceId = searchParams.get("dataSourceId");
  const nodeId = searchParams.get("nodeId");
  const fileId = searchParams.get("fileId");
  const url = new URL(base);

  url.username = "admin";
  url.password = "admin";

  let response = await axios
    .post(`${url}`, {
      conf: {
        CONTAINER_ID: containerId,
        DATASOURCE_ID: dataSourceId,
        NODE_ID: nodeId,
        FILE_ID: fileId,
        API_KEY: process.env.API_KEY,
        API_SECRET: process.env.API_SECRET,
        ssh_conn_id: "pixyz_ssh",
        create_graph: true,
      },
    })
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      return error;
    });

  return NextResponse.json(response);
};
